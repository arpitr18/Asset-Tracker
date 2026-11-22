import {storeMasterFields,storeDates,storeSalesFields,storeHeader,resolveStores,saveStoreSales,storeSalesExport} from './storeWorkbooks.js';
import {randomUUID} from 'node:crypto';
import multer from 'multer';
import XLSX from 'xlsx';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {db} from '../db.js';
import {profile,scopedProfile,password} from './adminUsers.js';
import {hashPassword} from '../password.js';
import {extraColumns,exportExtra,keys,normalizeHeader,saveExtra,validateExtras} from './masterWorkbooks.js';

const columns={
  users:['Name','Email','JobTitle','Role','TerritoryID','InitialPassword'],
  stores:[...storeMasterFields,'OutletUID','State','Latitude','Longitude','OutletPhone','RecordType'],
  'store-sales':storeSalesFields,
  ...extraColumns,
  questions:['ID','Question','Description','Type','Options','ShowWhenYes','Required','Attachment','CaptureImage'],
};
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:3*1024*1024,files:1,fields:0}}).single('file');
const problem=(message,status=400)=>Object.assign(new Error(message),{status});

function read(file,kind) {
  if(!file||!/\.xlsx$/i.test(file.originalname))throw problem('Choose an .xlsx workbook.');
  let workbook;
  try {workbook=XLSX.read(file.buffer,{type:'buffer',sheetRows:1002,cellDates:true});}
  catch {throw problem('This workbook could not be read.');}
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  if(!sheet?.['!ref'])throw problem('The workbook is empty.');
  const [rawHeader,...rows]=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:'',blankrows:true});
  const normalized=normalizeHeader(rawHeader||[],kind);
  const header=kind==='stores'||kind==='store-sales'?storeHeader(normalized):normalized;
  if(!header.length||new Set(header).size!==header.length)throw problem('Missing or duplicate column headers.');
  const mandatory=kind==='users'?['Name','Email','Role']:kind==='stores'?['OutletName','BranchName','RegionName','ASMArea','SOTerritory']:kind==='store-sales'?['OutletUID','Year']:kind==='rd-sales'?['SalesID','RDCode']:keys[kind]?[keys[kind]]:['ID','Question','Type'];
  if(mandatory.some(key=>!header.includes(key)))throw problem('Use the matching template. Required columns: '+mandatory.join(', '));
  const origin=XLSX.utils.decode_range(sheet['!ref']).s;
  const mapped=columns[kind].filter(key=>header.includes(key)).map(key=>[key,header.indexOf(key)]);
  const numeric=/^(Latitude|Longitude|PCCount|StoreCount|SalesYear|Year|CM_\d+|YTD Groth|LY_M\d+|CY_\d+|YTDGrowth|WSContri|RetailContri)$/;
  const values=rows.map((cells,index)=>({line:origin.r+index+2,data:Object.fromEntries(mapped.map(([key,col])=>{
    const cell=sheet[XLSX.utils.encode_cell({r:origin.r+index+1,c:origin.c+col})];
    let value=cells[col]??'';
    if(cell?.v instanceof Date&&[...storeDates,'Visidate','PMdate'].includes(key))value=cell.v.toISOString().slice(0,10);
    if(cell?.t==='n'&&numeric.test(key))value=cell.v;
    if(cell?.t==='n'&&key==='SalesID')value=Number.isSafeInteger(cell.v)&&cell.v<1e15?cell.v:'';
    return [key,String(value).trim()];
  }))}))
    .filter(row=>Object.values(row.data).some(Boolean));
  if(!values.length||rows.length>1000)throw problem('A workbook must contain 1–1,000 data rows.');
  return values;
}

