import {z} from 'zod';
import {db} from '../db.js';
import {hashPassword} from '../password.js';

export const profile=z.object({
  name:z.string().trim().min(1).max(120), email:z.string().trim().email().max(254).transform(value=>value.toLowerCase()),
  jobTitle:z.string().trim().max(120).nullable().default(null),
  role:z.enum(['ADMIN','MANAGER','FIELD']), territoryId:z.string().uuid().nullable().default(null),
  enabled:z.boolean().default(true),
});
export const password=z.string().min(8).max(128);
export const scopedProfile=schema=>schema.refine(user=>user.role!=='FIELD'||!!user.territoryId,{
  message:'Choose a territory for this role.',path:['territoryId'],
});
const select={id:true,name:true,email:true,jobTitle:true,role:true,territoryId:true};
export function registerUsers(router,wrap,audit) {
  router.get('/users',wrap(async(req,res)=>{
    const {q,page}=z.object({q:z.string().max(120).default(''),page:z.coerce.number().int().min(1).max(10000).default(1)}).parse(req.query);
    const rows=await db.$queryRaw`SELECT id,name,email,"jobTitle",role,"territoryId",enabled,"lastLogin",count(*) OVER ()::int AS total
      FROM "Employee" WHERE "deletedAt" IS NULL AND (strpos(lower(name),lower(${q}))>0 OR strpos(lower(email),lower(${q}))>0 OR ${q}='')
      ORDER BY name,id LIMIT 11 OFFSET ${(page-1)*10}`;
    res.json({items:rows.slice(0,10),total:rows[0]?.total??0,hasMore:rows.length>10});
  }));
  router.get('/territories',wrap(async(_req,res)=>{
    res.json(await db.territory.findMany({orderBy:[{branchName:'asc'},{regionName:'asc'},{soTerritory:'asc'}]}));
  }));
  router.post('/users',wrap(async(req,res)=>{
    const {initialPassword,enabled,...employee}=scopedProfile(profile.extend({initialPassword:password.default('Demo@@1234')})).parse(req.body);
    if(employee.role!=='FIELD')employee.territoryId=null;
    const passwordHash=await hashPassword(initialPassword);
    const user=await db.$transaction(async tx=>{
      const created=await tx.employee.create({data:{...employee,passwordHash},select});
      await tx.$executeRaw`UPDATE "Employee" SET enabled=${enabled} WHERE id=${created.id}::uuid`;
      await audit(tx,req,'User created','Employee',created.id,created.name);
      return created;
    });
    res.status(201).json(user);
  }));
  router.put('/users/:id',wrap(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);
    const {enabled,...employee}=scopedProfile(profile).parse(req.body);
    if(id===req.employee.id&&(!enabled||employee.role!=='ADMIN'))
      return res.status(409).json({error:'You cannot disable or remove your own admin access.'});
    await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Employee" WHERE role='ADMIN' ORDER BY id FOR UPDATE`;
      const [current]=await tx.$queryRaw`SELECT enabled,role,"territoryId" FROM "Employee" WHERE id=${id}::uuid AND "deletedAt" IS NULL FOR UPDATE`;
      if(!current)throw Object.assign(new Error('User not found'),{status:404});
      if(employee.role!=='FIELD')employee.territoryId=employee.role==='MANAGER'?current.territoryId:null;
      const changesAccess=current.role!==employee.role||current.enabled!==enabled||current.territoryId!==employee.territoryId;
      await tx.employee.update({where:{id},data:employee,select});
      await tx.$executeRaw`UPDATE "Employee" SET enabled=${enabled},"sessionVersion"="sessionVersion"+${Number(changesAccess)} WHERE id=${id}::uuid`;
      await audit(tx,req,'User updated','Employee',id,employee.name);
    });
    res.sendStatus(204);
  }));
  router.delete('/users/:id',wrap(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);
    if(id===req.employee.id)return res.status(409).json({error:'You cannot delete your own account.'});
    await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Employee" WHERE role='ADMIN' ORDER BY id FOR UPDATE`;
      const changed=await tx.$executeRaw`UPDATE "Employee" SET enabled=false,"deletedAt"=now(),"sessionVersion"="sessionVersion"+1
        WHERE id=${id}::uuid AND "deletedAt" IS NULL`;
      if(!changed)throw Object.assign(new Error('User not found'),{status:404});
      await audit(tx,req,'User deleted','Employee',id);
    });
    res.sendStatus(204);
  }));
  router.post('/users/:id/password',wrap(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);
    const hash=await hashPassword(password.parse(req.body.password));
    await db.$transaction(async tx=>{
      const count=await tx.$executeRaw`UPDATE "Employee" SET "passwordHash"=${hash},"sessionVersion"="sessionVersion"+1 WHERE id=${id}::uuid AND "deletedAt" IS NULL`;
      if(!count)throw Object.assign(new Error('User not found'),{status:404});
      await audit(tx,req,'Password reset','Employee',id);
    });
    res.sendStatus(204);
  }));
}
