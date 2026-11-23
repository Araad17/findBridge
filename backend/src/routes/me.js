import { Router } from 'express';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { z } from 'zod';
import { query, tx } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { avatarUpload, verifyUpload, removeFile, PUBLIC_DIR } from '../middleware/upload.js';
import { badRequest, notFound, wrap } from '../utils/httpError.js';
import { idParams, optionalText, optionalDate, password } from '../utils/schemas.js';
import { profile, scholarshipCard } from '../utils/serializers.js';

const router = Router();
router.use(requireAuth);

/* ---------- پروفایل ---------- */
router.get('/profile', (req, res) => res.json({ profile: profile(req.user) }));

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'نام را وارد کنید.').max(60),
  lastName: z.string().trim().max(60).default(''),
  gender: z.preprocess((v) => (v === '' ? null : v), z.enum(['female', 'male']).nullable().optional()),
  birthPlace: optionalText(80),
  birthDate: optionalDate,
  fieldOfStudy: optionalText(120),
  university: optionalText(120),
  degreeLevel: z.preprocess((v) => (v === '' ? null : v), z.enum(['bachelor', 'master', 'phd']).nullable().optional()),
  graduationYear: z.preprocess(
    (v) => (v === '' || v === undefined ? null : Number(v)),
    z.number().int().min(1300).max(2100).nullable(),
  ),
  bio: optionalText(2000),
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().regex(/^[0-9۰-۹+\-\s()]{5,25}$/, 'شماره تماس معتبر نیست.').nullable().optional(),
  ),
  notifyPrefs: z.object({ deadlines: z.boolean(), events: z.boolean(), tips: z.boolean() }).optional(),
});

router.put(
  '/profile',
  validate({ body: profileSchema }),
  wrap(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `UPDATE users SET first_name=$1, last_name=$2, gender=$3, birth_place=$4, birth_date=$5,
         field_of_study=$6, university=$7, degree_level=$8, graduation_year=$9, bio=$10, phone=$11,
         notify_prefs = COALESCE($12::jsonb, notify_prefs), updated_at = now()
       WHERE id = $13 RETURNING *`,
      [
        b.firstName, b.lastName, b.gender ?? null, b.birthPlace ?? null, b.birthDate ?? null,
        b.fieldOfStudy ?? null, b.university ?? null, b.degreeLevel ?? null, b.graduationYear ?? null,
        b.bio ?? null, b.phone ?? null, b.notifyPrefs ? JSON.stringify(b.notifyPrefs) : null, req.user.id,
      ],
    );
    res.json({ profile: profile(rows[0]) });
  }),
);

router.post(
  '/avatar',
  avatarUpload.single('avatar'),
  wrap(async (req, res) => {
    if (!req.file) throw badRequest('تصویری انتخاب نشده است.');
    await verifyUpload(req.file);
    const old = req.user.avatar_path;
    const rel = `avatars/${req.file.filename}`;
    const { rows } = await query('UPDATE users SET avatar_path = $1, updated_at = now() WHERE id = $2 RETURNING *', [rel, req.user.id]);
    if (old) await removeFile(path.join(PUBLIC_DIR, old));
    res.json({ profile: profile(rows[0]) });
  }),
);

router.post(
  '/password',
  validate({ body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }) }),
  wrap(async (req, res) => {
    const ok = await bcrypt.compare(req.body.currentPassword, req.user.password_hash);
    if (!ok) throw badRequest('رمز عبور فعلی درست نیست.', { currentPassword: 'رمز عبور فعلی درست نیست.' });
    const hash = await bcrypt.hash(req.body.newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true });
  }),
);

