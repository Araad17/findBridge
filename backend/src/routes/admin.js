import { Router } from 'express';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { z } from 'zod';
import { query, tx } from '../db.js';
import { config } from '../config.js';
import { requireAdminArea, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adImageUpload, verifyUpload, removeFile, PUBLIC_DIR, PRIVATE_DIR } from '../middleware/upload.js';
import { badRequest, conflict, forbidden, notFound, wrap } from '../utils/httpError.js';
import { id, idParams, optionalText, optionalDate, optionalUrl, pagination, email, password } from '../utils/schemas.js';
import { scholarshipAdmin, adAdmin, userPublic } from '../utils/serializers.js';
import { logActivity } from '../utils/log.js';
import { createToken } from '../utils/tokens.js';
import { sendMail } from '../utils/mailer.js';
import { referralCode } from '../utils/crypto.js';
import { sendDocument } from './documents.js';
import { documentDto } from './documents.js';

const router = Router();
const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/* =====================================================================
   نمای کلی (مدیر و کارشناس)
   ===================================================================== */
router.get(
  '/stats',
  requireAdminArea,
  wrap(async (_req, res) => {
    const [sch, usr, apps, upcoming, activity, ads] = await Promise.all([
      query(`SELECT count(*) FILTER (WHERE status='published')::int AS published,
                    count(*) FILTER (WHERE status='draft')::int AS draft,
                    count(*) FILTER (WHERE status='archived')::int AS archived,
                    count(*) FILTER (WHERE status='published' AND (deadline IS NULL OR deadline >= CURRENT_DATE))::int AS open,
                    count(*) FILTER (WHERE status='published' AND deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)::int AS deadlines_soon
               FROM scholarships`),
      query(`SELECT count(*)::int AS total,
                    count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_week,
                    count(*) FILTER (WHERE status='pending')::int AS pending
               FROM users`),
      query(`SELECT count(*) FILTER (WHERE status IN ('submitted','in_review'))::int AS active,
                    count(*) FILTER (WHERE status='submitted')::int AS unreviewed FROM applications`),
      query(`SELECT s.id, s.title, s.deadline,
                    (SELECT count(*)::int FROM applications a WHERE a.scholarship_id = s.id) AS applicants,
                    u.first_name, u.last_name
               FROM scholarships s LEFT JOIN users u ON u.id = s.updated_by
              WHERE s.status='published' AND s.deadline >= CURRENT_DATE
              ORDER BY s.deadline LIMIT 5`),
      query(`SELECT l.id, l.action, l.detail, l.created_at, u.first_name, u.last_name
               FROM activity_log l LEFT JOIN users u ON u.id = l.actor_id
              ORDER BY l.created_at DESC LIMIT 10`),
      query(`SELECT count(*)::int AS n FROM ads WHERE status = 'active'`),
    ]);
    res.json({
      scholarships: sch.rows[0],
      users: usr.rows[0],
      applications: apps.rows[0],
      activeAds: ads.rows[0].n,
      upcomingDeadlines: upcoming.rows.map((r) => ({
        id: r.id, title: r.title, deadline: r.deadline, applicants: r.applicants,
        owner: r.first_name ? `${r.first_name} ${r.last_name}`.trim() : null,
      })),
      recentActivity: activity.rows.map((r) => ({
        id: r.id, action: r.action, detail: r.detail, createdAt: r.created_at,
        actor: r.first_name ? `${r.first_name} ${r.last_name}`.trim() : 'سیستم',
      })),
    });
  }),
);

/* =====================================================================
   بورسیه‌ها
   ===================================================================== */
const DEGREES = z.enum(['bachelor', 'master', 'phd']);
const FUNDING = z.enum(['full_funding', 'full_tuition', 'tuition_housing', 'stipend', 'partial_tuition']);
const textList = z.array(z.string().trim().min(1).max(200)).max(30).default([]);

const scholarshipBody = z.object({
  title: z.string().trim().min(2, 'عنوان بورسیه را وارد کنید.').max(200),
  provider: optionalText(200),
  country: z.string().trim().max(80).default(''),
  field: optionalText(300),
  degreeLevels: z.array(DEGREES).max(3).default([]),
  fundingType: z.preprocess((v) => (v === '' ? null : v), FUNDING.nullable().optional()),
  fundingDetails: optionalText(3000),
  badge: optionalText(60),
  description: optionalText(8000),
  eligibility: optionalText(5000),
  requirements: optionalText(5000),
  languageRequired: z.boolean().default(false),
  languageNote: optionalText(500),
  requiredDocuments: textList,
  startDate: optionalDate,
  deadline: optionalDate,
  deadlineNote: optionalText(300),
  deadlineTimezone: optionalText(80),
  sourceUrl: optionalUrl,
  applicationUrl: optionalUrl,
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  confirmVerified: z.boolean().optional(),
});

