const persianDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
	year: "numeric",
	month: "long",
	day: "numeric",
});
const persianDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
	year: "numeric",
	month: "long",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});
const persianWeekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long" });
const persianDayMonth = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long" });
const number = new Intl.NumberFormat("fa-IR");

// رشته YYYY-MM-DD را بدون جابه‌جایی منطقه زمانی به تاریخ محلی تبدیل می‌کند
function parseDateOnly(value: string): Date {
	const [y, m, d] = value.slice(0, 10).split("-").map(Number);
	return new Date(y, m - 1, d, 12);
}

export const formatDate = (value?: string | null, fallback = "—") =>
	value ? persianDate.format(parseDateOnly(value)) : fallback;

export const formatDateTime = (value?: string | null, fallback = "—") =>
	value ? persianDateTime.format(new Date(value)) : fallback;

export const formatWeekday = (value: string) => persianWeekday.format(parseDateOnly(value));
export const formatDayMonth = (value: string) => persianDayMonth.format(parseDateOnly(value));
export const formatNumber = (value: number) => number.format(value);

export function formatBytes(bytes: number) {
	if (bytes < 1024 * 1024) return `${number.format(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
	return `${number.format(Math.round((bytes / 1024 / 1024) * 10) / 10)} مگابایت`;
}

export const isPastDate = (value?: string | null) => {
	if (!value) return false;
	const today = new Date();
	const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	return value.slice(0, 10) < todayKey;
};

export const todayInput = () => new Date().toISOString().slice(0, 10);