/* ---------- ذخیره‌شده‌ها ---------- */
router.get(
  '/saved',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT s.*, TRUE AS saved FROM saved_scholarships ss
         JOIN scholarships s ON s.id = ss.scholarship_id AND s.status = 'published'
        WHERE ss.user_id = $1 ORDER BY ss.created_at DESC`,
      [req.user.id],
    );
    res.json({ items: rows.map(scholarshipCard) });
  }),
);

router.get(
  '/saved/ids',
  wrap(async (req, res) => {
    const { rows } = await query('SELECT scholarship_id FROM saved_scholarships WHERE user_id = $1', [req.user.id]);
    res.json({ ids: rows.map((r) => r.scholarship_id) });
  }),
);

router.put(
  '/saved/:id',
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const found = await query(`SELECT 1 FROM scholarships WHERE id = $1 AND status = 'published'`, [req.params.id]);
    if (!found.rowCount) throw notFound('بورسیه پیدا نشد.');
    await query('INSERT INTO saved_scholarships(user_id, scholarship_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
    res.json({ saved: true });
  }),
);

router.delete(
  '/saved/:id',
  validate({ params: idParams }),
  wrap(async (req, res) => {
    await query('DELETE FROM saved_scholarships WHERE user_id = $1 AND scholarship_id = $2', [req.user.id, req.params.id]);
    res.json({ saved: false });
  }),
);

/* ---------- درخواست‌ها ---------- */
router.get(
  '/applications',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT a.id, a.status, a.created_at, s.id AS scholarship_id, s.title, s.country, s.degree_levels
         FROM applications a JOIN scholarships s ON s.id = a.scholarship_id
        WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [req.user.id],
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id, status: r.status, createdAt: r.created_at,
        scholarship: { id: r.scholarship_id, title: r.title, country: r.country, degreeLevels: r.degree_levels },
      })),
    });
  }),
);

router.post(
  '/applications',
  validate({ body: z.object({ scholarshipId: z.coerce.number().int().positive() }) }),
  wrap(async (req, res) => {
    const found = await query(`SELECT 1 FROM scholarships WHERE id = $1 AND status = 'published'`, [req.body.scholarshipId]);
    if (!found.rowCount) throw notFound('بورسیه پیدا نشد.');
    const { rows } = await query(
      `INSERT INTO applications(user_id, scholarship_id) VALUES ($1,$2)
       ON CONFLICT (user_id, scholarship_id) DO UPDATE SET updated_at = now() RETURNING id, status`,
      [req.user.id, req.body.scholarshipId],
    );
    res.status(201).json({ application: rows[0] });
  }),
);

/* ---------- چک‌لیست ---------- */
const scopeParams = z.object({ scope: z.string().regex(/^[a-z0-9-]{1,40}$/) });

router.get(
  '/checklist/:scope',
  validate({ params: scopeParams }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT item, checked FROM user_checklist WHERE user_id = $1 AND scope = $2', [req.user.id, req.params.scope]);
    res.json({ checked: rows.filter((r) => r.checked).map((r) => r.item) });
  }),
);

router.put(
  '/checklist/:scope',
  validate({ params: scopeParams, body: z.object({ item: z.string().trim().min(1).max(200), checked: z.boolean() }) }),
  wrap(async (req, res) => {
    await query(
      `INSERT INTO user_checklist(user_id, scope, item, checked) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, scope, item) DO UPDATE SET checked = EXCLUDED.checked`,
      [req.user.id, req.params.scope, req.body.item, req.body.checked],
    );
    res.json({ ok: true });
  }),
);

/* ---------- داشبورد ---------- */
const PROFILE_FIELDS = ['first_name', 'last_name', 'gender', 'birth_place', 'birth_date', 'field_of_study', 'university', 'degree_level', 'graduation_year', 'bio', 'phone', 'avatar_path'];

router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const uid = req.user.id;
    const [saved, apps, docs, next, recentApps, savedItems] = await Promise.all([
      query('SELECT count(*)::int AS n FROM saved_scholarships WHERE user_id = $1', [uid]),
      query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status IN ('submitted','in_review'))::int AS pending FROM applications WHERE user_id = $1`, [uid]),
      query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'approved')::int AS approved FROM documents WHERE user_id = $1`, [uid]),
      query(
        `SELECT c.id, c.starts_at, c.duration_minutes, c.topic, c.meeting_url, u.first_name, u.last_name
           FROM consultations c JOIN users u ON u.id = c.consultant_id
          WHERE c.user_id = $1 AND c.status = 'booked' AND c.starts_at > now() - interval '30 minutes'
          ORDER BY c.starts_at LIMIT 1`,
        [uid],
      ),
      query(
        `SELECT a.id, a.status, s.id AS scholarship_id, s.title, s.country, s.degree_levels
           FROM applications a JOIN scholarships s ON s.id = a.scholarship_id
          WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT 5`,
        [uid],
      ),
      query(
        `SELECT s.*, TRUE AS saved FROM saved_scholarships ss JOIN scholarships s ON s.id = ss.scholarship_id AND s.status = 'published'
          WHERE ss.user_id = $1 ORDER BY ss.created_at DESC LIMIT 4`,
        [uid],
      ),
    ]);
    const filled = PROFILE_FIELDS.filter((f) => req.user[f] !== null && req.user[f] !== '').length;
    const n = next.rows[0];
    res.json({
      user: { name: `${req.user.first_name} ${req.user.last_name}`.trim(), avatarUrl: req.user.avatar_path ? `/uploads/${req.user.avatar_path}` : null },
      stats: {
        saved: saved.rows[0].n,
        applications: apps.rows[0].total,
        pendingApplications: apps.rows[0].pending,
        documents: docs.rows[0].total,
        approvedDocuments: docs.rows[0].approved,
        profileCompletion: Math.round((filled / PROFILE_FIELDS.length) * 100),
      },
      nextConsultation: n && {
        id: n.id, startsAt: n.starts_at, durationMinutes: n.duration_minutes, topic: n.topic,
        meetingUrl: n.meeting_url, consultantName: `${n.first_name} ${n.last_name}`.trim(),
      },
      applications: recentApps.rows.map((r) => ({
        id: r.id, status: r.status,
        scholarship: { id: r.scholarship_id, title: r.title, country: r.country, degreeLevels: r.degree_levels },
      })),
      savedItems: savedItems.rows.map(scholarshipCard),
    });
  }),
);

export default router;
