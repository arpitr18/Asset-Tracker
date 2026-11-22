import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { territoryWhere } from '../auth.js';

export const activity = Router();
const path = '/stores/:outlet/activity';
activity.use(path, async (req,res,next) => {
  try {
    const store = await db.outlet.findFirst({where:{outletUid:req.params.outlet,...territoryWhere(req.employee)},select:{outletUid:true}});
    if (!store) return res.sendStatus(404);
    next();
  } catch(error){next(error);}
});

activity.get(path+'/visits', async(req,res,next)=>{
  try {
    const cursor = z.string().uuid().optional().parse(req.query.cursor);
    const rows = await db.$queryRaw`SELECT v.id,v."visitedAt",v.note,e.name AS employee,s.condition,s.observations
      FROM "Visit" v JOIN "Employee" e ON e.id=v."employeeId" LEFT JOIN "Survey" s ON s."visitId"=v.id
      WHERE v."outletUid"=${req.params.outlet} AND (${cursor??null}::uuid IS NULL OR
      (v."visitedAt",v.id)<(SELECT "visitedAt",id FROM "Visit" WHERE id=${cursor??null}::uuid AND "outletUid"=${req.params.outlet}))
      ORDER BY v."visitedAt" DESC,v.id DESC LIMIT 11`;
    res.json({items:rows.slice(0,10),nextCursor:rows.length>10?rows[9].id:null});
  } catch(error){next(error);}
});

activity.post(path+'/visits', async(req,res,next)=>{
  try {
    const {id,note}=z.object({id:z.string().uuid(),note:z.string().trim().min(1).max(2000)}).parse(req.body);
    const result=await db.$queryRaw`INSERT INTO "Visit"(id,"outletUid","employeeId",note)
      VALUES(${id}::uuid,${req.params.outlet},${req.employee.id}::uuid,${note})
      ON CONFLICT (id) DO UPDATE SET note="Visit".note WHERE "Visit"."employeeId"=EXCLUDED."employeeId"
      AND "Visit"."outletUid"=EXCLUDED."outletUid" AND "Visit".note=EXCLUDED.note RETURNING id`;
    if(!result.length)return res.sendStatus(409);
    res.status(201).json({id});
  }catch(error){next(error);}
});

const assetPath=path+'/assets/:code';
activity.use(assetPath,async(req,res,next)=>{
  try {
    const assignment=await db.assetAssignment.findFirst({where:{assetCode:req.params.code,outletUid:req.params.outlet,endedAt:null},select:{id:true}});
    if(!assignment)return res.sendStatus(404);
    req.assignmentId=assignment.id;
    next();
  }catch(error){next(error);}
});
activity.get(assetPath,async(req,res,next)=>{
  try {
    const [latest]=await db.$queryRaw`SELECT photo FROM "AssetReport" WHERE "assignmentId"=${req.assignmentId}::uuid AND photo IS NOT NULL ORDER BY "createdAt" DESC LIMIT 1`;
    const complaints=await db.$queryRaw`SELECT id,complaint,"createdAt" FROM "AssetReport" WHERE "assignmentId"=${req.assignmentId}::uuid AND complaint IS NOT NULL ORDER BY "createdAt" DESC LIMIT 5`;
    res.set('Cache-Control','no-store').json({photo:latest?'data:image/jpeg;base64,'+Buffer.from(latest.photo).toString('base64'):null,complaints});
  }catch(error){next(error);}
});
activity.post(assetPath,async(req,res,next)=>{
  try {
    const report=z.union([
      z.object({id:z.string().uuid(),complaint:z.string().trim().min(1).max(2000)}).strict(),
      z.object({id:z.string().uuid(),photo:z.string().min(8).max(900000).regex(/^[A-Za-z0-9+/]+=*$/)}).strict(),
    ]).parse(req.body);
    const bytes=report.photo?Buffer.from(report.photo,'base64'):null;
    if(bytes && bytes.readUInt16BE(0)!==0xffd8)return res.status(400).json({error:'Expected a JPEG photo.'});
    const rows=await db.$queryRaw`INSERT INTO "AssetReport"(id,"assignmentId","employeeId",complaint,photo)
      VALUES(${report.id}::uuid,${req.assignmentId}::uuid,${req.employee.id}::uuid,${report.complaint??null},${bytes}::bytea)
      ON CONFLICT(id) DO UPDATE SET id=EXCLUDED.id WHERE "AssetReport"."employeeId"=EXCLUDED."employeeId"
      AND "AssetReport"."assignmentId"=EXCLUDED."assignmentId" AND "AssetReport".complaint IS NOT DISTINCT FROM EXCLUDED.complaint
      AND "AssetReport".photo IS NOT DISTINCT FROM EXCLUDED.photo RETURNING id`;
    if(!rows.length)return res.sendStatus(409);
    res.status(201).json({id:report.id});
  }catch(error){next(error);}
});
