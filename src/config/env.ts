import { config } from 'dotenv';
config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const ENV = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || '',
  NGROK_URL: process.env.NGROK_URL || '',
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '20'),
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads'
};
