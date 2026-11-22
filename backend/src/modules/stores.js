import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { territoryWhere } from '../auth.js';
import { nearbyPage } from './nearby.js';
import { importedStoreSales, storeMasterFields } from './storeWorkbooks.js';

export const stores = Router();
const listQuery = z.object({ q: z.string().max(100).optional(), branch: z.string().optional(), region: z.string().optional(), area: z.string().optional(), territory: z.string().optional(), lat: z.coerce.number().min(-90).max(90).optional(), lon: z.coerce.number().min(-180).max(180).optional(), cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(5) });
const assetSelect = { assetCode: true, model: true, make: true, qrCode: true, modelVerified: true };
function summary(o) { return { outletUid: o.outletUid, outletCodeRd: o.outletCodeRd, outletName: o.outletName, state: o.state, beatName: o.beatName, latitude: o.latitude, longitude: o.longitude, recordType: o.recordType, territory: o.territory, distributor: o.distributor, assets: o.assets.map(a => ({ visiNo: a.visiNo, ...a.asset })) }; }

stores.get('/hierarchy', async (req, res, next) => { try {
  const rows = await db.territory.findMany({ where: req.employee.role === 'ADMIN' ? {} : { id: req.employee.territoryId || '00000000-0000-0000-0000-000000000000' }, select: { branchName: true, regionName: true, asmArea: true, soTerritory: true }, orderBy: [{ branchName: 'asc' }, { regionName: 'asc' }] });
  res.json(rows);
} catch (e) { next(e); } });

stores.get('/stores', async (req, res, next) => { try {
  const p = listQuery.parse(req.query);
  const withinRadius = req.query.radiusKm !== undefined;
  if (withinRadius || p.q) {
    const radiusKm=withinRadius?z.coerce.number().int().min(1).max(50).parse(req.query.radiusKm):undefined;
    if (withinRadius && (p.lat == null || p.lon == null))
      return res.status(400).json({error:'A nearby search requires latitude and longitude.'});
    const matches = await nearbyPage({...p,radiusKm},req.employee,withinRadius);
    const page = matches.slice(0,p.limit);
    const outlets = await db.outlet.findMany({
      where:{...territoryWhere(req.employee),outletUid:{in:page.map(row=>row.id)}},
      include:{territory:true,distributor:{select:{rdCode:true,rdName:true,rdTown:true}},assets:{where:{endedAt:null},include:{asset:{select:assetSelect}}}}
    });
    const byId = new Map(outlets.map(row=>[row.outletUid,summary(row)]));
    return res.json({items:page.filter(row=>byId.has(row.id)).map(row=>({...byId.get(row.id),...(withinRadius?{distanceKm:row.km}:{})})),
      nextCursor:matches.length>p.limit?page.at(-1).id:null});
  }
  const where = { ...territoryWhere(req.employee), ...(p.q ? { OR: [{ outletName: { contains: p.q, mode: 'insensitive' } }, { outletCodeRd: { contains: p.q, mode: 'insensitive' } }] } : {}), territory: { ...(p.branch ? { branchName: p.branch } : {}), ...(p.region ? { regionName: p.region } : {}), ...(p.area ? { asmArea: p.area } : {}), ...(p.territory ? { soTerritory: p.territory } : {}) } };
  const rows = await db.outlet.findMany({ where, take: p.limit + 1, ...(p.cursor ? { skip: 1, cursor: { outletUid: p.cursor } } : {}), orderBy: { outletUid: 'asc' }, include: { territory: true, distributor: { select: { rdCode: true, rdName: true, rdTown: true } }, assets: { where: { endedAt: null }, include: { asset: { select: assetSelect } } } } });
  const hasMore = rows.length > p.limit;
  res.json({ items: rows.slice(0, p.limit).map(summary), nextCursor: hasMore ? rows[p.limit - 1].outletUid : null });
} catch (e) { next(e); } });

stores.get('/stores/viewport', async (req, res, next) => { try {
  const p = z.object({ south: z.coerce.number().min(-90).max(90), north: z.coerce.number().min(-90).max(90), west: z.coerce.number().min(-180).max(180), east: z.coerce.number().min(-180).max(180) }).parse(req.query);
  if (p.south >= p.north || p.west >= p.east) return res.status(400).json({ error: 'Invalid viewport' });
  const territoryId = territoryWhere(req.employee).territoryId??null;
  const rows = await db.$queryRaw`SELECT o."outletUid", o."outletName", o."latitude", o."longitude", o."recordType" FROM "Outlet" o WHERE o."latitude" BETWEEN ${p.south} AND ${p.north} AND o."longitude" BETWEEN ${p.west} AND ${p.east} AND (${territoryId}::uuid IS NULL OR o."territoryId" = ${territoryId}::uuid) ORDER BY o."outletUid" LIMIT 1000`;
  res.json(rows);
} catch (e) { next(e); } });

stores.get('/stores/:id', async (req, res, next) => { try {
  const o = await db.outlet.findFirst({ where: { outletUid: req.params.id, ...territoryWhere(req.employee) }, include: { territory: true, distributor: true, assets: { where:{endedAt:null}, include: { asset: true } }, visits: { orderBy: { visitedAt: 'desc' }, take: 1 }, _count:{select:{visits:true}}, sales: { orderBy: { period: 'desc' }, select:{period:true,amount:true} } } });
  if (!o) return res.status(404).json({ error: 'Store not found' });
  const phone = o.sourceFields?.OutletPhone ?? o.sourceFields?.Phone ?? o.sourceFields?.Mobile;
  const imported=await importedStoreSales(o.outletUid);
  const byPeriod=new Map(o.sales.map(row=>[row.period.toISOString().slice(0,7),row]));
  for(const row of imported.records)byPeriod.set(row.period.toISOString().slice(0,7),row);
  const sales=[...byPeriod.values()].sort((a,b)=>b.period-a.period);
  const master=Object.fromEntries(storeMasterFields.filter(key=>o.sourceFields?.[key]!=null).map(key=>[key,o.sourceFields[key]]));
  res.json({ ...summary(o), master, phone:phone==null?null:String(phone), visitCount:o._count.visits,
    visits:o.visits, sales, salesGrowth:imported.growth });
} catch (e) { next(e); } });
