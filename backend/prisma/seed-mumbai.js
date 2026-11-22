import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
const stores=[
  ['Andheri West Demo Store','Andheri West',19.1364,72.8296],
  ['Andheri East Demo Store','Andheri East',19.1136,72.8697],
  ['Bandra Demo Mart','Bandra West',19.0596,72.8295],
  ['Powai Demo Retail','Powai',19.1176,72.9060],
  ['Kurla Demo General Store','Kurla',19.0726,72.8845],
  ['Dadar Demo Shop','Dadar West',19.0189,72.8430],
  ['Goregaon Demo Market','Goregaon East',19.1663,72.8526],
  ['Vile Parle Demo Store','Vile Parle East',19.0968,72.8517]
];
const territory=await db.territory.upsert({where:{branchName_regionName_asmArea_soTerritory:{branchName:'Synthetic Mumbai',regionName:'Synthetic Mumbai',asmArea:'Mumbai Demo',soTerritory:'Mumbai Demo'}},create:{branchName:'Synthetic Mumbai',regionName:'Synthetic Mumbai',asmArea:'Mumbai Demo',soTerritory:'Mumbai Demo'},update:{}});
await db.distributor.upsert({where:{rdCode:'SYN-MUM-RD'},create:{rdCode:'SYN-MUM-RD',rdName:'Synthetic Mumbai Distributor',rdTown:'Mumbai',state:'Maharashtra'},update:{}});
for(const [index,[outletName,beatName,latitude,longitude]] of stores.entries()){
  const number=String(index+1).padStart(3,'0'),outletUid=`SYN-MUM-${number}`,assetCode=`SYN-MUM-VC-${number}`;
  await db.outlet.upsert({where:{outletUid},create:{outletUid,outletCodeRd:outletUid,outletName,territoryId:territory.id,rdCode:'SYN-MUM-RD',state:'Maharashtra',beatName,latitude,longitude,locationVerified:false,recordType:'Synthetic',sourceFields:{provenance:'local development seed',synthetic:true}},update:{outletName,beatName,latitude,longitude,territoryId:territory.id,recordType:'Synthetic'}});
  await db.coolerAsset.upsert({where:{assetCode},create:{assetCode,recordType:'Synthetic',sourceFields:{provenance:'local development seed',synthetic:true}},update:{}});
  const assignment=await db.assetAssignment.findFirst({where:{outletUid,assetCode,endedAt:null}});
  if(!assignment)await db.assetAssignment.create({data:{outletUid,assetCode,visiNo:'Demo assignment'}});
}
await db.$disconnect();
console.log(`Seeded ${stores.length} synthetic Mumbai outlets.`);
