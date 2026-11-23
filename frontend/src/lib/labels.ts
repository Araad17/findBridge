// برچسب‌های فارسی برای مقادیر انگلیسی ذخیره‌شده در پایگاه‌داده

export const degreeLabels: Record<string, string> = {
	bachelor: "کارشناسی",
	master: "کارشناسی ارشد",
	phd: "دکتری",
};

export const fundingLabels: Record<string, string> = {
	full_funding: "کمک‌هزینه کامل",
	full_tuition: "شهریه کامل",
	tuition_housing: "شهریه + خوابگاه",
	stipend: "کمک‌هزینه تحصیلی",
	partial_tuition: "بخشی از شهریه",
};

export const scholarshipStatusLabels: Record<string, string> = {
	published: "منتشرشده",
	draft: "پیش‌نویس",
	archived: "بایگانی",
};

export const roleLabels: Record<string, string> = {
	applicant: "متقاضی",
	consultant: "مشاور",
	admin: "مدیر",
	expert: "کارشناس",
};

export const userStatusLabels: Record<string, string> = {
	active: "فعال",
	pending: "در انتظار تایید",
	blocked: "مسدود",
};

export const adStatusLabels: Record<string, string> = {
	active: "فعال",
	draft: "پیش‌نویس",
	ended: "پایان‌یافته",
};

export const placementLabels: Record<string, string> = {
	home: "صفحه اصلی",
	scholarships: "صفحه بورسیه",
	guide: "صفحه راهنما",
};

export const applicationStatusLabels: Record<string, string> = {
	submitted: "ارسال‌شده",
	in_review: "در حال بررسی",
	returned: "برگشت داده شد",
	accepted: "پذیرفته شد",
	rejected: "رد شد",
};

export const documentStatusLabels: Record<string, string> = {
	pending: "در انتظار",
	in_review: "در حال بررسی",
	approved: "تأیید شده",
	rejected: "رد شده",
};

export const activityLabels: Record<string, string> = {
	"scholarship.create": "ایجاد بورسیه",
	"scholarship.update": "ویرایش بورسیه",
	"scholarship.archive": "بایگانی بورسیه",
	"scholarship.delete": "حذف بورسیه",
	"user.create": "ایجاد کاربر",
	"user.update": "ویرایش کاربر",
	"user.delete": "حذف کاربر",
	"user.email_verification": "ارسال پیوند تایید ایمیل",
	"user.password_reset": "ارسال پیوند بازنشانی رمز",
	"user.document_view": "مشاهده سند کاربر",
	"user.document_review": "بررسی سند کاربر",
	"ad.create": "ایجاد تبلیغ",
	"ad.update": "ویرایش تبلیغ",
	"ad.delete": "حذف تبلیغ",
};

export const degreesText = (levels: string[]) =>
	levels.length === 0
		? "—"
		: levels.length > 2
			? "چند مقطع"
			: levels.map((level) => degreeLabels[level] ?? level).join("، ");
