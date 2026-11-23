import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError } from '../utils/httpError.js';
import { config } from '../config.js';

export const notFoundHandler = (_req, res) => res.status(404).json({ error: 'مسیر درخواستی وجود ندارد.' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'اطلاعات واردشده معتبر نیست.',
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.') || '_', i.message])),
    });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'حجم فایل بیشتر از حد مجاز است.' : 'بارگذاری فایل ناموفق بود.';
    return res.status(400).json({ error: msg });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { fields: err.details } : {}) });
  }
  // نقض یکتایی در PostgreSQL
  if (err?.code === '23505') return res.status(409).json({ error: 'این مقدار قبلاً ثبت شده است.' });
  if (err?.code === '23503') return res.status(409).json({ error: 'این مورد به داده‌های دیگر وابسته است.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'درخواست نامعتبر است.' });
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور.', ...(config.isProd ? {} : { detail: String(err?.message) }) });
}
