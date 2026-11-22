import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireRole,territoryWhere } from '../auth.js';
import { effectiveForm } from './surveyCampaigns.js';
import { runtimeSettings } from './runtime.js';

export const fieldSurveys=Router();
const questions=()=>db.$queryRaw`SELECT definition || jsonb_build_object('id',id) AS question FROM "FieldQuestion" WHERE active ORDER BY position,id`.then(rows=>rows.map(r=>r.question));
const phoneSql = ['OutletPhone','Phone','Mobile'];
const wrap=handler=>async(req,res,next)=>{try{await handler(req,res)}catch(error){next(error)}};
const outlet=(employee,id)=>db.outlet.findFirst({where:{outletUid:id,...territoryWhere(employee)}});
const code=z.string().trim().min(1).max(120);
const matchesAsset=value=>({OR:[{assetCode:value},{qrCode:value}]});

fieldSurveys.get('/field-surveys/questions',wrap(async(_,res)=>res.json(await questions())));
fieldSurveys.get('/field-surveys/form',wrap(async(req,res)=>{
  const store=await outlet(req.employee,code.parse(req.query.store));
  if(!store)return res.sendStatus(404);
  res.set('Cache-Control','no-store').json(await effectiveForm(store));
}));
fieldSurveys.put('/field-surveys/questions',requireRole('ADMIN'),wrap(async(req,res)=>{
  const list=z.array(z.object({
    id:z.string().regex(/^[a-z][a-z0-9_-]{0,49}$/), label:z.string().trim().min(1).max(200),
    type:z.enum(['yesno','asset','multi','single','text']), when:z.string().optional(),
    required:z.boolean().default(false),options:z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  })).min(1).max(50).parse(req.body);
  const seen=new Map();
  let assetCount=0;
  for(const q of list){
    if(seen.has(q.id)||(q.when&&seen.get(q.when)!=='yesno')||
      (['multi','single'].includes(q.type)&&!q.options?.length)||(q.type==='asset'&&++assetCount>1)){
      return res.status(400).json({error:'Use unique IDs, earlier Yes/No dependencies, choices for choice questions, and at most one asset question.'});
    }
    seen.set(q.id,q.type);
  }
  await db.$transaction(async tx=>{
    await tx.$executeRaw`LOCK TABLE "FieldQuestion" IN SHARE ROW EXCLUSIVE MODE`;
    await tx.$executeRaw`UPDATE "FieldQuestion" SET active=false`;
    for(const [position,{id,...definition}] of list.entries()){
      await tx.$executeRaw`INSERT INTO "FieldQuestion"(id,position,active,definition)
        VALUES(${id},${position},true,${JSON.stringify(definition)}::jsonb)
        ON CONFLICT(id) DO UPDATE SET position=EXCLUDED.position,active=true,definition=EXCLUDED.definition`;
    }
  });
  res.json(list);
}));
fieldSurveys.get('/field-surveys/stores',wrap(async(req,res)=>{
  const q=code.parse(req.query.q);
  const after=code.optional().parse(req.query.after)??null;
  const scope=territoryWhere(req.employee).territoryId??null;
  const digits=q.replace(/\D/g,'');
  const rows=await db.$queryRaw`
    SELECT "outletUid","outletCodeRd","outletName",latitude,longitude FROM "Outlet"
    WHERE (${scope}::uuid IS NULL OR "territoryId"=${scope}::uuid)
    AND (${after}::text IS NULL OR "outletUid">${after}) AND
    (strpos(lower("outletUid"),lower(${q}))>0 OR strpos(lower("outletCodeRd"),lower(${q}))>0 OR
      strpos(lower("sourceFields"->>'OutletCode'),lower(${q}))>0 OR
      (length(${digits})>=3 AND EXISTS(SELECT 1 FROM jsonb_each_text("sourceFields") AS field(key,value)
      WHERE key=ANY(${phoneSql}::text[]) AND strpos(regexp_replace(value,'[^0-9]','','g'),${digits})>0)))
    ORDER BY "outletUid" LIMIT 10`;
  res.json(rows);
}));
async function verify(client, value,id) {
  const assets=await client.coolerAsset.findMany({where:matchesAsset(value),take:2,
    select:{assetCode:true,assignments:{where:{outletUid:id,endedAt:null},select:{id:true}}}});
  if(!assets.length)return 'missing';
  return assets.length===1&&assets[0].assignments.length?'validated':'wrong';
}
fieldSurveys.get('/field-surveys/asset',wrap(async(req,res)=>{
  const id=code.parse(req.query.store), value=code.parse(req.query.code);
  if(!await outlet(req.employee,id))return res.sendStatus(404);
  res.json({status:await verify(db,value,id)});
}));
fieldSurveys.get('/field-surveys/history',wrap(async(req,res)=>{
  const before=z.coerce.date().optional().parse(req.query.before)??new Date();
  const beforeId=z.string().uuid().optional().parse(req.query.beforeId)??null;
  res.json(await db.$queryRaw`SELECT v.id,v."visitedAt",o."outletName",v."outletUid",s.distance,s.answers
    FROM "FieldSurvey" s JOIN "Visit" v ON v.id=s.id JOIN "Outlet" o ON o."outletUid"=v."outletUid"
    WHERE v."employeeId"=${req.employee.id}::uuid AND
    (v."visitedAt"<${before} OR (v."visitedAt"=${before} AND v.id<${beforeId}::uuid))
    ORDER BY v."visitedAt" DESC,v.id DESC LIMIT 10`);
}));
const photo=z.string().min(8).max(900000).regex(/^[A-Za-z0-9+/]+={0,2}$/).transform(s=>Buffer.from(s,'base64'))
  .refine(bytes=>bytes[0]===255&&bytes[1]===216,'Expected JPEG');
