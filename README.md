# بورسیه‌یار — فرانت (React + Vite) و بک‌اند (Node.js + Express + PostgreSQL)

## ساختار
- `frontend/` رابط کاربری (همان طراحی پروژه اولیه؛ حالا به API وصل است)
- `backend/` سرویس REST با Express، PostgreSQL، احراز هویت JWT در کوکی httpOnly

## راه‌اندازی سریع

### ۱) پایگاه‌داده
```bash
cd backend
docker compose up -d          # یا یک PostgreSQL 14+ دلخواه و تنظیم DATABASE_URL
cp .env.example .env          # JWT_SECRET را حتماً عوض کنید
npm install
npm run seed                  # اجرای migration + داده‌های اولیه
npm run dev                   # http://localhost:4000
```
`npm start` هم خودکار migration های جدید را اجرا می‌کند.

### ۲) فرانت
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173  (درخواست‌های /api به بک‌اند پروکسی می‌شوند)
```

### حساب‌های seed (فقط توسعه)
| نقش | ایمیل | رمز |
|---|---|---|
| مدیر | `ADMIN_EMAIL` در `.env` (پیش‌فرض admin@example.com) | `ADMIN_PASSWORD` (پیش‌فرض Admin12345) |
| کارشناس | expert@example.com | Expert12345 |
| متقاضی | fatima.rahimi@example.com | Demo12345 |
| مشاوران | zahra.ahmadi@example.com / ahmad.khoori@example.com | Consult12345 |

ورود مدیر: در صفحه ورود گزینه «ورود مدیر» را انتخاب کنید.

## قابلیت‌ها
- ثبت‌نام/ورود/خروج، «مرا به خاطر بسپار»، بازیابی رمز (لینک به ایمیل؛ بدون SMTP در لاگ سرور چاپ می‌شود)
- فهرست بورسیه با جستجو، فیلتر (کشور، مقطع، نوع، زبان، وضعیت پذیرش)، مرتب‌سازی و صفحه‌بندی
- جزئیات بورسیه، ذخیره، ثبت درخواست، چک‌لیست مدارک (ذخیره‌شده در حساب)
- داشبورد کاربر، پروفایل (تصویر، تغییر رمز)، اسناد (آپلود امن/مشاهده/حذف)، رزرو مشاوره با زمان‌های آزاد واقعی، دعوت دوستان
- پنل مدیریت: آمار، CRUD بورسیه (پیش‌نویس/انتشار/بایگانی)، کاربران و نقش‌ها، بررسی اسناد، تبلیغات با تصویر
- نقش `expert` به بورسیه‌ها و تبلیغات دسترسی دارد؛ بخش کاربران فقط `admin`

## نکات امنیتی
- رمزها با bcrypt؛ توکن در کوکی httpOnly + SameSite=Lax (در production با `secure`، نیاز به HTTPS)
- بررسی Origin برای درخواست‌های تغییردهنده، helmet، rate-limit روی مسیرهای auth
- اسناد کاربران خارج از پوشه عمومی ذخیره و فقط از مسیر احراز‌هویت‌شده ارائه می‌شوند؛ محتوای فایل با امضای واقعی (magic bytes) کنترل می‌شود
- همه ورودی‌ها با zod اعتبارسنجی و کوئری‌ها پارامتری هستند

## مسیرهای API (خلاصه)
`/api/auth/*` · `/api/me/*` (profile, avatar, password, saved, applications, checklist, dashboard) · `/api/scholarships` · `/api/ads` · `/api/documents` · `/api/consultants` · `/api/consultations` · `/api/referrals` · `/api/admin/*`

## استقرار
- فرانت: `npm run build` و سرو فایل‌های `dist` پشت همان دامنه‌ای که `/api` و `/uploads` را به بک‌اند پروکسی می‌کند (nginx)
- بک‌اند: `NODE_ENV=production`، `JWT_SECRET` طولانی، `CLIENT_URL` برابر دامنه فرانت، `DATABASE_URL`
