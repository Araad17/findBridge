import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { notFound, wrap } from '../utils/httpError.js';
import { idParams, pagination } from '../utils/schemas.js';
import { scholarshipCard, scholarshipDetail } from '../utils/serializers.js';

const router = Router();

const listQuery = pagination.extend({
  q: z.string().trim().max(100).optional(),
  country: z.string().trim().max(80).optional(),
  degree: z.enum(['bachelor', 'master', 'phd']).optional(),
  funding: z.enum(['full_funding', 'full_tuition', 'tuition_housing', 'stipend', 'partial_tuition']).optional(),
  language: z.enum(['required', 'none']).optional(),
  window: z.enum(['open', 'upcoming']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'deadline']).default('newest'),
});

// برای LIKE کاراکترهای ویژه را خنثی می‌کنیم
const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

router.get(
  '/',
  optionalAuth,
  validate({ query: listQuery }),
  wrap(async (req, res) => {
    const f = req.query;
    const where = [`s.status = 'published'`];
    const params = [];
    const add = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };

    if (f.q) {
      params.push(`%${likeEscape(f.q)}%`);
      const p = `$${params.length}`;
      where.push(`(s.title ILIKE ${p} OR s.country ILIKE ${p} OR s.field ILIKE ${p} OR s.provider ILIKE ${p} OR s.description ILIKE ${p})`);
    }
    if (f.country) add('s.country = ?', f.country);
    if (f.degree) add('? = ANY(s.degree_levels)', f.degree);
    if (f.funding) add('s.funding_type = ?', f.funding);
    if (f.language) add('s.language_required = ?', f.language === 'required');
    if (f.featured) add('s.featured = ?', f.featured === 'true');
    if (f.window === 'open') where.push('(s.deadline IS NULL OR s.deadline >= CURRENT_DATE) AND (s.start_date IS NULL OR s.start_date <= CURRENT_DATE)');
    if (f.window === 'upcoming') where.push('s.start_date > CURRENT_DATE');

    const order = f.sort === 'deadline'
      ? 'ORDER BY (s.deadline < CURRENT_DATE) NULLS LAST, s.deadline NULLS LAST, s.id DESC'
      : 'ORDER BY s.created_at DESC, s.id DESC';

    const whereSql = where.join(' AND ');
    const total = await query(`SELECT count(*)::int AS n FROM scholarships s WHERE ${whereSql}`, params);

    const listParams = [...params];
    let savedSelect = 'FALSE AS saved';
    if (req.user) {
      listParams.push(req.user.id);
      savedSelect = `EXISTS (SELECT 1 FROM saved_scholarships ss WHERE ss.scholarship_id = s.id AND ss.user_id = $${listParams.length}) AS saved`;
    }
    listParams.push(f.limit, (f.page - 1) * f.limit);
    const { rows } = await query(
      `SELECT s.*, ${savedSelect} FROM scholarships s WHERE ${whereSql} ${order}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    res.json({
      items: rows.map(scholarshipCard),
      page: f.page,
      limit: f.limit,
      total: total.rows[0].n,
      totalPages: Math.max(1, Math.ceil(total.rows[0].n / f.limit)),
    });
  }),
);

// گزینه‌های فیلتر بر اساس داده‌های منتشرشده
router.get(
  '/filters',
  wrap(async (_req, res) => {
    const [countries, degrees, funding] = await Promise.all([
      query(`SELECT DISTINCT country FROM scholarships WHERE status = 'published' AND country <> '' ORDER BY country`),
      query(`SELECT DISTINCT unnest(degree_levels) AS d FROM scholarships WHERE status = 'published'`),
      query(`SELECT DISTINCT funding_type FROM scholarships WHERE status = 'published' AND funding_type IS NOT NULL`),
    ]);
    res.json({
      countries: countries.rows.map((r) => r.country),
      degrees: degrees.rows.map((r) => r.d),
      fundingTypes: funding.rows.map((r) => r.funding_type),
    });
  }),
);

router.get(
  '/:id',
  optionalAuth,
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT s.*, ${req.user ? `EXISTS (SELECT 1 FROM saved_scholarships ss WHERE ss.scholarship_id = s.id AND ss.user_id = $2)` : 'FALSE'} AS saved
         FROM scholarships s WHERE s.id = $1 AND s.status = 'published'`,
      req.user ? [req.params.id, req.user.id] : [req.params.id],
    );
    if (!rows[0]) throw notFound('بورسیه پیدا نشد.');
    res.json({ scholarship: { ...scholarshipDetail(rows[0]), saved: rows[0].saved } });
  }),
);

export default router;