const attachment=z.object({
  name:z.string().trim().min(1).max(150),
  mime:z.enum(['application/pdf','image/jpeg','image/png']),
  content:z.string().min(8).max(900000).regex(/^[A-Za-z0-9+/]+={0,2}$/).transform(s=>Buffer.from(s,'base64')),
}).refine(({mime,content})=>mime==='application/pdf'?content.subarray(0,5).toString()==='%PDF-':
  mime==='image/jpeg'?content[0]===255&&content[1]===216:content.subarray(0,8).toString('hex')==='89504e470d0a1a0a','File does not match its declared type');
const payload=z.object({id:z.string().uuid(),store:code,latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),
  confirmed:z.boolean(),storePhoto:photo,assetPhoto:photo.optional(),tag:z.boolean(),answers:z.record(z.unknown()),
  formId:z.string().uuid().nullable().default(null),
  evidence:z.record(z.object({attachment:attachment.optional(),capture:photo.optional()})).default({})});
export function distanceMeters(lat,lon,x,y){
  const r=Math.PI/180;
  const h=Math.sin((x-lat)*r/2)**2+Math.cos(lat*r)*Math.cos(x*r)*Math.sin((y-lon)*r/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,h)));
}
fieldSurveys.post('/field-surveys',wrap(async(req,res)=>{
  const p=payload.parse(req.body);
  const store=await outlet(req.employee,p.store);
  if(!store)return res.sendStatus(404);
  const prior=await db.$queryRaw`SELECT v.id FROM "FieldSurvey" s JOIN "Visit" v ON v.id=s.id
    WHERE v.id=${p.id}::uuid AND v."employeeId"=${req.employee.id}::uuid AND v."outletUid"=${p.store}`;
  if(prior.length)return res.json({id:p.id});
  const distance=store.latitude==null||store.longitude==null?null:distanceMeters(p.latitude,p.longitude,store.latitude,store.longitude);
  if((distance==null||distance>(await runtimeSettings()).surveyRadiusMeters)&&!p.confirmed)return res.status(409).json({error:'Confirm the store location before submitting.'});
  const answers={};
  const current=await effectiveForm(store);
  if(current.id!==p.formId)return res.status(409).json({error:'The published questionnaire changed. Refresh the form and review your answers.'});
  const form=current.questions;
  const files=[];
  for(const q of form){
    if(q.when&&answers[q.when]?.value!==true)continue;
    if(q.type==='description')continue;
    const evidence=p.evidence[q.id];
    for(const kind of ['attachment','capture']){
      if(q[kind]==='required'&&!evidence?.[kind])return res.status(400).json({error:(kind==='capture'?'Capture an image: ':'Attach a file: ')+q.label});
      if(q[kind]&&q[kind]!=='none'&&evidence?.[kind]){
        const file=kind==='capture'?{name:'capture.jpg',mime:'image/jpeg',content:evidence.capture}:evidence.attachment;
        files.push({id:q.id,kind,...file});
      }
    }
    const value=p.answers[q.id];
    if(value==null&&!q.required)continue;
    const valid={yesno:()=>typeof value==='boolean',multi:()=>Array.isArray(value)&&value.length>0&&value.every(v=>q.options?.includes(v)),
      single:()=>q.options?.includes(value),text:()=>typeof value==='string'&&value.trim().length>0&&value.length<=2000,
      number:()=>typeof value==='number'&&Number.isFinite(value),
      asset:()=>code.safeParse(value).success&&!!p.assetPhoto};
    if(!valid[q.type]?.())return res.status(400).json({error:'Complete: '+q.label});
    answers[q.id]={label:q.label,value};
  }
  const assetQuestion=form.find(q=>q.type==='asset'&&answers[q.id]);
  const saved=await db.$transaction(async(tx)=>{
    const rows=await tx.$queryRaw`INSERT INTO "Visit"(id,"outletUid","employeeId",latitude,longitude,note)
      VALUES(${p.id}::uuid,${p.store},${req.employee.id}::uuid,${p.latitude},${p.longitude},'Field survey')
      ON CONFLICT DO NOTHING RETURNING id`;
    if(!rows.length){
      const existing=await tx.$queryRaw`SELECT v.id FROM "Visit" v JOIN "FieldSurvey" s ON s.id=v.id
        WHERE v.id=${p.id}::uuid AND v."employeeId"=${req.employee.id}::uuid AND v."outletUid"=${p.store}`;
      return existing.length?{id:p.id}:null;
    }
    if(assetQuestion){
      const value=p.answers[assetQuestion.id].trim();
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${value}))) AS lock_asset`;
      let status=await verify(tx,value,p.store);
      if(p.tag&&status==='missing'){
        await tx.coolerAsset.create({data:{assetCode:value,qrCode:value,recordType:'Field survey',sourceFields:{surveyId:p.id},
          assignments:{create:{outletUid:p.store,assignedAt:new Date()}}}});
        status='validated';
      }
      answers[assetQuestion.id].status=status;
    }
    await tx.$executeRaw`INSERT INTO "FieldSurvey"(id,answers,"storePhoto","assetPhoto",distance,"campaignId")
      VALUES(${p.id}::uuid,${JSON.stringify(answers)}::jsonb,${p.storePhoto}::bytea,${assetQuestion?p.assetPhoto:null}::bytea,${distance},${current.id}::uuid)`;
    for(const file of files)await tx.$executeRaw`INSERT INTO "FieldEvidence"("surveyId","questionId",kind,"fileName",mime,content)
      VALUES(${p.id}::uuid,${file.id},${file.kind},${file.name},${file.mime},${file.content}::bytea)`;
    return {id:p.id};
  });
  if(!saved)return res.sendStatus(409);
  res.status(201).json(saved);
}));
