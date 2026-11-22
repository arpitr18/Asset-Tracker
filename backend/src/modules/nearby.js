import { Prisma } from '@prisma/client';
import { db } from '../db.js';
import { territoryWhere } from '../auth.js';

// Sort the complete set inside the radius before selecting a page.
export async function nearbyPage(p, employee, withinRadius = true) {
  const radius=p.radiusKm??5;
  const latitudeRange=radius/110;
  const filters = withinRadius ? [Prisma.sql`o.latitude BETWEEN ${p.lat-latitudeRange} AND ${p.lat+latitudeRange}`,
    Prisma.sql`o.longitude IS NOT NULL`] : [Prisma.sql`TRUE`];
  const scope = territoryWhere(employee);
  if (scope.territoryId) filters.push(Prisma.sql`o."territoryId" = ${scope.territoryId}::uuid`);
  if (p.q) {
    const digits = p.q.replace(/\D/g, '');
    const phone = /^\+?[\d\s().-]+$/.test(p.q) && digits.length >= 3
      ? Prisma.sql`OR EXISTS (SELECT 1 FROM jsonb_each_text(o."sourceFields") f(key,value)
        WHERE key IN ('OutletPhone','Phone','Mobile') AND strpos(regexp_replace(value,'[^0-9]','','g'),${digits})>0)`
      : Prisma.empty;
    filters.push(Prisma.sql`(strpos(lower(o."outletName"),lower(${p.q}))>0 OR
      strpos(lower(o."outletCodeRd"),lower(${p.q}))>0 OR strpos(lower(o."outletUid"),lower(${p.q}))>0
      OR strpos(lower(o."sourceFields"->>'OutletCode'),lower(${p.q}))>0 ${phone})`);
  }
  if (p.branch) filters.push(Prisma.sql`t."branchName"=${p.branch}`);
  if (p.region) filters.push(Prisma.sql`t."regionName"=${p.region}`);
  if (p.area) filters.push(Prisma.sql`t."asmArea"=${p.area}`);
  if (p.territory) filters.push(Prisma.sql`t."soTerritory"=${p.territory}`);
  const after = p.cursor ? Prisma.sql`AND (km,id)>(SELECT km,id FROM distances WHERE id=${p.cursor})` : Prisma.empty;
  const distance = withinRadius ? Prisma.sql`12742 * asin(sqrt(least(1.0,
        power(sin(radians(o.latitude-${p.lat})/2),2)
        + cos(radians(${p.lat}::float8))*cos(radians(o.latitude))
        * power(sin(radians(o.longitude-${p.lon})/2),2))))` : Prisma.sql`0`;
  return db.$queryRaw`
    WITH distances AS (
      SELECT o."outletUid" AS id, ${distance} AS km
      FROM "Outlet" o JOIN "Territory" t ON t.id=o."territoryId"
      WHERE ${Prisma.join(filters,' AND ')}
    ) SELECT id,km FROM distances WHERE km<=${radius} ${after}
      ORDER BY km,id LIMIT ${p.limit+1}`;
}