function assertPublishable(b) {
  const missing = {};
  if (!b.country) missing.country = 'کشور مقصد الزامی است.';
  if (!b.degreeLevels?.length) missing.degreeLevels = 'حداقل یک مقطع تحصیلی انتخاب کنید.';
  if (!b.description) missing.description = 'شرح فرصت الزامی است.';
  if (!b.deadline) missing.deadline = 'مهلت درخواست الزامی است.';
  if (!b.sourceUrl) missing.sourceUrl = 'نشانی منبع رسمی الزامی است.';
  if (!b.applicationUrl) missing.applicationUrl = 'پیوند مستقیم درخواست الزامی است.';
  if (!b.confirmVerified && !b.lastVerifiedAt) missing.confirmVerified = 'بررسی منبع رسمی باید تایید شود.';
  if (Object.keys(missing).length) throw badRequest('برای انتشار، موارد الزامی را کامل کنید.', missing);
}

const scholarshipValues = (b, userId) => [
  b.title, b.provider ?? null, b.country, b.field ?? null, b.degreeLevels, b.fundingType ?? null,
  b.fundingDetails ?? null, b.badge ?? null, b.description ?? null, b.eligibility ?? null, b.requirements ?? null,
  b.languageRequired, b.languageNote ?? null, b.requiredDocuments, b.startDate ?? null, b.deadline ?? null,
  b.deadlineNote ?? null, b.deadlineTimezone ?? null, b.sourceUrl ?? null, b.applicationUrl ?? null,
  b.confirmVerified ? new Date().toISOString().slice(0, 10) : (b.lastVerifiedAt ?? null),
  b.featured, b.status, userId,
];

const SCHOLARSHIP_COLS = `title, provider, country, field, degree_levels, funding_type, funding_details, badge, description,
  eligibility, requirements, language_required, language_note, required_documents, start_date, deadline, deadline_note,
  deadline_timezone, source_url, application_url, last_verified_at, featured, status`;

const schList = pagination.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  country: z.string().trim().max(80).optional(),
});

router.get(
  '/scholarships',
  requireAdminArea,
  validate({ query: schList }),
  wrap(async (req, res) => {
    const f = req.query;
    const where = ['TRUE'];
    const params = [];
    if (f.q) { params.push(`%${likeEscape(f.q)}%`); where.push(`s.title ILIKE $${params.length}`); }
    if (f.status) { params.push(f.status); where.push(`s.status = $${params.length}`); }
    if (f.country) { params.push(f.country); where.push(`s.country = $${params.length}`); }
    const whereSql = where.join(' AND ');
    const [list, total, counts, countries] = await Promise.all([
      query(`SELECT s.* FROM scholarships s WHERE ${whereSql} ORDER BY s.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, f.limit, (f.page - 1) * f.limit]),
      query(`SELECT count(*)::int AS n FROM scholarships s WHERE ${whereSql}`, params),
      query(`SELECT count(*)::int AS all, count(*) FILTER (WHERE status='published')::int AS published,
                    count(*) FILTER (WHERE status='draft')::int AS draft, count(*) FILTER (WHERE status='archived')::int AS archived
               FROM scholarships`),
      query(`SELECT DISTINCT country FROM scholarships WHERE country <> '' ORDER BY country`),
    ]);
    res.json({
      items: list.rows.map(scholarshipAdmin),
      total: total.rows[0].n,
      page: f.page,
      limit: f.limit,
      counts: counts.rows[0],
      countries: countries.rows.map((r) => r.country),
    });
  }),
);

router.get(
  '/scholarships/:id',
  requireAdminArea,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT s.*, u.first_name AS ub_first, u.last_name AS ub_last FROM scholarships s LEFT JOIN users u ON u.id = s.updated_by WHERE s.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) throw notFound('بورسیه پیدا نشد.');
    const history = await query(
      `SELECT l.action, l.detail, l.created_at, u.first_name, u.last_name FROM activity_log l LEFT JOIN users u ON u.id = l.actor_id
        WHERE l.target_type = 'scholarship' AND l.target_id = $1 ORDER BY l.created_at DESC LIMIT 10`,
      [req.params.id],
    );
    res.json({
      scholarship: scholarshipAdmin(rows[0]),
      lastEditor: rows[0].ub_first ? `${rows[0].ub_first} ${rows[0].ub_last}`.trim() : null,
      history: history.rows.map((h) => ({ action: h.action, detail: h.detail, createdAt: h.created_at, actor: h.first_name ? `${h.first_name} ${h.last_name}`.trim() : 'سیستم' })),
    });
  }),
);

router.post(
  '/scholarships',
  requireAdminArea,
  validate({ body: scholarshipBody }),
  wrap(async (req, res) => {
    const b = req.body;
    if (b.status === 'published') assertPublishable(b);
    const created = await tx(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO scholarships(${SCHOLARSHIP_COLS}, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$24) RETURNING *`,
        scholarshipValues(b, req.user.id),
      );
      await logActivity(c, { actorId: req.user.id, action: 'scholarship.create', targetType: 'scholarship', targetId: rows[0].id, detail: rows[0].title });
      return rows[0];
    });
    res.status(201).json({ scholarship: scholarshipAdmin(created) });
  }),
);

