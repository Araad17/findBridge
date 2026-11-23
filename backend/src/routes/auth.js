import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, tx } from '../db.js';
import { config } from '../config.js';
import { validate } from '../middleware/validate.js';
import { issueSession, clearSession, requireAuth } from '../middleware/auth.js';
import { badRequest, unauthorized, forbidden, conflict, wrap } from '../utils/httpError.js';
import { email, password } from '../utils/schemas.js';
import { referralCode } from '../utils/crypto.js';
import { createToken, consumeToken } from '../utils/tokens.js';
import { sendMail } from '../utils/mailer.js';
import { userPublic } from '../utils/serializers.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید.' },
});

// هش ساختگی برای یکسان‌سازی زمان پاسخ وقتی کاربر وجود ندارد
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

router.post(
  '/signup',
  authLimiter,
  validate({
    body: z.object({
      name: z.string().trim().min(2, 'نام را وارد کنید.').max(120),
      email,
      password,
      ref: z.string().trim().max(32).optional(),
    }),
  }),
  wrap(async (req, res) => {
    const { name, email: mail, password: pass, ref } = req.body;
    const { first, last } = splitName(name);
    const hash = await bcrypt.hash(pass, 12);

    const user = await tx(async (c) => {
      const exists = await c.query('SELECT 1 FROM users WHERE email = $1', [mail]);
      if (exists.rowCount) throw conflict('با این ایمیل قبلاً حساب ساخته شده است.');

      let referrerId = null;
      if (ref) {
        const r = await c.query('SELECT id FROM users WHERE referral_code = $1', [ref.toLowerCase()]);
        referrerId = r.rows[0]?.id ?? null;
      }
      const { rows } = await c.query(
        `INSERT INTO users(first_name, last_name, email, password_hash, referral_code, referred_by, last_login_at)
         VALUES ($1,$2,$3,$4,$5,$6, now()) RETURNING *`,
        [first, last, mail, hash, referralCode(), referrerId],
      );
      const created = rows[0];
      if (referrerId) {
        const upd = await c.query(
          `UPDATE referrals SET referred_user_id = $1, status = 'registered'
            WHERE referrer_id = $2 AND invited_email = $3 AND status = 'invited'`,
          [created.id, referrerId, mail],
        );
        if (!upd.rowCount) {
          await c.query(
            `INSERT INTO referrals(referrer_id, referred_user_id, invited_name, status) VALUES ($1,$2,$3,'registered')`,
            [referrerId, created.id, first],
          );
        }
      }
      return created;
    });

    issueSession(res, user, false);
    res.status(201).json({ user: userPublic(user) });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate({
    body: z.object({
      email,
      password: z.string().min(1).max(128),
      remember: z.boolean().optional(),
    }),
  }),
  wrap(async (req, res) => {
    const { email: mail, password: pass, remember } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [mail]);
    const user = rows[0];
    const ok = await bcrypt.compare(pass, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('ایمیل یا رمز عبور درست نیست.');
    if (user.status === 'blocked') throw forbidden('این حساب مسدود شده است.');
    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    issueSession(res, user, Boolean(remember));
    res.json({ user: userPublic(user) });
  }),
);

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: userPublic(req.user) }));

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: z.object({ email }) }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT id, first_name FROM users WHERE email = $1 AND status <> $2', [req.body.email, 'blocked']);
    if (rows[0]) {
      const token = await createToken(null, rows[0].id, 'password_reset', null, 60);
      await sendMail({
        to: req.body.email,
        subject: 'بازیابی رمز عبور بورسیه‌یار',
        text: `برای تعیین رمز عبور جدید روی لینک زیر بزنید (تا یک ساعت معتبر است):\n${config.clientUrl}/?reset=${token}`,
      });
    }
    // برای جلوگیری از افشای وجود حساب، همیشه یک پاسخ یکسان می‌دهیم
    res.json({ ok: true, message: 'اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی ارسال می‌شود.' });
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: z.object({ token: z.string().min(10).max(200), password }) }),
  wrap(async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 12);
    await tx(async (c) => {
      const t = await consumeToken(c, req.body.token, 'password_reset');
      if (!t) throw badRequest('لینک بازیابی نامعتبر یا منقضی شده است.');
      await c.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, t.user_id]);
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/verify-email',
  validate({ body: z.object({ token: z.string().min(10).max(200) }) }),
  wrap(async (req, res) => {
    await tx(async (c) => {
      const t = await consumeToken(c, req.body.token, 'email_verify');
      if (!t) throw badRequest('لینک تایید نامعتبر یا منقضی شده است.');
      const newEmail = t.payload?.newEmail;
      if (newEmail) {
        const dup = await c.query('SELECT 1 FROM users WHERE email = $1 AND id <> $2', [newEmail, t.user_id]);
        if (dup.rowCount) throw conflict('این ایمیل قبلاً برای حساب دیگری ثبت شده است.');
        await c.query('UPDATE users SET email = $1, email_verified = TRUE, updated_at = now() WHERE id = $2', [newEmail, t.user_id]);
      } else {
        await c.query('UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = $1', [t.user_id]);
      }
    });
    res.json({ ok: true });
  }),
);

export default router;
