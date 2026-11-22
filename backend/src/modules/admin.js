import { Router } from 'express';
import { requireRole } from '../auth.js';
import { db } from '../db.js';
import { registerUsers } from './adminUsers.js';
import { registerCampaigns } from './surveyCampaigns.js';
import { registerExcel } from './adminExcel.js';
import { runtimeSettings, settingsSchema } from './runtime.js';
import { z } from 'zod';

export const admin=Router();
admin.use(requireRole('ADMIN'),(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
const wrap=handler=>async(req,res,next)=>{try {await handler(req,res);}catch(error){next(error);}};
const audit=(tx,req,action,entity,entityId,summary)=>tx.auditLog.create({
  data:{actorId:req.employee.id,action,entity,entityId,...(summary&&{details:{summary}})},
});
registerUsers(admin,wrap,audit);
registerCampaigns(admin,wrap,audit);
registerExcel(admin,wrap,audit);

admin.get('/assets',wrap(async(req,res)=>{
  const {q,after}=z.object({q:z.string().trim().max(120).default(''),after:z.string().max(500).optional()}).parse(req.query);
  const search={...(q&&{OR:['assetCode','qrCode','model','make'].map(field=>({
      [field]:{contains:q,mode:'insensitive'},
    }))})};
  const [items,total]=await Promise.all([db.coolerAsset.findMany({where:{...search,...(after&&{assetCode:{gt:after}})},
    orderBy:{assetCode:'asc'},take:11,
    select:{assetCode:true,model:true,make:true,qrCode:true,recordType:true,
      assignments:{where:{endedAt:null},select:{outlet:{select:{outletUid:true,outletName:true}}}}},
  }),db.coolerAsset.count({where:search})]);
  res.json({items:items.slice(0,10),total,next:items.length>10?items[9].assetCode:null});
}));

admin.get('/stats',wrap(async(_req,res)=>{
  const [totals]=await db.$queryRaw`SELECT
    (SELECT count(*)::int FROM "Employee" WHERE "deletedAt" IS NULL) AS users,
    (SELECT count(*)::int FROM "Outlet") AS stores,
    (SELECT count(*)::int FROM "Outlet" WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS mapped,
    (SELECT count(*)::int FROM "CoolerAsset") AS assets,
    (SELECT count(*)::int FROM "RD_Master") AS stockists,
    (SELECT count(*)::int FROM "FieldSurvey") AS surveys,
    (SELECT count(*)::int FROM "AdminImport" WHERE ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date=(now() AT TIME ZONE 'Asia/Kolkata')::date) AS imports`;
  const activity=await db.$queryRaw`SELECT a.id,a.action,a.entity,a.details,a."createdAt",e.name,count(*) OVER ()::int AS total
    FROM "AuditLog" a LEFT JOIN "Employee" e ON e.id::text=a."actorId" ORDER BY a."createdAt" DESC,a.id DESC LIMIT 10`;
  const roles=await db.$queryRaw`SELECT role,count(*)::int AS "_count" FROM "Employee" WHERE "deletedAt" IS NULL GROUP BY role`;
  const daily=await db.$queryRaw`SELECT d.day::text AS day,count(v.id)::int AS count
    FROM generate_series((now() AT TIME ZONE 'Asia/Kolkata')::date-13,(now() AT TIME ZONE 'Asia/Kolkata')::date,interval '1 day') d(day)
    LEFT JOIN ("Visit" v JOIN "FieldSurvey" f ON v.id=f.id)
      ON ((v."visitedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date=d.day::date
    GROUP BY d.day ORDER BY d.day`;
  const health=await db.$queryRaw`SELECT i.condition,count(*)::int AS count FROM (
    SELECT DISTINCT ON ("assetCode") "assetCode",condition FROM "Inspection" ORDER BY "assetCode","verifiedAt" DESC,id DESC
  ) i GROUP BY i.condition`;
  res.json({totals,activity,roles,daily,health});
}));
admin.get('/audit',wrap(async(req,res)=>{
  const page=z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
  const rows=await db.$queryRaw`SELECT a.id,a.action,a.entity,a.details,a."createdAt",e.name,count(*) OVER ()::int AS total
    FROM "AuditLog" a LEFT JOIN "Employee" e ON e.id::text=a."actorId" ORDER BY a."createdAt" DESC,a.id DESC LIMIT 11 OFFSET ${(page-1)*10}`;
  res.json({items:rows.slice(0,10),total:rows[0]?.total??0,hasMore:rows.length>10});
}));
admin.get('/settings',wrap(async(_req,res)=>res.json(await runtimeSettings())));
admin.put('/settings',wrap(async(req,res)=>{
  const config=settingsSchema.parse(req.body);
  await db.$transaction(async tx=>{
    await tx.$executeRaw`UPDATE "TrackerSetting" SET value=${JSON.stringify(config)}::jsonb WHERE id=1`;
    await audit(tx,req,'Runtime settings updated','TrackerSetting','1');
  });
  res.json(config);
}));
