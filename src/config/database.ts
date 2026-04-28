import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { ENV } from './env';

console.log('--- DB SETUP --- connectionString is:', ENV.DATABASE_URL);
const pool = new Pool({ connectionString: ENV.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function connectDatabase() {
  try {
    // Just a simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed', error);
    process.exit(1);
  }
}