async function validate(rows,kind){
  if(kind==='users'){
    const emails=new Set(),errors=[];
    const existing=await db.employee.findMany({where:{email:{in:rows.map(({data})=>data.Email.toLowerCase())}},select:{email:true}});
    const reserved=new Set(existing.map(row=>row.email));
    const territories=new Set((await db.territory.findMany({select:{id:true}})).map(row=>row.id));
    for(const {line,data} of rows){
      const result=userRow.safeParse(userInput(data));
      if(!result.success){for(const issue of result.error.issues)errors.push({row:line,message:issue.path.join('.')+': '+issue.message});continue;}
      const {email,territoryId}=result.data;
      if(emails.has(email)||reserved.has(email))errors.push({row:line,message:'Email already exists or appears twice.'});
      if(territoryId&&!territories.has(territoryId))errors.push({row:line,message:'TerritoryID does not exist.'});
      emails.add(email);
    }
    return errors;
  }
  if(kind==='store-sales')return resolveStores(rows,kind);
  if(kind!=='stores')return validateExtras(rows,kind);
  const errors=await resolveStores(rows,kind);
  const codes=[...new Set(rows.map(({data})=>data.RdCode).filter(Boolean))];
  const known=new Set((await db.distributor.findMany({where:{rdCode:{in:codes}},select:{rdCode:true}})).map(r=>r.rdCode));
  for(const {line,data:r} of rows){
    const error=message=>errors.push({row:line,message});
    if(Object.values(r).some(v=>v.length>500))error('A cell exceeds 500 characters.');
    if(['OutletName','BranchName','RegionName','ASMArea','SOTerritory'].some(k=>!r[k]))error('Outlet name and all hierarchy fields are required.');
    const [lat,lon]=[r.Latitude,r.Longitude];
    if(Object.hasOwn(r,'Latitude')!==Object.hasOwn(r,'Longitude'))error('Include both coordinate columns or neither.');
    if(Boolean(lat)!==Boolean(lon)||lat&&(!Number.isFinite(+lat)||Math.abs(+lat)>90||!Number.isFinite(+lon)||Math.abs(+lon)>180))error('Latitude and longitude must be a valid pair.');
    if(r.RdCode&&!known.has(r.RdCode))error('RdCode does not exist. Import RD Master first.');
  }
  return errors;
}
const userRow=scopedProfile(profile.extend({initialPassword:password.default('Demo@@1234')}));
function userInput(row){
  const role=row.Role.toUpperCase();
  return {name:row.Name,email:row.Email,jobTitle:row.JobTitle||null,role,
    territoryId:role==='FIELD'?row.TerritoryID?.toLowerCase()||null:null,initialPassword:row.InitialPassword||undefined};
}

