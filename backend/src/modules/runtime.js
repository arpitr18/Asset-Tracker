import {z} from 'zod';
import {db} from '../db.js';

export const settingsSchema=z.object({
  dateFormat:z.enum(['DD MMM YYYY','DD/MM/YYYY','YYYY-MM-DD','MM/DD/YYYY']),
  surveyRadiusMeters:z.number().int().min(25).max(1000),
  nearbyRadiusKm:z.number().int().min(1).max(50),
});

export const defaultSettings = Object.freeze({
  dateFormat: 'DD MMM YYYY',
  surveyRadiusMeters: 100,
  nearbyRadiusKm: 5,
});

export async function runtimeSettings(){
  const [row]=await db.$queryRaw`SELECT value FROM "TrackerSetting" WHERE id=1`;
  return row?.value ?? defaultSettings;
}
export async function mobileSettings(){
  const [row]=await db.$queryRaw`SELECT
    (SELECT value FROM "TrackerSetting" WHERE id=1) AS value,
    (SELECT id FROM "AuditLog"
      WHERE entity IN ('Employee','stores','store-sales','stockists','rd-sales','assets')
      ORDER BY "createdAt" DESC,id DESC LIMIT 1) AS revision`;
  return {...(row.value ?? defaultSettings),revision:row.revision};
}
