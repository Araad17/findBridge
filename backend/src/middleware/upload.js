import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { randomToken } from '../utils/crypto.js';
import { badRequest } from '../utils/httpError.js';

export const PUBLIC_DIR = path.join(config.uploadDir, 'public');
export const PRIVATE_DIR = path.join(config.uploadDir, 'private');
for (const dir of ['avatars', 'ads'].map((d) => path.join(PUBLIC_DIR, d)).concat(path.join(PRIVATE_DIR, 'documents'))) {
  fs.mkdirSync(dir, { recursive: true });
}

const MIME_EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function makeUploader(destDir, allowedMimes) {
  return multer({
    storage: multer.diskStorage({
      destination: destDir,
      // نام فایل کاربر هرگز در مسیر دیسک استفاده نمی‌شود
      filename: (_req, file, cb) => cb(null, randomToken(16) + (MIME_EXT[file.mimetype] || '')),
    }),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
    fileFilter: (_req, file, cb) =>
      allowedMimes.includes(file.mimetype) ? cb(null, true) : cb(badRequest('فرمت فایل مجاز نیست.')),
  });
}

export const documentUpload = makeUploader(path.join(PRIVATE_DIR, 'documents'), ['application/pdf', 'image/jpeg', 'image/png']);
export const avatarUpload = makeUploader(path.join(PUBLIC_DIR, 'avatars'), ['image/jpeg', 'image/png', 'image/webp']);
export const adImageUpload = makeUploader(path.join(PUBLIC_DIR, 'ads'), ['image/jpeg', 'image/png', 'image/webp']);

const SIGNATURES = {
  'application/pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(1, 4).toString('latin1') === 'PNG',
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

/** محتوای واقعی فایل را با نوع اعلام‌شده تطبیق می‌دهد؛ در صورت مغایرت فایل حذف می‌شود. */
export async function verifyUpload(file) {
  const fh = await fsp.open(file.path, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    if (!SIGNATURES[file.mimetype]?.(buf)) {
      await fsp.unlink(file.path).catch(() => {});
      throw badRequest('محتوای فایل با فرمت آن مطابقت ندارد.');
    }
  } finally {
    await fh.close();
  }
}

export const removeFile = (absPath) => fsp.unlink(absPath).catch(() => {});
