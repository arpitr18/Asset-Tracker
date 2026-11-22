import { db } from '../db.js';
import { Prisma } from '@prisma/client';

export const storeMasterFields=[
  'Year','BranchName','RegionName','ASMArea','SOTerritory','RdCode','RDName','TownClass','Town','RDTYPE',
  'OutletCode','OutletCodeRD','OutletName','ActiveFrom','Activeto','RE','Wholesale Type','Sub Stockist Type',
  'VisiCooler','visiDate','VisiCooler2','VisiDate2','PP','DatePP','Mature VC','CTU Type','CatMan',
  'Candy Gum Dispenser','Barrows Hotzone Unit','SMD','BeatName','PcCode','PcUID','PcName',
];
export const storeDates=['ActiveFrom','Activeto','visiDate','VisiDate2','DatePP'];
export const ly=Array.from({length:12},(_,i)=>'LY_M'+(i+1));
export const cm=Array.from({length:12},(_,i)=>'CM_'+(i+1));
export const growth='YTD Groth';
export const storeSalesFields=['OutletUID','Year',...ly,...cm,growth];

const aliases={Soterritory:'SOTerritory',RDCode:'RdCode',Visicooler:'VisiCooler',Visidate:'visiDate',
  ActiveTo:'Activeto','YTD Growth':growth,YTDGrowth:growth};
export function storeHeader(header){return header.map(key=>aliases[key]??key);}
const validYear=value=>/^\d{4}$/.test(value||'')&&+value>=1901;
const validDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value);
  return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
};

export async function resolveStores(rows,kind){
  const uids=[...new Set(rows.map(({data:r})=>r.OutletUID).filter(Boolean))];
  const codes=[...new Set(rows.flatMap(({data:r})=>[r.OutletCode,r.OutletCodeRD]).filter(Boolean))];
  const outlets=await db.$queryRaw`SELECT "outletUid","outletCodeRd","sourceFields"->>'OutletCode' AS code
    FROM "Outlet" WHERE "outletUid"=ANY(${[...uids,...codes]}::text[])
      OR "outletCodeRd"=ANY(${codes}::text[]) OR ("sourceFields"->>'OutletCode')=ANY(${codes}::text[])`;
  const byUid=new Map(outlets.map(row=>[row.outletUid,row]));
  const byCode=new Map();
  for(const row of outlets)for(const key of [row.outletUid,row.outletCodeRd,row.code].filter(Boolean)){
    if(!byCode.has(key))byCode.set(key,new Set());
    byCode.get(key).add(row.outletUid);
  }
  const errors=[],seen=new Set();
  for(const {line,data:r} of rows){
    const error=message=>errors.push({row:line,message});
    if(kind==='store-sales'){
      if(!r.OutletUID||!byUid.has(r.OutletUID))error('OutletUID does not exist. Import Store Master first.');
      if(!validYear(r.Year))error('Year is required and must be a four-digit calendar year.');
      const key=JSON.stringify([r.OutletUID,r.Year]);
      if(seen.has(key))error('This outlet and year appear more than once.');
      seen.add(key);
      if(![...ly,...cm].some(field=>r[field]))error('Enter at least one monthly amount.');
      for(const field of [...ly,...cm,growth]){
        if(r[field]&&!/^[+-]?\d{1,16}(?:\.\d{1,2})?$/.test(r[field]))error(field+' must be a number with at most two decimal places.');
      }
      continue;
    }
    const matches=new Set([r.OutletCode,r.OutletCodeRD].flatMap(code=>[...(byCode.get(code)??[])]));
    if(r.OutletUID){
      if([...matches].some(id=>id!==r.OutletUID))error('This outlet code is already linked to a different OutletUID.');
    }else{
      if(matches.size>1)error('Outlet codes match multiple stores. Provide an OutletUID and unique codes.');
      r.OutletUID=matches.values().next().value||r.OutletCodeRD||r.OutletCode;
    }
    if(!r.OutletUID||seen.has(r.OutletUID))error('Store identifier is missing or repeated.');
    seen.add(r.OutletUID);
    if(r.Year&&!validYear(r.Year))error('Year must be a four-digit calendar year.');
    for(const field of storeDates)if(r[field]&&!validDate(r[field]))error(field+' must use YYYY-MM-DD.');
    if(validDate(r.ActiveFrom)&&validDate(r.Activeto)&&r.ActiveFrom>r.Activeto)error('Activeto precedes ActiveFrom.');
  }
  return errors;
}
export async function saveStoreSales(tx,r){
  const values=fields=>Prisma.sql`ARRAY[${Prisma.join(fields.map(key=>Prisma.sql`${r[key]||null}::numeric`))}]`;
  await tx.$executeRaw`INSERT INTO "StoreSalesReport" ("outletUid",year,ly,cm,growth)
    VALUES(${r.OutletUID},${r.Year}::int,${values(ly)},${values(cm)},${r[growth]||null}::numeric)
    ON CONFLICT ("outletUid",year) DO UPDATE SET ly=EXCLUDED.ly,cm=EXCLUDED.cm,growth=EXCLUDED.growth`;
}

export async function storeSalesExport(pagination){
  const rows=await db.$queryRaw`SELECT "outletUid" AS "OutletUID",year AS "Year",ly::text[] AS ly,cm::text[] AS cm,
    growth::text AS growth FROM "StoreSalesReport" ORDER BY "outletUid",year DESC ${pagination}`;
  return rows.map(row=>({'OutletUID':row.OutletUID,Year:row.Year,
    ...Object.fromEntries(ly.map((key,index)=>[key,row.ly[index]])),
    ...Object.fromEntries(cm.map((key,index)=>[key,row.cm[index]])),[growth]:row.growth}));
}

export async function importedStoreSales(outletUid){
  const records=await db.$queryRaw`SELECT DISTINCT ON(period) period,amount FROM (
    SELECT make_date(r.year-v.lag_years,i.month,1) AS period,v.amount,v.lag_years
    FROM "StoreSalesReport" r CROSS JOIN generate_series(1,12) i(month)
    CROSS JOIN LATERAL (VALUES (0,r.cm[i.month]),(1,r.ly[i.month])) v(lag_years,amount)
    WHERE r."outletUid"=${outletUid} AND v.amount IS NOT NULL
  ) reported ORDER BY period DESC,lag_years ASC`;
  const growth=await db.$queryRaw`SELECT year,growth FROM "StoreSalesReport"
    WHERE "outletUid"=${outletUid} AND growth IS NOT NULL ORDER BY year DESC`;
  return {records,growth};
}
