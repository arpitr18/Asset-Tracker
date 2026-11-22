import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db} from '../db.js';

const key=z.string().regex(/^[a-z][a-z0-9_-]{0,49}$/);
const question=z.object({
  id:key,label:z.string().trim().min(1).max(200),description:z.string().trim().max(1000).optional(),
  type:z.enum(['yesno','asset','multi','single','text','description','number']),
  when:key.optional(),required:z.boolean().default(false),
  options:z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  attachment:z.enum(['none','optional','required']).default('none'),
  capture:z.enum(['none','optional','required']).default('none'),
});
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
},'Use a valid calendar date').nullable();
const campaign=z.object({
  title:z.string().trim().min(1).max(120), startDate:date, endDate:date,
  regions:z.array(z.string().trim().min(1).max(120)).max(100),
  stores:z.array(z.string().trim().min(1).max(120)).max(2000),
  questions:z.array(question).min(1).max(50),
}).superRefine((value,ctx)=>{
  const issue=message=>ctx.addIssue({code:'custom',message});
  if(value.startDate&&value.endDate&&value.startDate>value.endDate)issue('End date must follow the start date.');
  const seen=new Map();
  let assetCount=0;
  for(const q of value.questions){
    if(seen.has(q.id))issue('Question IDs must be unique.');
    if(q.when&&seen.get(q.when)!=='yesno')issue('A condition must refer to an earlier Yes/No question.');
    if(['single','multi'].includes(q.type)&&new Set(q.options).size<2)issue('Choice questions need at least two distinct options.');
    if(q.type==='asset'&&++assetCount>1)issue('Only one barcode question is supported.');
    if(q.type==='description'&&(q.required||q.attachment!=='none'||q.capture!=='none'))issue('Description blocks cannot collect answers or evidence.');
    seen.set(q.id,q.type);
  }
});
export async function defaultQuestions(){
  const rows=await db.$queryRaw`SELECT definition || jsonb_build_object('id',id) AS question FROM "FieldQuestion" WHERE active ORDER BY position,id`;
  return rows.map(row=>row.question);
}

// Matching campaigns take priority by outlet specificity, then region, then publish time.
export async function effectiveForm(store){
  if(store){
    const [row]=await db.$queryRaw`SELECT c.id,c.title,c.questions FROM "SurveyCampaign" c
      JOIN "Territory" t ON t.id=${store.territoryId}::uuid
      WHERE c.status='published'
      AND (c."startDate" IS NULL OR c."startDate"<=(now() AT TIME ZONE 'Asia/Kolkata')::date)
      AND (c."endDate" IS NULL OR c."endDate">=(now() AT TIME ZONE 'Asia/Kolkata')::date)
      AND (cardinality(c.stores)=0 OR ${store.outletUid}=ANY(c.stores))
      AND (cardinality(c.regions)=0 OR t."regionName"=ANY(c.regions))
      ORDER BY (cardinality(c.stores)>0) DESC,(cardinality(c.regions)>0) DESC,c."publishedAt" DESC,c.id DESC LIMIT 1`;
    if(row)return row;
  }
  return {id:null,title:'Store survey',questions:await defaultQuestions()};
}