router.put(
  '/scholarships/:id',
  requireAdminArea,
  validate({ params: idParams, body: scholarshipBody }),
  wrap(async (req, res) => {
    const b = req.body;
    if (b.status === 'published') assertPublishable(b);
    const updated = await tx(async (c) => {
      const { rows } = await c.query(
        `UPDATE scholarships SET (title, provider, country, field, degree_levels, funding_type, funding_details, badge, description,
           eligibility, requirements, language_required, language_note, required_documents, start_date, deadline, deadline_note,
           deadline_timezone, source_url, application_url, last_verified_at, featured, status, updated_by, updated_at)
         = ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            COALESCE($21::date, last_verified_at),$22,$23,$24, now())
         WHERE id = $25 RETURNING *`,
        [...scholarshipValues(b, req.user.id), req.params.id],
      );
      if (!rows[0]) throw notFound('بورسیه پیدا نشد.');
      await logActivity(c, { actorId: req.user.id, action: 'scholarship.update', targetType: 'scholarship', targetId: rows[0].id, detail: rows[0].title });
      return rows[0];
    });
    res.json({ scholarship: scholarshipAdmin(updated) });
  }),
);

router.post(
  '/scholarships/:id/archive',
  requireAdminArea,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query(`UPDATE scholarships SET status='archived', updated_by=$2, updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id, req.user.id]);
    if (!rows[0]) throw notFound('بورسیه پیدا نشد.');
    await logActivity(null, { actorId: req.user.id, action: 'scholarship.archive', targetType: 'scholarship', targetId: rows[0].id, detail: rows[0].title });
    res.json({ scholarship: scholarshipAdmin(rows[0]) });
  }),
);

router.delete(
  '/scholarships/:id',
  requireAdminArea,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM scholarships WHERE id = $1 RETURNING id, title', [req.params.id]);
    if (!rows[0]) throw notFound('بورسیه پیدا نشد.');
    await logActivity(null, { actorId: req.user.id, action: 'scholarship.delete', targetType: 'scholarship', detail: rows[0].title });
    res.json({ ok: true });
  }),
);

/* =====================================================================
   کاربران (فقط مدیر)
   ===================================================================== */
const ROLES = z.enum(['applicant', 'consultant', 'admin', 'expert']);
const STATUSES = z.enum(['active', 'pending', 'blocked']);

async function otherActiveAdminExists(excludeId) {
  const { rowCount } = await query(`SELECT 1 FROM users WHERE role = 'admin' AND status = 'active' AND id <> $1 LIMIT 1`, [excludeId]);
  return rowCount > 0;
}

router.get(
  '/users',
  requireAdmin,
  validate({ query: pagination.extend({ q: z.string().trim().max(100).optional(), role: ROLES.optional(), status: STATUSES.optional() }) }),
  wrap(async (req, res) => {
    const f = req.query;
    const where = ['TRUE'];
    const params = [];
    if (f.q) { params.push(`%${likeEscape(f.q)}%`); where.push(`(first_name || ' ' || last_name ILIKE $${params.length} OR email::text ILIKE $${params.length})`); }
    if (f.role) { params.push(f.role); where.push(`role = $${params.length}`); }
    if (f.status) { params.push(f.status); where.push(`status = $${params.length}`); }
    const whereSql = where.join(' AND ');
    const [list, total, all] = await Promise.all([
      query(`SELECT * FROM users WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, f.limit, (f.page - 1) * f.limit]),
      query(`SELECT count(*)::int AS n FROM users WHERE ${whereSql}`, params),
      query('SELECT count(*)::int AS n FROM users'),
    ]);
    res.json({ items: list.rows.map(userPublic), total: total.rows[0].n, all: all.rows[0].n, page: f.page, limit: f.limit });
  }),
);

