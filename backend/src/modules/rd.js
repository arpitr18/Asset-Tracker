import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { territoryWhere } from '../auth.js';
import { Prisma } from '@prisma/client';
import { months } from './masterWorkbooks.js';
export const rd = Router();
rd.get('/distributors', async (req, res, next) => { try {
  const { q } = z.object({ q: z.string().max(100).default('') }).parse(req.query);
  const rows = await db.distributor.findMany({ where: { OR: [{ rdCode: { contains: q, mode: 'insensitive' } }, { rdName: { contains: q, mode: 'insensitive' } }, { rdTown: { contains: q, mode: 'insensitive' } }], outlets: { some: territoryWhere(req.employee) } }, take: 30, orderBy: { rdName: 'asc' }, select: { rdCode: true, rdName: true, rdTown: true, latitude: true, longitude: true, gpsVerified: true, _count: { select: { outlets: true } } } });
  res.json(rows);
} catch (e) { next(e); } });

rd.get('/rd-directory/options', async (req,res,next)=>{
  try {
    const states=await db.$queryRaw`SELECT name FROM "IndianState" ORDER BY name`;
    const scope=territoryWhere(req.employee).territoryId??null;
    const rows=await db.$queryRaw`SELECT DISTINCT lower(coalesce(m."BranchName",p.branch)) AS branch,
      m."RegionName" AS region,p.bsm FROM "Distributor" d
      LEFT JOIN "RD_Master" m ON m."RDCode"=d."rdCode" LEFT JOIN "RDProfile" p USING ("rdCode")
      WHERE ${scope}::uuid IS NULL OR EXISTS(SELECT 1 FROM "Outlet" o WHERE o."rdCode"=d."rdCode" AND o."territoryId"=${scope}::uuid)`;
    const branches=['North','South','East','West'];
    const geography=Object.fromEntries(branches.map(branch=>{
      const matches=rows.filter(row=>row.branch===branch.toLowerCase());
      return [branch,{regions:[...new Set(matches.map(row=>row.region).filter(Boolean))].sort(),
        bsm:[...new Set(matches.map(row=>row.bsm).filter(Boolean))].sort()}];
    }));
    res.json({states:states.map(row=>row.name),branches,geography});
  } catch(error){next(error);}
});

async function directory(employee,{branch=null,bsm=null,region=null,state=null,code=null,after=null}){
  const scope=territoryWhere(employee).territoryId??null;
  return db.$queryRaw`
    SELECT d."rdCode",coalesce(m."ContactPerson",d."rdName") AS "rdName",d."rdTown",d.state,
      coalesce(m."BranchName",p.branch) AS branch,p.bsm,coalesce(m."RDType",p.type) AS type,
      coalesce(m."CellNo",m."Phone",p.phone) AS phone,coalesce(m."Address",p.address) AS address,
      coalesce(nullif(p.firm,''),m."RDName") AS firm,p.synthetic,m."RegionName" AS region
    FROM "Distributor" d LEFT JOIN "RDProfile" p USING ("rdCode") LEFT JOIN "RD_Master" m ON m."RDCode"=d."rdCode"
    WHERE (${scope}::uuid IS NULL OR EXISTS(SELECT 1 FROM "Outlet" o WHERE o."rdCode"=d."rdCode" AND o."territoryId"=${scope}::uuid))
      AND (${branch}::text IS NULL OR lower(coalesce(m."BranchName",p.branch))=lower(${branch}))
      AND (${bsm}::text IS NULL OR p.bsm=${bsm})
      AND (${region}::text IS NULL OR m."RegionName"=${region})
      AND (${state}::text IS NULL OR lower(d.state)=lower(${state}))
      AND (${code}::text IS NULL OR d."rdCode"=${code})
      AND (${after}::text IS NULL OR (NOT coalesce(p.synthetic,false),d."rdCode") >
        (NOT EXISTS(SELECT 1 FROM "RDProfile" cursor_profile WHERE cursor_profile."rdCode"=${after} AND cursor_profile.synthetic),${after}))
    ORDER BY NOT coalesce(p.synthetic,false),d."rdCode" LIMIT 11`;
}
rd.get('/rd-directory',async(req,res,next)=>{
  try {
    const filters=z.object({branch:z.enum(['North','South','East','West']).optional(),bsm:z.enum(['A','B']).optional(),
      region:z.string().max(100).optional(),state:z.string().max(100).optional(),after:z.string().max(100).optional()}).parse(req.query);
    const rows=await directory(req.employee,filters);
    res.json({items:rows.slice(0,10),next:rows.length>10?rows[9].rdCode:null});
  }catch(error){next(error);}
});
async function salesFor(code){
    const monthValues=months.map((field,index)=>Prisma.sql`(s."SalesYear"-${index<12?1:0},${index%12+1},${index>=12},${Prisma.raw('s."'+field+'"')})`);
    let sales=await db.$queryRaw`WITH totals AS (
      SELECT make_date(v.year::integer,v.month::integer,1) AS period,v.current_year,sum(v.amount) AS amount
      FROM "RD_Sales" s CROSS JOIN LATERAL (VALUES ${Prisma.join(monthValues)}) v(year,month,current_year,amount)
      WHERE s."RDCode"=${code} AND v.amount IS NOT NULL GROUP BY 1,2
    ), preferred AS (SELECT DISTINCT ON(period) period,amount FROM totals ORDER BY period,current_year DESC)
    SELECT period,amount FROM preferred ORDER BY period DESC`;
    if(!sales.length)sales=await db.$queryRaw`SELECT period,amount FROM "RDSale" WHERE "rdCode"=${code} ORDER BY period DESC`;
    return sales;
}
rd.get('/rd-directory/:code/sales',async(req,res,next)=>{
  try {
    const [stockist]=await directory(req.employee,{code:req.params.code});
    if(!stockist)return res.status(404).json({error:'Stockist not found'});
    res.json(await salesFor(stockist.rdCode));
  }catch(error){next(error);}
});
rd.get('/rd-directory/:code',async(req,res,next)=>{
  try {
    const [stockist]=await directory(req.employee,{code:req.params.code});
    if(!stockist)return res.status(404).json({error:'Stockist not found'});
    const [master]=await db.$queryRaw`SELECT "RDName","RD_SST_SUBD","TownClassName","SOTerritory","ASMArea","RegionName","Email_Id",
      "ActiveFrom"::text,"ASMName","ASMContact","SEName","SEContact","PCCount","StoreCount","ContactPerson","CellNo","Phone"
      FROM "RD_Master" WHERE "RDCode"=${stockist.rdCode}`;
    res.json({...stockist,master:master??null,...(req.query.includeSales==='0'?{}:{sales:await salesFor(stockist.rdCode)})});
  }catch(error){next(error);}
});
rd.get('/distributors/:code/outlets', async (req, res, next) => { try {
  res.json(await db.outlet.findMany({ where: { rdCode: req.params.code, ...territoryWhere(req.employee) }, select: { outletUid: true, outletName: true, outletCodeRd: true }, take: 100 }));
} catch (e) { next(e); } });
