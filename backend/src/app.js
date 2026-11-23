import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config.js';
import { PUBLIC_DIR } from './middleware/upload.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { forbidden } from './utils/httpError.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import scholarshipRoutes from './routes/scholarships.js';
import adsRoutes from './routes/ads.js';
import documentRoutes from './routes/documents.js';
import referralRoutes from './routes/referrals.js';
import adminRoutes from './routes/admin.js';
import { consultantsRouter, consultationsRouter } from './routes/consultations.js';
import { pool } from './db.js';

export function createApp() {
  const app = express();
  if (config.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  if (!config.isProd) app.use(morgan('dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // دفاع اضافه در برابر CSRF: درخواست‌های تغییردهنده فقط از origin فرانت پذیرفته می‌شوند
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && origin !== new URL(config.clientUrl).origin) return next(forbidden('درخواست از مبدأ نامعتبر.'));
    return next();
  });

  // فقط فایل‌های عمومی (آواتار و تصویر تبلیغات)؛ اسناد کاربران از مسیر احراز هویت‌شده ارائه می‌شوند
  app.use('/uploads', express.static(PUBLIC_DIR, { maxAge: '7d', index: false, setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/scholarships', scholarshipRoutes);
  app.use('/api/ads', adsRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/consultants', consultantsRouter);
  app.use('/api/consultations', consultationsRouter);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