export function registerCampaigns(router,wrap,audit){
  router.get('/campaigns',wrap(async(req,res)=>{
    const page=z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
    const rows=await db.$queryRaw`SELECT id,title,status,"startDate"::text,"endDate"::text,regions,stores,questions,"updatedAt",count(*) OVER ()::int AS total
      FROM "SurveyCampaign" ORDER BY "updatedAt" DESC,id DESC LIMIT 11 OFFSET ${(page-1)*10}`;
    res.json({items:rows.slice(0,10),total:rows[0]?.total??0,hasMore:rows.length>10});
  }));
  router.get('/campaigns/outlets',wrap(async(req,res)=>{
    const {q,page}=z.object({q:z.string().trim().max(120).default(''),page:z.coerce.number().int().min(1).max(10000).default(1)}).parse(req.query);
    const digits=q.replace(/\D/g,'');
    const phone=/^[+\d\s().-]+$/.test(q)&&digits.length>=3?digits:null;
    const rows=await db.$queryRaw`SELECT "outletUid" AS id,"outletName" AS name,"outletCodeRd" AS code,count(*) OVER ()::int AS total FROM "Outlet"
      WHERE ${q}='' OR strpos(lower("outletUid"),lower(${q}))>0 OR strpos(lower("outletCodeRd"),lower(${q}))>0
      OR strpos(lower("outletName"),lower(${q}))>0 OR strpos(lower("sourceFields"->>'OutletCode'),lower(${q}))>0
      OR (${phone}::text IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_each_text("sourceFields") f(key,value)
        WHERE key IN ('OutletPhone','Phone','Mobile') AND strpos(regexp_replace(value,'[^0-9]','','g'),${phone})>0))
      ORDER BY "outletUid" LIMIT 11 OFFSET ${(page-1)*10}`;
    res.json({items:rows.slice(0,10),total:rows[0]?.total??0,hasMore:rows.length>10});
  }));
  router.get('/campaigns/defaults',wrap(async(_req,res)=>{
    const regions=await db.territory.findMany({distinct:['regionName'],select:{regionName:true},orderBy:{regionName:'asc'}});
    res.json({questions:await defaultQuestions(),regions:regions.map(r=>r.regionName)});
  }));
  router.post('/campaigns',wrap(async(req,res)=>{
    const p=campaign.parse(req.body), id=randomUUID();
    await db.$transaction(async tx=>{
      await tx.$executeRaw`INSERT INTO "SurveyCampaign"(id,title,"startDate","endDate",regions,stores,questions)
        VALUES(${id}::uuid,${p.title},${p.startDate}::date,${p.endDate}::date,${p.regions}::text[],${p.stores}::text[],${JSON.stringify(p.questions)}::jsonb)`;
      await audit(tx,req,'Survey draft created','SurveyCampaign',id,p.title);
    });
    res.status(201).json({id});
  }));
  router.put('/campaigns/:id',wrap(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),p=campaign.parse(req.body);
    await db.$transaction(async tx=>{
      const count=await tx.$executeRaw`UPDATE "SurveyCampaign" SET title=${p.title},"startDate"=${p.startDate}::date,
        "endDate"=${p.endDate}::date,regions=${p.regions}::text[],stores=${p.stores}::text[],
        questions=${JSON.stringify(p.questions)}::jsonb,"updatedAt"=now() WHERE id=${id}::uuid AND status='draft'`;
      if(!count)throw Object.assign(new Error('Only drafts can be edited. Duplicate a published survey to revise it.'),{status:409});
      await audit(tx,req,'Survey draft saved','SurveyCampaign',id,p.title);
    });
    res.sendStatus(204);
  }));
  router.post('/campaigns/:id/:action',wrap(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);
    const publish=z.enum(['publish','archive']).parse(req.params.action)==='publish';
    await db.$transaction(async tx=>{
      const [row]=await tx.$queryRaw`SELECT * FROM "SurveyCampaign" WHERE id=${id}::uuid FOR UPDATE`;
      if(!row||row.status!==(publish?'draft':'published'))throw Object.assign(new Error('Invalid survey status for this action.'),{status:409});
      if(publish){
        const [stores,regions]=await Promise.all([
          tx.outlet.count({where:{outletUid:{in:row.stores}}}),
          tx.territory.findMany({distinct:['regionName'],where:{regionName:{in:row.regions}},select:{regionName:true}}),
        ]);
        if(stores!==new Set(row.stores).size||regions.length!==new Set(row.regions).size)
          throw Object.assign(new Error('Check that every targeted store ID and region exists.'),{status:400});
      }
      await tx.$executeRaw`UPDATE "SurveyCampaign" SET status=${publish?'published':'archived'},
        "publishedAt"=CASE WHEN ${publish} THEN now() ELSE "publishedAt" END,"updatedAt"=now() WHERE id=${id}::uuid`;
      await audit(tx,req,publish?'Survey published':'Survey archived','SurveyCampaign',id,row.title);
    });
    res.sendStatus(204);
  }));
}