async function saveStore(tx,r,territories){
  const hierarchy={branchName:r.BranchName,regionName:r.RegionName,asmArea:r.ASMArea,soTerritory:r.SOTerritory};
  const key=JSON.stringify(hierarchy);
  if(!territories.has(key)){
    const territory=await tx.territory.upsert({where:{branchName_regionName_asmArea_soTerritory:hierarchy},create:hierarchy,update:{},select:{id:true}});
    territories.set(key,territory.id);
  }
  const current=await tx.outlet.findUnique({where:{outletUid:r.OutletUID},select:{sourceFields:true,latitude:true,longitude:true}});
  const latitude=r.Latitude?Number(r.Latitude):null,longitude=r.Longitude?Number(r.Longitude):null;
  const coordinatesChanged=Object.hasOwn(r,'Latitude')&&(latitude!==current?.latitude||longitude!==current?.longitude);
  const data={outletName:r.OutletName,...(Object.hasOwn(r,'OutletCodeRD')&&{outletCodeRd:r.OutletCodeRD||null}),territoryId:territories.get(key),
    ...(Object.hasOwn(r,'RdCode')&&{rdCode:r.RdCode||null}),
    ...(Object.hasOwn(r,'State')&&{state:r.State||null}),
    ...(Object.hasOwn(r,'BeatName')&&{beatName:r.BeatName||null}),
    ...(Object.hasOwn(r,'Latitude')&&{latitude,longitude}),
    ...(coordinatesChanged&&{locationVerified:null}),
    sourceFields:{...current?.sourceFields,...Object.fromEntries([...storeMasterFields,'OutletPhone'].filter(key=>Object.hasOwn(r,key)).map(key=>[key,r[key]||null]))},
    ...(r.RecordType&&{recordType:r.RecordType})};
  await tx.outlet.upsert({where:{outletUid:r.OutletUID},create:{outletUid:r.OutletUID,recordType:'Imported',...data},update:data});
}
async function exportRows(kind,page=null){
  const pagination=page?Prisma.sql`LIMIT 11 OFFSET ${(page-1)*10}`:Prisma.empty;
  if(kind==='store-sales')return storeSalesExport(pagination);
  if(kind==='stores'){
    const rows=await db.$queryRaw`SELECT o."sourceFields" AS source,o."outletUid" AS "OutletUID",o."outletCodeRd" AS "OutletCodeRD",o."outletName" AS "OutletName",
      t."branchName" AS "BranchName",t."regionName" AS "RegionName",t."asmArea" AS "ASMArea",t."soTerritory" AS "SOTerritory",
      o."rdCode" AS "RdCode",d."rdName" AS "DirectoryRDName",o.state AS "State",o."beatName" AS "BeatName",o.latitude AS "Latitude",o.longitude AS "Longitude",
      coalesce(o."sourceFields"->>'OutletPhone',o."sourceFields"->>'Phone',o."sourceFields"->>'Mobile') AS "OutletPhone",o."recordType" AS "RecordType"
      FROM "Outlet" o JOIN "Territory" t ON t.id=o."territoryId" LEFT JOIN "Distributor" d ON d."rdCode"=o."rdCode"
      ORDER BY o."outletUid" ${pagination}`;
    return rows.map(({source,DirectoryRDName,...row})=>({...Object.fromEntries(storeMasterFields.map(key=>[key,source?.[key]??null])),
      RDName:source?.RDName??DirectoryRDName,visiDate:source?.visiDate??source?.Visidate,VisiCooler:source?.VisiCooler??source?.Visicooler,...row}));
  }
  return exportExtra(kind,pagination);
}
export function registerExcel(router,wrap,audit){
  router.get('/master/:kind',wrap(async(req,res)=>{
    const kind=z.enum(['stores','store-sales','stockists','assets','rd-sales']).parse(req.params.kind);
    const page=z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
    const table={stores:'Outlet','store-sales':'StoreSalesReport',stockists:'RD_Master',assets:'CoolerAsset','rd-sales':'RD_Sales'}[kind];
    const [rows,[{total}]]=await Promise.all([exportRows(kind,page),db.$queryRaw`SELECT count(*)::int AS total FROM ${Prisma.raw('"'+table+'"')}`]);
    res.json({items:rows.slice(0,10),total,hasMore:rows.length>10});
  }));
  router.get('/imports',wrap(async(req,res)=>{
    const page=z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
    const rows=await db.$queryRaw`SELECT i.id,i.kind,i.filename,i."rowCount",i."createdAt",e.name AS employee,count(*) OVER ()::int AS total FROM "AdminImport" i
      JOIN "Employee" e ON e.id=i."employeeId" ORDER BY i."createdAt" DESC,i.id DESC LIMIT 11 OFFSET ${(page-1)*10}`;
    res.json({items:rows.slice(0,10),total:rows[0]?.total??0,hasMore:rows.length>10});
  }));
  router.get('/excel/:kind/:variant',wrap(async(req,res)=>{
    const {kind,variant}=req.params;
    if(!Object.hasOwn(columns,kind)||!['template','export'].includes(variant)||['questions','users'].includes(kind)&&variant==='export')throw problem('Unknown workbook.',404);
    const rows=variant==='export'?await exportRows(kind):[];
    const workbook=XLSX.utils.book_new();
    const sheet=XLSX.utils.aoa_to_sheet([columns[kind],...rows.map(row=>columns[kind].map(key=>row[key]??''))]);
    sheet['!cols']=columns[kind].map(key=>({wch:Math.max(17,key.length+3)}));
    XLSX.utils.book_append_sheet(workbook,sheet,kind==='stockists'?'RD_Master':kind==='rd-sales'?'RD_Sales':kind==='store-sales'?'Store_Sales':kind==='stores'?'Store_Master':kind);
    if(kind==='users'){
      const territories=await db.territory.findMany({orderBy:{soTerritory:'asc'}});
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([['TerritoryID','Branch','Region','Area','Territory'],
        ...territories.map(t=>[t.id,t.branchName,t.regionName,t.asmArea,t.soTerritory])]),'Territories');
    }
    res.attachment(kind+'-'+variant+'.xlsx').send(XLSX.write(workbook,{bookType:'xlsx',type:'buffer'}));
  }));
  router.post('/excel/:kind/:action',upload,wrap(async(req,res)=>{
    const {kind,action}=req.params;
    if(!Object.hasOwn(columns,kind)||!['preview','apply'].includes(action)||kind==='questions'&&action!=='preview')throw problem('Unknown workbook operation.',404);
    const rows=read(req.file,kind);
    if(kind==='questions'){
      const questions=rows.map(({data:r})=>({id:r.ID,label:r.Question,description:r.Description,type:r.Type.toLowerCase(),
        options:r.Options?r.Options.split('|').map(v=>v.trim()).filter(Boolean):undefined,when:r.ShowWhenYes||undefined,
        required:/^(true|yes|1)$/i.test(r.Required),attachment:r.Attachment?.toLowerCase()||'none',capture:r.CaptureImage?.toLowerCase()||'none'}));
      return res.json({questions,count:questions.length});
    }
    const errors=await validate(rows,kind);
    const sample=rows.slice(0,10).map(({data})=>Object.fromEntries(Object.entries(data).filter(([key])=>key!=='InitialPassword')));
    if(action==='preview'||errors.length)return res.status(action==='apply'?422:200).json({count:rows.length,errors,sample});
    const newUsers=[];
    if(kind==='users'){
      if(rows.length>100)throw problem('Import at most 100 users at a time.');
      for(const {data} of rows){
        const {initialPassword,enabled,...employee}=userRow.parse(userInput(data));
        newUsers.push({...employee,passwordHash:await hashPassword(initialPassword)});
      }
    }
    const id=randomUUID();
    await db.$transaction(async tx=>{
      const territories=new Map();
      if(kind==='users')await tx.employee.createMany({data:newUsers});
      else for(const {data} of rows){
        if(kind==='stores')await saveStore(tx,data,territories);
        else if(kind==='store-sales')await saveStoreSales(tx,data);
        else await saveExtra(tx,kind,data);
      }
      await tx.$executeRaw`INSERT INTO "AdminImport"(id,kind,filename,"rowCount","employeeId")
        VALUES(${id}::uuid,${kind},${req.file.originalname.slice(0,255)},${rows.length},${req.employee.id}::uuid)`;
      await audit(tx,req,'Excel import applied',kind==='users'?'Employee':kind,id,rows.length+' rows');
    },{timeout:60000});
    res.json({id,count:rows.length});
  }));
}
