import 'dotenv/config';
import { z } from 'zod';
import { db } from '../src/db.js';
import { hashPassword } from '../src/password.js';

const credentials = z.object({
  ADMIN_EMAIL: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(16).max(256),
}).safeParse(process.env);

if (!credentials.success) {
  console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters.');
  process.exitCode = 1;
} else {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = credentials.data;
  try {
    await db.employee.create({
      data: { email, name: 'Tracker Admin', jobTitle: 'Super Admin', role: 'ADMIN', passwordHash: await hashPassword(password) },
    });
    console.log('Admin account created.');
  } catch (error) {
    console.error(error.code === 'P2002'
      ? 'An account already uses ADMIN_EMAIL. Its credentials and permissions were preserved.'
      : `Admin setup failed (${error.code ?? error.name}).`);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
