import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { referralCode } from './utils/crypto.js';

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function upsertUser({ name, email, password, role, status = 'active', extra = {} }) {
  const exist = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exist.rows[0]) return exist.rows[0].id;
  const [first, ...rest] = name.split(' ');
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users(first_name, last_name, email, email_verified, password_hash, role, status, referral_code, consult_specialty, consult_detail,
       gender, birth_place, field_of_study, university, degree_level, graduation_year)
     VALUES ($1,$2,$3,TRUE,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [first, rest.join(' '), email, hash, role, status, referralCode(), extra.specialty ?? null, extra.detail ?? null,
      extra.gender ?? null, extra.birthPlace ?? null, extra.field ?? null, extra.university ?? null, extra.degree ?? null, extra.gradYear ?? null],
  );
  return rows[0].id;
}

await migrate();

const adminId = await upsertUser({ name: 'مدیر سامانه', email: config.adminEmail, password: config.adminPassword, role: 'admin' });
await upsertUser({ name: 'مریم احمدی', email: 'expert@example.com', password: 'Expert12345', role: 'expert' });

const consultants = [
  { name: 'زهرا احمدی', email: 'zahra.ahmadi@example.com', specialty: 'مشاور تحصیلی و مهاجرتی', detail: 'مشاوره اپلای و برنامه‌ریزی مهاجرت تحصیلی' },
  { name: 'احمد خوری', email: 'ahmad.khoori@example.com', specialty: 'مشاور انتخاب رشته و برنامه‌ریزی تحصیلی', detail: 'مشاوره تخصصی اپلای و بورسیه‌های اروپایی' },
];
for (const c of consultants) {
  const cid = await upsertUser({ name: c.name, email: c.email, password: 'Consult12345', role: 'consultant', extra: c });
  const has = await query('SELECT 1 FROM consultant_availability WHERE consultant_id = $1', [cid]);
  if (!has.rowCount) {
    for (const weekday of [6, 0, 1, 3]) {
      await query(`INSERT INTO consultant_availability(consultant_id, weekday, start_time, end_time, slot_minutes) VALUES ($1,$2,'14:00','17:00',30)`, [cid, weekday]);
    }
  }
}

if (!config.isProd) {
  await upsertUser({
    name: 'فاطمه رحیمی', email: 'fatima.rahimi@example.com', password: 'Demo12345', role: 'applicant',
    extra: { gender: 'female', birthPlace: 'تهران', field: 'علوم کامپیوتر', university: 'دانشگاه تهران', degree: 'master', gradYear: 1404 },
  });
}

