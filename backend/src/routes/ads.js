import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { validate } from '../middleware/validate.js';
import { wrap } from '../utils/httpError.js';
import { adPublic } from '../utils/serializers.js';

const router = Router();

router.get(
  '/',
  validate({ query: z.object({ placement: z.enum(['home', 'scholarships', 'guide']) }) }),
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM ads
        WHERE placement = $1 AND status = 'active' AND visible
          AND (start_date IS NULL OR start_date <= CURRENT_DATE)
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        ORDER BY updated_at DESC LIMIT 3`,
      [req.query.placement],
    );
    res.json({ items: rows.map(adPublic) });
  }),
);

export default router;
