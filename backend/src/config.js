import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const isProd = env.NODE_ENV === 'production';

if (isProd && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set (at least 32 chars) in production');
}

export const config = {
  isProd,
  port: Number(env.PORT || 4000),
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: env.DATABASE_URL || 'postgres://boursiye:boursiye@localhost:5432/boursiye',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me-dev-only-secret',
  jwtDays: Number(env.JWT_EXPIRES_DAYS || 7),
  jwtRememberDays: Number(env.JWT_REMEMBER_DAYS || 30),
  smtp: { host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), user: env.SMTP_USER, pass: env.SMTP_PASS },
  mailFrom: env.MAIL_FROM || 'no-reply@example.com',
  adminEmail: env.ADMIN_EMAIL || 'admin@example.com',
  adminPassword: env.ADMIN_PASSWORD || 'Admin12345',
  tzOffsetMinutes: Number(env.APP_TZ_OFFSET_MINUTES || 210),
  maxUploadBytes: Number(env.MAX_UPLOAD_MB || 10) * 1024 * 1024,
  uploadDir: path.resolve(__dirname, '..', 'uploads'),
  migrationsDir: path.resolve(__dirname, '..', 'migrations'),
};
