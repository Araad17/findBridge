import { Router } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { documentUpload, verifyUpload, removeFile, PRIVATE_DIR } from '../middleware/upload.js';
import { badRequest, notFound, wrap } from '../utils/httpError.js';
import { idParams } from '../utils/schemas.js';

const router = Router();
router.use(requireAuth);

export const documentDto = (d) => ({
  id: d.id,
  name: d.name,
  originalName: d.original_name,
  mimeType: d.mime_type,
  sizeBytes: d.size_bytes,
  status: d.status,
  createdAt: d.created_at,
});

// سقف فضای ذخیره‌سازی هر کاربر
const USER_QUOTA_BYTES = 100 * 1024 * 1024;

router.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    const used = rows.reduce((sum, r) => sum + Number(r.size_bytes), 0);
    res.json({
      items: rows.map(documentDto),
      usage: {
        usedBytes: used,
        quotaBytes: USER_QUOTA_BYTES,
        total: rows.length,
        approved: rows.filter((r) => r.status === 'approved').length,
        needsAttention: rows.filter((r) => ['pending', 'rejected'].includes(r.status)).length,
      },
    });
  }),
);

router.post(
  '/',
  documentUpload.single('file'),
  wrap(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('فایلی انتخاب نشده است.');
    try {
      await verifyUpload(file);
      const name = z.string().trim().min(1).max(120).parse(req.body.name || path.parse(file.originalname).name || 'سند');
      const used = await query('SELECT COALESCE(sum(size_bytes),0)::bigint AS n FROM documents WHERE user_id = $1', [req.user.id]);
      if (Number(used.rows[0].n) + file.size > USER_QUOTA_BYTES) throw badRequest('فضای ذخیره‌سازی شما پر شده است.');
      const original = Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 200);
      const { rows } = await query(
        `INSERT INTO documents(user_id, name, file_path, original_name, mime_type, size_bytes, status)
         VALUES ($1,$2,$3,$4,$5,$6,'in_review') RETURNING *`,
        [req.user.id, name, file.filename, original, file.mimetype, file.size],
      );
      res.status(201).json({ document: documentDto(rows[0]) });
    } catch (err) {
      await removeFile(file.path);
      throw err;
    }
  }),
);

router.get(
  '/:id/download',
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) throw notFound('سند پیدا نشد.');
    sendDocument(res, rows[0]);
  }),
);

router.delete(
  '/:id',
  validate({ params: idParams }),
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING file_path', [req.params.id, req.user.id]);
    if (!rows[0]) throw notFound('سند پیدا نشد.');
    await removeFile(path.join(PRIVATE_DIR, 'documents', rows[0].file_path));
    res.json({ ok: true });
  }),
);

export function sendDocument(res, doc) {
  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.original_name || doc.name)}`);
  res.sendFile(path.basename(doc.file_path), { root: path.join(PRIVATE_DIR, 'documents') }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'فایل پیدا نشد.' });
  });
}

export default router;
