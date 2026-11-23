import { z } from 'zod';

export const id = z.coerce.number().int().positive();
export const idParams = z.object({ id });

const emptyToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
export const optionalText = (max = 5000) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());
export const optionalDate = z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ معتبر نیست.').nullable().optional());
export const optionalUrl = z.preprocess(
  emptyToNull,
  z.string().trim().max(2000).regex(/^https?:\/\/[^\s]+\.[^\s]+$/i, 'نشانی باید با http:// یا https:// شروع شود.').nullable().optional(),
);

export const password = z.string().min(8, 'رمز عبور حداقل ۸ نویسه باشد.').max(128);
export const email = z.string().trim().toLowerCase().email('ایمیل معتبر نیست.').max(254);

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
