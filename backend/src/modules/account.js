import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { hashPassword, verifyPassword } from '../password.js';

export const account = Router();

account.post('/me/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1).max(256),
      newPassword: z.string().min(8).max(128),
    }).parse(req.body);
    const id = req.employee.id;
    const { passwordHash } = await db.employee.findUniqueOrThrow({
      where: { id }, select: { passwordHash: true },
    });
    if (!await verifyPassword(currentPassword, passwordHash)) {
      return res.status(403).json({ error: 'Current password is incorrect.' });
    }
    const result = await db.employee.updateMany({
      where: { id, passwordHash },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    if (!result.count) return res.status(409).json({ error: 'Password changed during this request. Try again.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

account.get('/me/export', async (req, res, next) => {
  try {
    const where = { employeeId: req.employee.id };
    const [visits, surveys] = await db.$transaction([
      db.visit.findMany({ where, orderBy: { visitedAt: 'desc' } }),
      db.survey.findMany({ where, orderBy: { createdAt: 'desc' }, include: { inspections: true } }),
    ]);
    res.set('Cache-Control', 'no-store').json({
      exportedAt: new Date(), employee: req.employee, visits, surveys,
    });
  } catch (error) { next(error); }
});
