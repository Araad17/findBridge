import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;
if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

/** اگر SMTP تنظیم نشده باشد، متن ایمیل فقط در لاگ سرور چاپ می‌شود (مناسب توسعه). */
export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    console.log(`\n[mail:dev] to=${to}\nsubject=${subject}\n${text}\n`);
    return { delivered: false };
  }
  await transporter.sendMail({ from: config.mailFrom, to, subject, text });
  return { delivered: true };
}
