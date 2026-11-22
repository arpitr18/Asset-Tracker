import { Prisma } from '@prisma/client';
import { db } from '../db.js';

const lengths={"RDCode":50,"RDName":255,"RDType":100,"RD_SST_SUBD":100,"Town":100,"StateName":100,"TownClassName":100,"SOTerritory":100,"ASMArea":100,"RegionName":100,"BranchName":100,"Address":500,"Phone":30,"ContactPerson":150,"CellNo":30,"Email_Id":255,"ASMName":150,"ASMContact":30,"SEName":150,"SEContact":30};
const rdFields=[...Object.keys(lengths),'ActiveFrom','PCCount','StoreCount'];
export const months=["LY_M1","LY_M2","LY_M3","LY_M4","LY_M5","LY_M6","LY_M7","LY_M8","LY_M9","LY_M10","LY_M11","LY_M12","CY_1","CY_2","CY_3","CY_4","CY_5","CY_6","CY_7","CY_8","CY_9","CY_10","CY_11","CY_12"];
const salesFields=['SalesID','RDCode','SalesYear',...months,'YTDGrowth','WSContri','RetailContri'];
export const extraColumns={
  stockists:[...rdFields,'BSM','Firm','Synthetic'],
  'rd-sales':salesFields,
  assets:['AssetCode','Visicooler','VisiMake','QRcode','Visi Model Verified','Visidate','PMdate','RecordType','OutletUID'],
};
export const keys={stockists:'RDCode','rd-sales':'SalesID',assets:'AssetCode'};
const aliases={RDTown:'Town',State:'StateName',Branch:'BranchName'};
export function normalizeHeader(header,kind){
  return header.map(value=>kind==='stockists'?aliases[String(value).trim()]??String(value).trim():String(value).trim());
}
function yearInIndia(){
  return Number(new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',year:'numeric'}).format(new Date()));
}
const validDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value);
  return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
};
const id64=value=>/^\d{1,19}$/.test(value||'')&&BigInt(value)>0n&&BigInt(value)<=9223372036854775807n;
const decimal=(value,whole)=>new RegExp('^[+-]?\\d{1,'+whole+'}(?:\\.\\d{1,2})?$').test(value);
export async function validateExtras(rows,kind){
  const errors=[], ids=new Set();
  const lookupField=kind==='assets'?'OutletUID':'RDCode';
  const refs=[...new Set(rows.map(({data})=>data[lookupField]).filter(Boolean))];
  const matches=kind==='assets'
    ? (await db.outlet.findMany({where:{outletUid:{in:refs}},select:{outletUid:true}})).map(r=>r.outletUid)
    : kind==='rd-sales'?(await db.$queryRaw`SELECT "RDCode" FROM "RD_Master" WHERE "RDCode"=ANY(${refs}::text[])`).map(r=>r.RDCode):[];
  const known=new Set(matches);
  for(const {line,data:r} of rows){
    const fail=message=>errors.push({row:line,message});
    const rawId=r[keys[kind]];
    const id=kind==='rd-sales'&&id64(rawId)?BigInt(rawId).toString():rawId;
    if(!id||ids.has(id))fail('ID is missing or repeated.');
    ids.add(id);
    if(kind==='stockists'){
      for(const [key,max] of Object.entries(lengths))if((r[key]||'').length>max)fail(key+' exceeds '+max+' characters.');
      if(r.Email_Id&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.Email_Id))fail('Email_Id is not valid.');
      if(r.ActiveFrom&&!validDate(r.ActiveFrom))fail('ActiveFrom must use YYYY-MM-DD.');
      for(const key of ['PCCount','StoreCount'])if(r[key]&&(!/^\d+$/.test(r[key])||+r[key]>2147483647))fail(key+' must be a nonnegative integer.');
      if(r.BSM&&!['A','B'].includes(r.BSM))fail('BSM must be A or B.');
    }else if(kind==='rd-sales'){
      if(!id64(rawId))fail('SalesID must be a positive BIGINT. Use an Excel text cell for long IDs.');
      if(!r.RDCode||!known.has(r.RDCode))fail('RDCode is missing or unknown. Import RD Master first.');
      if(r.SalesYear&&(!/^\d{4}$/.test(r.SalesYear)||+r.SalesYear<1901))fail('SalesYear must be from 1901 to 9999.');
      for(const key of [...months,'YTDGrowth','WSContri','RetailContri'])if(r[key]&&!decimal(r[key],key.endsWith('Contri')?8:16))fail(key+' has invalid precision or scale.');
    }else{
      if(Object.values(r).some(value=>value.length>500))fail('A cell exceeds 500 characters.');
      if(r.OutletUID&&!known.has(r.OutletUID))fail('OutletUID does not exist.');
      for(const key of ['Visidate','PMdate'])if(r[key]&&!validDate(r[key]))fail(key+' must use YYYY-MM-DD.');
    }
  }
  return errors;
}

// Keys come only from the module's fixed column allowlists. Cell values are bound parameters.
async function upsert(tx,table,fields,key,data,cast={},preserve=[]){
  const fieldsUsed=fields.filter(field=>Object.hasOwn(data,field));
  const columns=fieldsUsed.map(field=>Prisma.raw('"'+field+'"'));
  const updates=fieldsUsed.filter(field=>field!==key&&!preserve.includes(field)).map(field=>Prisma.raw('"'+field+'"=EXCLUDED."'+field+'"'));
  const values=fieldsUsed.map(field=>Prisma.sql`${data[field]||null}${Prisma.raw(cast[field]?'::'+cast[field]:'')}`);
  await tx.$executeRaw`INSERT INTO ${Prisma.raw('"'+table+'"')} (${Prisma.join(columns)}) VALUES(${Prisma.join(values)})
    ON CONFLICT (${Prisma.raw('"'+key+'"')}) ${updates.length?Prisma.sql`DO UPDATE SET ${Prisma.join(updates)}`:Prisma.sql`DO NOTHING`}`;
}

