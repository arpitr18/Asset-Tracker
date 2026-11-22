import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();

export const databaseHealth = {
  async check() {
    await db.$transaction((transaction) => transaction.$queryRaw`SELECT 1`, {
      maxWait: 2000,
      timeout: 2000,
    });
  },
};