router.get(
  '/users/:id',
  requireAdmin,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('کاربر پیدا نشد.');
    const [history, docs] = await Promise.all([
      query(
        `SELECT l.action, l.detail, l.created_at, u.first_name, u.last_name FROM activity_log l LEFT JOIN users u ON u.id = l.actor_id
          WHERE l.target_type = 'user' AND l.target_id = $1 ORDER BY l.created_at DESC LIMIT 10`,
        [req.params.id],
      ),
      query('SELECT count(*)::int AS n FROM documents WHERE user_id = $1', [req.params.id]),
    ]);
    res.json({
      user: userPublic(rows[0]),
      documentCount: docs.rows[0].n,
      history: history.rows.map((h) => ({ action: h.action, detail: h.detail, createdAt: h.created_at, actor: h.first_name ? `${h.first_name} ${h.last_name}`.trim() : 'سیستم' })),
    });
  }),
);

router.post(
  '/users',
  requireAdmin,
  validate({
    body: z.object({
      name: z.string().trim().min(2).max(120),
      email,
      password,
      role: ROLES.default('applicant'),
      status: STATUSES.default('active'),
    }),
  }),
  wrap(async (req, res) => {
    const b = req.body;
    const parts = b.name.split(/\s+/);
    const hash = await bcrypt.hash(b.password, 12);
    const { rows } = await query(
      `INSERT INTO users(first_name, last_name, email, password_hash, role, status, referral_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [parts[0], parts.slice(1).join(' '), b.email, hash, b.role, b.status, referralCode()],
    ).catch((e) => { if (e.code === '23505') throw conflict('با این ایمیل قبلاً حساب ساخته شده است.'); throw e; });
    await logActivity(null, { actorId: req.user.id, action: 'user.create', targetType: 'user', targetId: rows[0].id, detail: rows[0].email });
    res.status(201).json({ user: userPublic(rows[0]) });
  }),
);

router.patch(
  '/users/:id',
  requireAdmin,
  validate({
    params: idParams,
    body: z.object({ name: z.string().trim().min(2).max(120).optional(), role: ROLES.optional(), status: STATUSES.optional() }),
  }),
  wrap(async (req, res) => {
    const { rows: found } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const target = found[0];
    if (!target) throw notFound('کاربر پیدا نشد.');
    const b = req.body;
    const isSelf = target.id === req.user.id;
    if (isSelf && ((b.role && b.role !== target.role) || (b.status && b.status !== target.status))) {
      throw forbidden('نقش یا وضعیت حساب خودتان را نمی‌توانید تغییر دهید.');
    }
    const losingAdmin = target.role === 'admin' && ((b.role && b.role !== 'admin') || (b.status && b.status !== 'active'));
    if (losingAdmin && !(await otherActiveAdminExists(target.id))) {
      throw forbidden('حداقل یک مدیر فعال باید در سامانه باقی بماند.');
    }
    const parts = b.name ? b.name.split(/\s+/) : null;
    const { rows } = await query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = CASE WHEN $1 IS NULL THEN last_name ELSE $2 END,
         role = COALESCE($3, role), status = COALESCE($4, status), updated_at = now()
       WHERE id = $5 RETURNING *`,
      [parts?.[0] ?? null, parts ? parts.slice(1).join(' ') : '', b.role ?? null, b.status ?? null, req.params.id],
    );
    const changes = [b.name && 'نام', b.role && `نقش→${b.role}`, b.status && `وضعیت→${b.status}`].filter(Boolean).join('، ');
    await logActivity(null, { actorId: req.user.id, action: 'user.update', targetType: 'user', targetId: target.id, detail: changes });
    res.json({ user: userPublic(rows[0]) });
  }),
);

