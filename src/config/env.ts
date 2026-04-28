import { config } from 'dotenv';
config({ override: true });

export const ENV = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  NODE_ENV: process.env.NODE_ENV || 'development'
};
