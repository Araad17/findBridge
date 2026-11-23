import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { conflict, badRequest, wrap } from '../utils/httpError.js';
import { email } from '../utils/schemas.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();
router.use(requireAuth);

const maskEmail = (e) => `${e.split('@')[0].slice(0, 2)}***`;

router.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT r.id, r.status, r.created_at, r.invited_name, r.invited_email, u.first_name, u.last_name
         FROM referrals r LEFT JOIN users u ON u.id = r.referred_user_id
        WHERE r.referrer_id = $1 ORDER BY r.created_at DESC LIMIT 100`,
      [req.user.id],
    );
    res.json({
      code: req.user.referral_code,
      link: `${config.clientUrl}/?ref=${req.user.referral_code}`,
      stats: {
        total: rows.length,
        registered: rows.filter((r) => r.status === 'registered').length,
        invited: rows.filter((r) => r.status === 'invited').length,
      },
      // برای حفظ حریم خصوصی فقط نام کوتاه/نام پنهان‌شده نمایش داده می‌شود
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        name: r.first_name
          ? `${r.first_name} ${r.last_name ? `${r.last_name[0]}.` : ''}`.trim()
          : r.invited_name || (r.invited_email ? maskEmail(r.invited_email) : 'دوست دعوت‌شده'),
      })),
    });
  }),
);

router.post(
  '/invite',
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'تعداد دعوت‌ها زیاد است. بعداً دوباره امتحان کنید.' } }),
  validate({ body: z.object({ email, name: z.string().trim().max(60).optional() }) }),
  wrap(async (req, res) => {
    const { email: to, name } = req.body;
    if (to === String(req.user.email).toLowerCase()) throw badRequest('نمی‌توانید خودتان را دعوت کنید.');
    const exists = await query('SELECT 1 FROM users WHERE email = $1', [to]);
    if (exists.rowCount) throw conflict('این ایمیل قبلاً در بورسیه‌یار ثبت‌نام کرده است.');
    const dup = await query('SELECT 1 FROM referrals WHERE referrer_id = $1 AND invited_email = $2', [req.user.id, to]);
    if (dup.rowCount) throw conflict('قبلاً برای این ایمیل دعوت فرستاده‌اید.');

    await query('INSERT INTO referrals(referrer_id, invited_email, invited_name) VALUES ($1,$2,$3)', [req.user.id, to, name ?? null]);
    await sendMail({
      to,
      subject: `${req.user.first_name} شما را به بورسیه‌یار دعوت کرده است`,
      text: `برای ساخت حساب و دیدن فرصت‌های تحصیلی از این لینک استفاده کنید:\n${config.clientUrl}/?ref=${req.user.referral_code}`,
    });
    res.status(201).json({ ok: true });
  }),
);

export default router;