router.delete(
  '/users/:id',
  requireAdmin,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows: found } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const target = found[0];
    if (!target) throw notFound('کاربر پیدا نشد.');
    if (target.id === req.user.id) throw forbidden('حساب خودتان را نمی‌توانید حذف کنید.');
    if (target.role === 'admin' && !(await otherActiveAdminExists(target.id))) throw forbidden('حداقل یک مدیر فعال باید در سامانه باقی بماند.');

    const files = await query('SELECT file_path FROM documents WHERE user_id = $1', [target.id]);
    await tx(async (c) => {
      await c.query('DELETE FROM users WHERE id = $1', [target.id]);
      await logActivity(c, { actorId: req.user.id, action: 'user.delete', targetType: 'user', detail: target.email });
    });
    await Promise.all(files.rows.map((f) => removeFile(path.join(PRIVATE_DIR, 'documents', path.basename(f.file_path)))));
    if (target.avatar_path) await removeFile(path.join(PUBLIC_DIR, target.avatar_path));
    res.json({ ok: true });
  }),
);

router.post(
  '/users/:id/email-verification',
  requireAdmin,
  validate({ params: idParams, body: z.object({ newEmail: email.optional() }) }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('کاربر پیدا نشد.');
    const { newEmail } = req.body;
    if (newEmail) {
      const dup = await query('SELECT 1 FROM users WHERE email = $1 AND id <> $2', [newEmail, rows[0].id]);
      if (dup.rowCount) throw conflict('این ایمیل قبلاً برای حساب دیگری ثبت شده است.');
    }
    const token = await createToken(null, rows[0].id, 'email_verify', newEmail ? { newEmail } : null, 60 * 24);
    await sendMail({
      to: newEmail || rows[0].email,
      subject: 'تایید ایمیل حساب بورسیه‌یار',
      text: `برای تایید ایمیل روی لینک زیر بزنید (۲۴ ساعت معتبر است):\n${config.clientUrl}/?verify=${token}`,
    });
    await logActivity(null, { actorId: req.user.id, action: 'user.email_verification', targetType: 'user', targetId: rows[0].id, detail: newEmail || rows[0].email });
    res.json({ ok: true });
  }),
);

router.post(
  '/users/:id/password-reset',
  requireAdmin,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('کاربر پیدا نشد.');
    const token = await createToken(null, rows[0].id, 'password_reset', null, 60);
    await sendMail({
      to: rows[0].email,
      subject: 'بازنشانی رمز عبور بورسیه‌یار',
      text: `برای تعیین رمز عبور جدید روی لینک زیر بزنید (یک ساعت معتبر است):\n${config.clientUrl}/?reset=${token}`,
    });
    await logActivity(null, { actorId: req.user.id, action: 'user.password_reset', targetType: 'user', targetId: rows[0].id });
    res.json({ ok: true });
  }),
);

router.get(
  '/users/:id/documents',
  requireAdmin,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ items: rows.map(documentDto) });
  }),
);

router.get(
  '/users/:id/documents/:docId/download',
  requireAdmin,
  validate({ params: z.object({ id, docId: id }) }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.docId, req.params.id]);
    if (!rows[0]) throw notFound('سند پیدا نشد.');
    await logActivity(null, { actorId: req.user.id, action: 'user.document_view', targetType: 'user', targetId: req.params.id, detail: rows[0].name });
    sendDocument(res, rows[0]);
  }),
);

