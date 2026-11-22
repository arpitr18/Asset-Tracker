import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { territoryWhere } from '../auth.js';
export const surveys = Router();
const body = z.object({ idempotencyKey: z.string().uuid(), outletUid: z.string().min(1), assetCode: z.string().min(1), condition: z.enum(['GOOD','NEEDS_SERVICE','DAMAGED']), observations: z.string().max(2000).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() });
surveys.post('/surveys', async (req, res, next) => { try {
  const p = body.parse(req.body);
  const existing = await db.survey.findUnique({ where: { idempotencyKey: p.idempotencyKey } });
  if (existing) return res.json(existing);
  const outlet = await db.outlet.findFirst({ where: { outletUid: p.outletUid, ...territoryWhere(req.employee), assets: { some: { assetCode: p.assetCode, endedAt: null } } } });
  if (!outlet) return res.status(404).json({ error: 'Outlet or assigned asset not found' });
  const result = await db.$transaction(async tx => {
    const visit = await tx.visit.create({ data: { outletUid: p.outletUid, employeeId: req.employee.id, latitude: p.latitude, longitude: p.longitude } });
    return tx.survey.create({ data: { idempotencyKey: p.idempotencyKey, outletUid: p.outletUid, employeeId: req.employee.id, visitId: visit.id, condition: p.condition, observations: p.observations, inspections: { create: { assetCode: p.assetCode, condition: p.condition } } } });
  });
  res.status(201).json(result);
} catch (e) { if (e.code === 'P2002') return res.status(409).json({ error: 'Duplicate request' }); next(e); } });
surveys.get('/stores/:id/surveys', async (req, res, next) => { try {
  const outlet = await db.outlet.findFirst({ where: { outletUid: req.params.id, ...territoryWhere(req.employee) }, select: { outletUid: true } });
  if (!outlet) return res.status(404).json({ error: 'Store not found' });
  res.json(await db.survey.findMany({ where: { outletUid: req.params.id }, orderBy: { createdAt: 'desc' }, take: 30, include: { inspections: true } }));
} catch (e) { next(e); } });