export async function saveExtra(tx,kind,r){
  if(kind==='stockists'){
    const data={...('RDName'in r&&{rdName:r.RDName||r.RDCode}),...('Town'in r&&{rdTown:r.Town||null}),...('StateName'in r&&{state:r.StateName||null})};
    await tx.distributor.upsert({where:{rdCode:r.RDCode},create:{rdCode:r.RDCode,rdName:r.RDCode,...data},update:data});
    await upsert(tx,'RD_Master',rdFields,'RDCode',r,{ActiveFrom:'date',PCCount:'integer',StoreCount:'integer'});
    const profile=await tx.$queryRaw`SELECT branch,bsm,type,phone,address,firm,synthetic FROM "RDProfile" WHERE "rdCode"=${r.RDCode}`;
    const old=profile[0];
    const branch=r.BranchName||old?.branch;
    const type=r.RDType||old?.type;
    if(['North','South','East','West'].includes(branch)&&['TT','MT','SST','AFH'].includes(type)&&(r.BSM||old?.bsm)){
      await tx.$executeRaw`INSERT INTO "RDProfile"("rdCode",branch,bsm,type,phone,address,firm,synthetic)
        VALUES(${r.RDCode},${branch},${r.BSM||old?.bsm},${type},${r.Phone||old?.phone||null},${r.Address||old?.address||''},${r.Firm||old?.firm||''},
        ${r.Synthetic==null?old?.synthetic??false:/^(true|yes|1)$/i.test(r.Synthetic)})
        ON CONFLICT("rdCode") DO UPDATE SET branch=EXCLUDED.branch,bsm=EXCLUDED.bsm,type=EXCLUDED.type,
          phone=EXCLUDED.phone,address=EXCLUDED.address,firm=EXCLUDED.firm,synthetic=EXCLUDED.synthetic`;
    }
    return;
  }
  if(kind==='rd-sales'){
    const cast={SalesID:'bigint',SalesYear:'integer',...Object.fromEntries([...months,'YTDGrowth','WSContri','RetailContri'].map(field=>[field,'numeric']))};
    await upsert(tx,'RD_Sales',salesFields,'SalesID',{...r,SalesYear:r.SalesYear||String(yearInIndia())},cast,r.SalesYear?[]:['SalesYear']);
    return;
  }
  const mapping={Visicooler:'model',VisiMake:'make',QRcode:'qrCode','Visi Model Verified':'modelVerified',Visidate:'visiDate',PMdate:'pmDate'};
  const values=Object.fromEntries(Object.entries(mapping).filter(([from])=>from in r).map(([from,to])=>[to,r[from]?['Visidate','PMdate'].includes(from)?new Date(r[from]):r[from]:null]));
  if(r.RecordType)values.recordType=r.RecordType;
  await tx.coolerAsset.upsert({where:{assetCode:r.AssetCode},create:{assetCode:r.AssetCode,recordType:'Imported',sourceFields:{},...values},update:values});
  if(r.OutletUID){
    const active=await tx.assetAssignment.findMany({where:{assetCode:r.AssetCode,endedAt:null},select:{outletUid:true}});
    if(active.some(row=>row.outletUid!==r.OutletUID))throw Object.assign(new Error('Asset '+r.AssetCode+' is already assigned to another outlet.'),{status:409});
    if(!active.length)await tx.assetAssignment.create({data:{assetCode:r.AssetCode,outletUid:r.OutletUID,assignedAt:new Date()}});
  }
}
export function exportExtra(kind,pagination){
  if(kind==='assets')return db.$queryRaw`SELECT a."assetCode" AS "AssetCode",a.model AS "Visicooler",a.make AS "VisiMake",a."qrCode" AS "QRcode",
    a."modelVerified" AS "Visi Model Verified",a."visiDate"::date::text AS "Visidate",a."pmDate"::date::text AS "PMdate",
    a."recordType" AS "RecordType",(SELECT x."outletUid" FROM "AssetAssignment" x WHERE x."assetCode"=a."assetCode" AND x."endedAt" IS NULL
      ORDER BY x."assignedAt" DESC NULLS LAST,x.id LIMIT 1) AS "OutletUID" FROM "CoolerAsset" a ORDER BY a."assetCode" ${pagination}`;
  if(kind==='rd-sales'){
    const columns=salesFields.map(field=>Prisma.raw('"'+field+'"::text AS "'+field+'"'));
    return db.$queryRaw`SELECT ${Prisma.join(columns)} FROM "RD_Sales" ORDER BY "SalesID" ${pagination}`;
  }
  const select=rdFields.map(field=>Prisma.raw(field==='ActiveFrom'?'m."ActiveFrom"::text AS "ActiveFrom"':'m."'+field+'"'));
  return db.$queryRaw`SELECT ${Prisma.join(select)},p.bsm AS "BSM",p.firm AS "Firm",p.synthetic AS "Synthetic"
    FROM "RD_Master" m LEFT JOIN "RDProfile" p ON p."rdCode"=m."RDCode" ORDER BY m."RDCode" ${pagination}`;
}