router.patch(
  '/users/:id/documents/:docId',
  requireAdmin,
  validate({ params: z.object({ id, docId: id }), body: z.object({ status: z.enum(['approved', 'rejected', 'in_review']) }) }),
  wrap(async (req, res) => {
    const { rows } = await query('UPDATE documents SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [req.body.status, req.params.docId, req.params.id]);
    if (!rows[0]) throw notFound('سند پیدا نشد.');
    await logActivity(null, { actorId: req.user.id, action: 'user.document_review', targetType: 'user', targetId: req.params.id, detail: `${rows[0].name} → ${req.body.status}` });
    res.json({ document: documentDto(rows[0]) });
  }),
);

/* =====================================================================
   تبلیغات
   ===================================================================== */
const adBody = z.object({
  title: z.string().trim().min(2, 'عنوان تبلیغ را وارد کنید.').max(150),
  subtitle: optionalText(150),
  description: optionalText(600),
  destination: z.string().trim().max(2000).regex(/^https?:\/\/\S+$/i, 'پیوند مقصد باید با http:// یا https:// شروع شود.'),
  placement: z.enum(['home', 'scholarships', 'guide']),
  startDate: optionalDate,
  endDate: optionalDate,
  status: z.enum(['active', 'draft', 'ended']).default('draft'),
  visible: z.boolean().default(true),
}).refine((b) => !b.startDate || !b.endDate || b.startDate <= b.endDate, { message: 'پایان نمایش نباید قبل از آغاز باشد.', path: ['endDate'] });

router.get(
  '/ads',
  requireAdminArea,
  validate({ query: z.object({ q: z.string().trim().max(100).optional(), status: z.enum(['active', 'draft', 'ended']).optional(), placement: z.enum(['home', 'scholarships', 'guide']).optional() }) }),
  wrap(async (req, res) => {
    const f = req.query;
    const where = ['TRUE'];
    const params = [];
    if (f.q) { params.push(`%${likeEscape(f.q)}%`); where.push(`title ILIKE $${params.length}`); }
    if (f.status) { params.push(f.status); where.push(`status = $${params.length}`); }
    if (f.placement) { params.push(f.placement); where.push(`placement = $${params.length}`); }
    const { rows } = await query(`SELECT * FROM ads WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT 200`, params);
    res.json({ items: rows.map(adAdmin) });
  }),
);

router.post(
  '/ads',
  requireAdminArea,
  validate({ body: adBody }),
  wrap(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO ads(title, subtitle, description, destination, placement, start_date, end_date, status, visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.title, b.subtitle ?? null, b.description ?? null, b.destination, b.placement, b.startDate ?? null, b.endDate ?? null, b.status, b.visible],
    );
    await logActivity(null, { actorId: req.user.id, action: 'ad.create', targetType: 'ad', targetId: rows[0].id, detail: rows[0].title });
    res.status(201).json({ ad: adAdmin(rows[0]) });
  }),
);

router.put(
  '/ads/:id',
  requireAdminArea,
  validate({ params: idParams, body: adBody }),
  wrap(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `UPDATE ads SET title=$1, subtitle=$2, description=$3, destination=$4, placement=$5, start_date=$6, end_date=$7,
         status=$8, visible=$9, updated_at=now() WHERE id=$10 RETURNING *`,
      [b.title, b.subtitle ?? null, b.description ?? null, b.destination, b.placement, b.startDate ?? null, b.endDate ?? null, b.status, b.visible, req.params.id],
    );
    if (!rows[0]) throw notFound('تبلیغ پیدا نشد.');
    await logActivity(null, { actorId: req.user.id, action: 'ad.update', targetType: 'ad', targetId: rows[0].id, detail: rows[0].title });
    res.json({ ad: adAdmin(rows[0]) });
  }),
);

router.post(
  '/ads/:id/image',
  requireAdminArea,
  adImageUpload.single('image'),
  wrap(async (req, res) => {
    if (!req.file) throw badRequest('تصویری انتخاب نشده است.');
    await verifyUpload(req.file);
    const adId = z.coerce.number().int().positive().parse(req.params.id);
    const old = await query('SELECT image_path FROM ads WHERE id = $1', [adId]);
    if (!old.rows[0]) { await removeFile(req.file.path); throw notFound('تبلیغ پیدا نشد.'); }
    const { rows } = await query('UPDATE ads SET image_path = $1, updated_at = now() WHERE id = $2 RETURNING *', [`ads/${req.file.filename}`, adId]);
    if (old.rows[0].image_path) await removeFile(path.join(PUBLIC_DIR, old.rows[0].image_path));
    res.json({ ad: adAdmin(rows[0]) });
  }),
);

router.delete(
  '/ads/:id',
  requireAdminArea,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM ads WHERE id = $1 RETURNING title, image_path', [req.params.id]);
    if (!rows[0]) throw notFound('تبلیغ پیدا نشد.');
    if (rows[0].image_path) await removeFile(path.join(PUBLIC_DIR, rows[0].image_path));
    await logActivity(null, { actorId: req.user.id, action: 'ad.delete', targetType: 'ad', detail: rows[0].title });
    res.json({ ok: true });
  }),
);

export default router;
