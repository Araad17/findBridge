import { config } from '../config.js';

const pad = (n) => String(n).padStart(2, '0');
const MIN_LEAD_MS = 60 * 60 * 1000; // حداقل یک ساعت قبل از شروع

/**
 * اسلات‌های آزاد یک مشاور را برای چند روز آینده می‌سازد.
 * availability: ردیف‌های consultant_availability (start_time مثل "14:00:00")
 * booked: مجموعه‌ای از ISO رشته‌های زمان‌های رزروشده
 */
export function buildSlots(availability, booked, days = 14, now = new Date()) {
  const offsetMs = config.tzOffsetMinutes * 60 * 1000;
  const localNow = new Date(now.getTime() + offsetMs);
  const result = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + i));
    const weekday = day.getUTCDay();
    const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
    const times = [];
    for (const a of availability.filter((x) => x.weekday === weekday)) {
      const [sh, sm] = a.start_time.split(':').map(Number);
      const [eh, em] = a.end_time.split(':').map(Number);
      const endMin = eh * 60 + em;
      for (let m = sh * 60 + sm; m + a.slot_minutes <= endMin; m += a.slot_minutes) {
        const startsAtMs = day.getTime() + m * 60 * 1000 - offsetMs;
        if (startsAtMs < now.getTime() + MIN_LEAD_MS) continue;
        const iso = new Date(startsAtMs).toISOString();
        if (booked.has(iso)) continue;
        times.push({ startsAt: iso, label: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, durationMinutes: a.slot_minutes });
      }
    }
    if (times.length) {
      times.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      result.push({ date, weekday, times });
    }
  }
  return result;
}