const scholarships = [
  { title: 'بورسیه دانشگاه آلتو', provider: 'دانشگاه آلتو', country: 'فنلاند', field: 'مهندسی و فناوری', degrees: ['master'], funding: 'full_funding', badge: 'پیشنهاد ویژه', featured: true,
    description: 'فرصتی برای تحصیل در یکی از دانشگاه‌های پیشرو اروپا با حمایت تحصیلی.', eligibility: 'لیسانس مرتبط با رشته و مدرک زبان انگلیسی.', fundingDetails: 'شهریه کامل و کمک‌هزینه زندگی ماهانه.', language: true, deadline: day(35), start: day(-30), docs: ['گذرنامه معتبر', 'مدارک تحصیلی و ریزنمرات', 'رزومه تحصیلی', 'انگیزه‌نامه', 'توصیه‌نامه'] },
  { title: 'بورسیه تحصیلی ترکیه', provider: 'دولت ترکیه', country: 'ترکیه', field: 'تمامی رشته‌ها', degrees: ['bachelor', 'master', 'phd'], funding: 'tuition_housing', badge: 'پوشش کامل', featured: true,
    description: 'فرصت تحصیل در دانشگاه‌های معتبر ترکیه با امکان دریافت بورسیه کامل.', eligibility: 'اتباع خارجی با معدل مناسب.', fundingDetails: 'شهریه، خوابگاه و کمک‌هزینه ماهانه.', language: false, deadline: day(20), start: day(-60), docs: ['گذرنامه معتبر', 'مدارک تحصیلی و ریزنمرات', 'انگیزه‌نامه'] },
  { title: 'بورسیه دانشگاه ملبورن', provider: 'دانشگاه ملبورن', country: 'استرالیا', field: 'علوم و مدیریت', degrees: ['master'], funding: 'stipend', badge: 'پیشنهاد ویژه', featured: false,
    description: 'برای دانشجویان بین‌المللی علاقه‌مند به ادامه تحصیل در استرالیا.', language: true, deadline: day(60), start: day(-10), docs: ['گذرنامه معتبر', 'رزومه تحصیلی'] },
  { title: 'بورسیه دانشگاه آفتاب', provider: 'دانشگاه آفتاب', country: 'افغانستان', field: 'علوم انسانی', degrees: ['master'], funding: 'full_tuition', badge: 'کمک‌هزینه کامل', featured: false,
    description: 'حمایت از دانشجویان مستعد برای ادامه تحصیل در رشته‌های مختلف.', language: false, deadline: day(75), start: day(-5), docs: ['مدارک تحصیلی و ریزنمرات'] },
  { title: 'بورسیه ماستری دانمارک', provider: 'دانشگاه‌های دانمارک', country: 'دانمارک', field: 'مدیریت', degrees: ['master'], funding: 'full_funding', badge: 'پیشنهاد ویژه', featured: true,
    description: 'فرصتی برای تحصیل در دانشگاه‌های معتبر دانمارک با حمایت تحصیلی.', language: true, deadline: day(28), start: day(-20), docs: ['گذرنامه معتبر', 'انگیزه‌نامه', 'توصیه‌نامه'] },
  { title: 'اراسموس موندوس', provider: 'کمیسیون اروپا', country: 'اروپا', field: 'رشته‌های مختلف', degrees: ['master'], funding: 'stipend', badge: 'پیشنهاد ویژه', featured: false,
    description: 'فرصتی برای تحصیل در دانشگاه‌های معتبر اروپا و تجربه‌ای تازه.', language: true, deadline: day(90), start: day(-15), docs: ['گذرنامه معتبر', 'رزومه تحصیلی', 'توصیه‌نامه'] },
  { title: 'فرصت پژوهشی ژاپن', provider: 'MEXT', country: 'ژاپن', field: 'پژوهش', degrees: ['phd'], funding: 'full_funding', badge: null, featured: false, status: 'draft',
    description: 'فرصت پژوهشی دکتری (پیش‌نویس).', language: true, deadline: null, start: null, docs: [] },
];

for (const s of scholarships) {
  const exist = await query('SELECT 1 FROM scholarships WHERE title = $1', [s.title]);
  if (exist.rowCount) continue;
  const status = s.status || 'published';
  await query(
    `INSERT INTO scholarships(title, provider, country, field, degree_levels, funding_type, funding_details, badge, description, eligibility,
       language_required, required_documents, start_date, deadline, source_url, application_url, last_verified_at, featured, status, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)`,
    [s.title, s.provider, s.country, s.field, s.degrees, s.funding, s.fundingDetails ?? null, s.badge, s.description, s.eligibility ?? null,
      s.language, s.docs, s.start, s.deadline, status === 'published' ? 'https://example.com/source' : null,
      status === 'published' ? 'https://example.com/apply' : null, status === 'published' ? day(0) : null, s.featured, status, adminId],
  );
}

const ads = [
  { title: 'آماده‌اید برای قدم بعدی؟', subtitle: 'مسیر خود را پیدا کنید', description: 'فرصتی برای آشنایی با مسیرهای تحصیلی و انتخاب مناسب‌ترین فرصت.', destination: 'https://example.com', placement: 'home', status: 'active' },
  { title: 'کارگاه انگیزه‌نامه – رایگان', subtitle: 'ثبت‌نام در کارگاه', description: 'با اصول نوشتن انگیزه‌نامه آشنا شوید.', destination: 'https://example.com/workshop', placement: 'scholarships', status: 'draft' },
];
for (const a of ads) {
  const exist = await query('SELECT 1 FROM ads WHERE title = $1', [a.title]);
  if (exist.rowCount) continue;
  await query(
    `INSERT INTO ads(title, subtitle, description, destination, placement, status, start_date, end_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [a.title, a.subtitle, a.description, a.destination, a.placement, a.status, day(-1), day(60)],
  );
}

console.log('seed done.');
console.log(`  admin:     ${config.adminEmail} / ${config.adminPassword}`);
if (!config.isProd) {
  console.log('  expert:    expert@example.com / Expert12345');
  console.log('  applicant: fatima.rahimi@example.com / Demo12345');
}
await pool.end();
