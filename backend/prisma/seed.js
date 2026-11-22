import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/password.js';
const db=new PrismaClient();
const users=[
  ['Arpit Rai','arpitrai1809@gmail.com','Developer','ADMIN'],
  ['Arun Rai','arun.rai@mdlz.com','Group Product Manager','ADMIN'],
  ['TK skrikanteswearan','tk.skrikanteswearan@mdlz.com','Tech Director','ADMIN'],
  ['Kabir Gossain','kabir.gossain@mdlz.com','Sales Head','ADMIN']
];
const passwordHash=await hashPassword('Demo123');
for(const [name,email,jobTitle,role] of users){await db.employee.upsert({where:{email},create:{name,email,jobTitle,role,passwordHash},update:{name,jobTitle,role,passwordHash}})}
await db.$disconnect();
console.log(`Seeded ${users.length} local demo users.`);
