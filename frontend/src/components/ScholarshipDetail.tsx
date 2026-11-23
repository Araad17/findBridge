import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useAuth } from "../lib/auth";
import { api, errorMessage } from "../lib/api";
import { degreesText, fundingLabels } from "../lib/labels";
import { formatDate, isPastDate } from "../lib/format";
import type { ScholarshipDetailData } from "../types/scholarships";

const defaultDocuments = ["گذرنامه معتبر", "مدارک تحصیلی و ریزنمرات", "رزومه تحصیلی", "انگیزه‌نامه", "توصیه‌نامه"];

export default function ScholarshipDetail({
	scholarshipId,
	isSaved,
	onToggleSave,
	onHome,
	onBack,
	onDocuments,
	onLoginRequired,
}: {
	scholarshipId: number;
	isSaved: boolean;
	onToggleSave: () => void;
	onHome: () => void;
	onBack: () => void;
	onDocuments: () => void;
	onLoginRequired: () => void;
}) {
	const { user } = useAuth();
	const [scholarship, setScholarship] = useState<ScholarshipDetailData | null>(null);
	const [error, setError] = useState("");
	const [checkedDocuments, setCheckedDocuments] = useState<string[]>([]);
	const [applyMessage, setApplyMessage] = useState("");

	useEffect(() => {
		let active = true;
		setScholarship(null);
		setError("");
		api<{ scholarship: ScholarshipDetailData }>(`/scholarships/${scholarshipId}`)
			.then((data) => active && setScholarship(data.scholarship))
			.catch((err) => active && setError(errorMessage(err)));
		return () => {
			active = false;
		};
	}, [scholarshipId]);

	const scope = `scholarship-${scholarshipId}`;
	useEffect(() => {
		if (!user) {
			setCheckedDocuments([]);
			return;
		}
		api<{ checked: string[] }>(`/me/checklist/${scope}`)
			.then((data) => setCheckedDocuments(data.checked))
			.catch(() => undefined);
	}, [user, scope]);

	if (error || !scholarship) {
		return (
			<main className="mx-auto max-w-6xl px-5 py-16 text-center text-xs text-[#81908a]">
				{error || "در حال بارگذاری..."}
				{error && (
					<div>
						<button className="mt-4 text-forest underline" onClick={onBack} type="button">
							بازگشت به فهرست بورسیه‌ها
						</button>
					</div>
				)}
			</main>
		);
	}

	const documents = scholarship.requiredDocuments.length ? scholarship.requiredDocuments : defaultDocuments;
	const expired = isPastDate(scholarship.deadline);
	const benefits = [
		scholarship.fundingType ? fundingLabels[scholarship.fundingType] : null,
		scholarship.fundingDetails,
	].filter((item): item is string => Boolean(item));

	const toggleDocument = (document: string) => {
		const checked = !checkedDocuments.includes(document);
		setCheckedDocuments((current) => (checked ? [...current, document] : current.filter((item) => item !== document)));
		if (user) {
			api(`/me/checklist/${scope}`, { method: "PUT", body: { item: document, checked } }).catch(() => undefined);
		}
	};

	const apply = async () => {
		if (!scholarship.applicationUrl) {
			setApplyMessage("پیوند درخواست هنوز ثبت نشده است.");
			return;
		}
		// پیش از خروج به سایت اصلی، ثبت درخواست را در حساب کاربر نگه می‌داریم
		window.open(scholarship.applicationUrl, "_blank", "noopener,noreferrer");
		if (!user) {
			setApplyMessage("برای پیگیری درخواست‌هایتان در بورسیه‌یار وارد حساب خود شوید.");
			return;
		}
		try {
			await api("/me/applications", { method: "POST", body: { scholarshipId } });
			setApplyMessage("این درخواست در بخش «درخواست‌های من» ثبت شد.");
		} catch (err) {
			setApplyMessage(errorMessage(err));
		}
	};

	return (
		<main className="mx-auto max-w-6xl px-5 pb-6 pt-3 lg:px-8">
			<div className="mb-3 text-[7px] text-[#89958f]">
				<button className="hover:text-forest" onClick={onHome} type="button">
					خانه
				</button>
				<span className="mx-1.5">/</span>
				<button className="hover:text-forest" onClick={onBack} type="button">
					بورسیه‌ها
				</button>
				<span className="mx-1.5">/</span>
				{scholarship.title}
			</div>

			<div className="mb-3 flex items-center gap-2 rounded-md bg-sand px-2.5 py-1.5 text-[7px] leading-4 text-[#826a37]">
				<span className="grid h-3 w-3 shrink-0 place-items-center rounded-full border border-[#b39b61] text-[7px]">
					!
				</span>
				<p>
					اطلاعات این فرصت را با دقت بررسی کنید و پیش از ارسال درخواست، شرایط
					لازم را آماده سازید.
				</p>
			</div>

			<section className="mb-3 grid items-center gap-3 rounded-lg border border-[#e8ece8] bg-white px-3 py-2 min-[520px]:grid-cols-[minmax(0,2.4fr)_minmax(0,0.4fr)]">
				<div>
					<div className="mb-1.5 flex flex-wrap gap-1">
						<span className="rounded-full bg-[#fbf2dc] px-2 py-0.5 text-[7px] font-semibold text-[#9b7a34]">
							اطلاعات فرصت
						</span>
						<span className="rounded-full bg-[#eaf3ef] px-2 py-0.5 text-[7px] font-semibold text-[#47806f]">
							{scholarship.badge ?? (scholarship.fundingType ? fundingLabels[scholarship.fundingType] : "بورسیه")}
						</span>
					</div>
					<h1 className="text-lg font-extrabold leading-7 text-ink sm:text-xl">
						{scholarship.title}
					</h1>
					<p className="mt-1 text-[7px] text-[#89958f]">
						{scholarship.country}
						<span className="mx-1.5">•</span>
						{degreesText(scholarship.degreeLevels)}
						<span className="mx-1.5">•</span>
						{scholarship.field ?? "—"}
					</p>
				</div>
				<div className="grid h-12 w-12 place-items-center justify-self-end rounded-lg bg-[#eaf3ef] text-xs font-extrabold text-forest min-[520px]:h-12 min-[520px]:w-12">
					{scholarship.country.slice(0, 3)}
				</div>
			</section>

			<div className="grid items-start gap-2.5 min-[520px]:grid-cols-[minmax(0,2.7fr)_minmax(0,1fr)]">
				<div className="space-y-2.5">
					<section className="rounded-lg border border-[#e8ece8] bg-white px-3 py-2.5">
						<h2 className="mb-1.5 text-[9px] font-bold text-ink">
							درباره این فرصت
						</h2>
						<p className="text-[7px] leading-4 text-[#72827d]">
							{scholarship.description}
						</p>
						{scholarship.requirements && (
							<p className="mt-1.5 whitespace-pre-line text-[7px] leading-4 text-[#72827d]">
								{scholarship.requirements}
							</p>
						)}
						<p className="mt-1.5 text-[6px] text-[#98a49e]">
							کشور مقصد: {scholarship.country}
							<span className="mx-1.5">•</span>مقطع: {degreesText(scholarship.degreeLevels)}
						</p>
					</section>

					<section className="rounded-lg border border-[#e8ece8] bg-white px-3 py-2.5">
						<h2 className="mb-1.5 text-[9px] font-bold text-ink">
							چه کسانی می‌توانند درخواست دهند؟
						</h2>
						<p className="text-[7px] leading-4 text-[#72827d]">
							{scholarship.eligibility ??
								"متقاضیان باید سوابق تحصیلی مرتبط، انگیزه‌نامه و مدارک موردنیاز را آماده داشته باشند. شرایط دقیق پذیرش را پیش از ثبت درخواست بررسی کنید."}
						</p>
						<div className="mt-2 flex items-center gap-1.5 rounded-md bg-sand px-2 py-1.5 text-[6px] leading-3 text-[#826a37]">
							<span className="grid h-3 w-3 shrink-0 place-items-center rounded-full border border-[#b39b61]">
								!
							</span>
							<span>
								تکمیل مدارک و رعایت زمان‌بندی، شانس بررسی درخواست شما را افزایش
								می‌دهد.
							</span>
						</div>
					</section>

					<section className="rounded-lg border border-[#e8ece8] bg-white px-3 py-2.5">
						<h2 className="mb-2 text-[9px] font-bold text-ink">
							پوشش مالی چه چیزهایی را شامل می‌شود؟
						</h2>
						<div className="flex flex-wrap gap-1.5">
							{(benefits.length ? benefits : ["جزئیات پوشش مالی در منبع رسمی اعلام می‌شود"]).map((benefit) => (
								<span
									className="rounded-full bg-[#eaf3ef] px-2 py-1 text-[6px] font-semibold text-[#47806f]"
									key={benefit}
								>
									{benefit}
								</span>
							))}
						</div>
						<p className="mt-2 text-[7px] leading-4 text-[#89958f]">
							میزان و شرایط حمایت مالی ممکن است بر اساس دانشگاه و وضعیت متقاضی
							متفاوت باشد.
						</p>
					</section>

					<section className="flex items-center justify-between gap-3 rounded-lg border border-[#f1e4c4] bg-sand px-3 py-2">
						<Icon name="book" className="h-5 w-5 shrink-0 text-forest" />
						<div>
							<p className="text-[6px] text-[#99814b]">
								هنوز مطمئن نیستید از کجا شروع کنید؟
							</p>
							<h2 className="mt-0.5 text-[8px] font-bold text-ink">
								یک قدم نزدیک‌تر به رؤیای تحصیلی‌تان
							</h2>
							<p className="mt-0.5 text-[6px] text-[#82908a]">
								با راهنمایی مناسب، مسیر درخواست را با اطمینان طی کنید.
							</p>
						</div>
						<button
							className="shrink-0 rounded-md bg-white px-2 py-1.5 text-[6px] font-semibold text-forest shadow-sm"
							type="button"
						>
							بیشتر بدانید
						</button>
					</section>

					<section className="rounded-lg border border-[#e8ece8] bg-white px-3 py-2.5">
						<h2 className="mb-1.5 text-[9px] font-bold text-ink">
							مراحل درخواست
						</h2>
						<p className="text-[7px] leading-4 text-[#72827d]">
							ابتدا شرایط پذیرش را بررسی کنید، مدارک را آماده سازید و درخواست
							خود را پیش از پایان مهلت ارسال کنید.
						</p>
						<div className="mt-2 border-t border-[#edf0ed] pt-2">
							<h3 className="text-[7px] font-semibold text-ink">
								آیا می‌توانم برای چند فرصت درخواست دهم؟
							</h3>
							<p className="mt-1 text-[6px] leading-3 text-[#89958f]">
								بله، در صورت داشتن شرایط لازم می‌توانید برای چند فرصت مناسب اقدام
								کنید.
							</p>
						</div>
					</section>
				</div>

				<aside className="space-y-2.5">
					<section className="rounded-lg border border-[#e8ece8] bg-white px-3 py-2.5">
						<h2 className="mb-2 text-[9px] font-bold text-ink">
							برای درخواست آماده‌اید؟
						</h2>
						<p className="text-[6px] text-[#89958f]">مهلت درخواست تا</p>
						<p className="mt-1 text-[11px] font-extrabold text-ink">
							{formatDate(scholarship.deadline, "اعلام نشده")}
						</p>
						<span className="mt-1 inline-block rounded-full bg-[#fbf2dc] px-2 py-0.5 text-[6px] text-[#9b7a34]">
							{expired ? "مهلت این فرصت گذشته است" : "پیش از پایان مهلت اقدام کنید"}
						</span>
						<button
							className="mt-2 block w-full rounded-md bg-forest px-2 py-1.5 text-[7px] font-semibold text-white hover:bg-[#0a332f] disabled:opacity-50"
							disabled={expired}
							onClick={apply}
							type="button"
						>
							<Icon name="arrow" className="ml-1 inline h-3 w-3 rotate-180" />
							رفتن به درخواست اصلی
						</button>
						<button
							aria-pressed={isSaved}
							className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border border-[#e5e9e5] px-2 py-1.5 text-[7px] font-semibold text-forest"
							onClick={onToggleSave}
							type="button"
						>
							<Icon name="bookmark" className="h-3 w-3" />
							{isSaved ? "حذف از فرصت‌های ذخیره‌شده" : "ذخیره بورسیه"}
						</button>
						{applyMessage && (
							<p className="mt-2 text-[7px] leading-4 text-[#2f6b5d]" role="status">
								{applyMessage}
							</p>
						)}
						<p className="mt-2 border-t border-[#edf0ed] pt-2 text-[6px] leading-3 text-[#89958f]">
							نیاز به راهنمایی دارید؟ با مشاوران ما در تماس باشید.
						</p>
					</section>

					<section className="rounded-lg border border-[#e8ece8] bg-white px-3 py-2.5">
						<h2 className="mb-2 text-[9px] font-bold text-ink">چک‌لیست اسناد</h2>
						<div className="space-y-1.5">
							{documents.map((document) => (
								<label
									className="flex cursor-pointer items-center gap-1.5 text-[7px] text-[#526963]"
									key={document}
								>
									<input
										checked={checkedDocuments.includes(document)}
										className="h-2.5 w-2.5 accent-[#267162]"
										onChange={() => toggleDocument(document)}
										type="checkbox"
									/>
									{document}
								</label>
							))}
						</div>
						<button
							className="mt-2 rounded-md border border-[#dfe8e3] px-2 py-1.5 text-[6px] font-semibold text-forest"
							onClick={user ? onDocuments : onLoginRequired}
							type="button"
						>
							رفتن به اسناد من
						</button>
					</section>

					<div className="flex items-center gap-1.5 rounded-md bg-[#e9f2ee] px-2 py-1.5 text-[6px] leading-3 text-[#58786c]">
						<span>✓</span>
						پیش از اقدام، شرایط بورسیه را به‌دقت بررسی کنید.
					</div>
				</aside>
			</div>
		</main>
	);
}

