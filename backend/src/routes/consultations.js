import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { conflict, badRequest, notFound, wrap } from '../utils/httpError.js';
import { idParams, optionalText } from '../utils/schemas.js';
import { buildSlots } from '../utils/slots.js';

export const consultantsRouter = Router();
export const consultationsRouter = Router();

async function loadSlots(consultantId, days) {
  const [avail, booked] = await Promise.all([
    query('SELECT weekday, start_time::text, end_time::text, slot_minutes FROM consultant_availability WHERE consultant_id = $1', [consultantId]),
    query(`SELECT starts_at FROM consultations WHERE consultant_id = $1 AND status = 'booked' AND starts_at > now()`, [consultantId]),
  ]);
  return buildSlots(avail.rows, new Set(booked.rows.map((r) => new Date(r.starts_at).toISOString())), days);
}

consultantsRouter.get(
  '/',
  requireAuth,
  wrap(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, first_name, last_name, consult_specialty, consult_detail, avatar_path FROM users
        WHERE role = 'consultant' AND status = 'active' ORDER BY first_name`,
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        specialty: r.consult_specialty,
        detail: r.consult_detail,
        avatarUrl: r.avatar_path ? `/uploads/${r.avatar_path}` : null,
      })),
    });
  }),
);

consultantsRouter.get(
  '/:id/slots',
  requireAuth,
  validate({ params: idParams, query: z.object({ days: z.coerce.number().int().min(1).max(30).default(14) }) }),
  wrap(async (req, res) => {
    const c = await query(`SELECT 1 FROM users WHERE id = $1 AND role = 'consultant' AND status = 'active'`, [req.params.id]);
    if (!c.rowCount) throw notFound('مشاور پیدا نشد.');
    res.json({ days: await loadSlots(req.params.id, req.query.days) });
  }),
);

const dto = (r) => ({
  id: r.id,
  startsAt: r.starts_at,
  durationMinutes: r.duration_minutes,
  topic: r.topic,
  note: r.note,
  status: r.status,
  meetingUrl: r.meeting_url,
  consultant: { id: r.consultant_id, name: `${r.first_name} ${r.last_name}`.trim() },
});

consultationsRouter.use(requireAuth);

consultationsRouter.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT c.*, u.first_name, u.last_name FROM consultations c JOIN users u ON u.id = c.consultant_id
        WHERE c.user_id = $1 ORDER BY c.starts_at DESC LIMIT 100`,
      [req.user.id],
    );
    res.json({ items: rows.map(dto) });
  }),
);

consultationsRouter.post(
  '/',
  validate({
    body: z.object({
      consultantId: z.coerce.number().int().positive(),
      startsAt: z.string().datetime(),
      topic: optionalText(200),
      note: optionalText(1000),
    }),
  }),
  wrap(async (req, res) => {
    const { consultantId, startsAt, topic, note } = req.body;
    const startIso = new Date(startsAt).toISOString();

    const created = await tx(async (c) => {
      const cons = await c.query(`SELECT id FROM users WHERE id = $1 AND role = 'consultant' AND status = 'active'`, [consultantId]);
      if (!cons.rowCount) throw notFound('مشاور پیدا نشد.');

      // زمان باید دقیقاً یکی از اسلات‌های آزاد مشاور باشد
      const days = await loadSlots(consultantId, 30);
      const slot = days.flatMap((d) => d.times).find((t) => t.startsAt === startIso);
      if (!slot) throw badRequest('این زمان برای رزرو در دسترس نیست.');

      const clash = await c.query(
        `SELECT 1 FROM consultations WHERE user_id = $1 AND status = 'booked' AND starts_at = $2`,
        [req.user.id, startIso],
      );
      if (clash.rowCount) throw conflict('در همین زمان جلسه دیگری رزرو کرده‌اید.');

      try {
        const { rows } = await c.query(
          `INSERT INTO consultations(user_id, consultant_id, starts_at, duration_minutes, topic, note)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [req.user.id, consultantId, startIso, slot.durationMinutes, topic ?? null, note ?? null],
        );
        return rows[0].id;
      } catch (err) {
        if (err.code === '23505') throw conflict('این زمان همین الان رزرو شد. زمان دیگری انتخاب کنید.');
        throw err;
      }
    });

    const { rows } = await query(
      `SELECT c.*, u.first_name, u.last_name FROM consultations c JOIN users u ON u.id = c.consultant_id WHERE c.id = $1`,
      [created],
    );
    res.status(201).json({ consultation: dto(rows[0]) });
  }),
);

consultationsRouter.delete(
  '/:id',
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rowCount } = await query(
      `UPDATE consultations SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status = 'booked' AND starts_at > now()`,
      [req.params.id, req.user.id],
    );
    if (!rowCount) throw notFound('جلسه قابل لغو پیدا نشد.');
    res.json({ ok: true });
  }),
);
