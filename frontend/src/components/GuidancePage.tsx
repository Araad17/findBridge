import { useEffect, useState } from "react";
import Icon from "./Icon";
import AdBanner from "./AdBanner";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
export default function GuidancePage({ onBrowse }: { onBrowse: () => void }) {
	const { user } = useAuth();
	const [checkedDocuments, setCheckedDocuments] = useState<string[]>([]);

	useEffect(() => {
		if (!user) return;
		api<{ checked: string[] }>("/me/checklist/guide")
			.then((data) => setCheckedDocuments(data.checked))
			.catch(() => undefined);
	}, [user]);
	const documents = [
		"رزومه تحصیلی",
		"مدارک و ریزنمرات",
		"مدرک زبان",
		"انگیزه‌نامه",
		"توصیه‌نامه",
	];
	const steps = [
		{
			number: "۰۱",
			title: "فرصت مناسب را پیدا کنید",
			text: "رشته، مقطع و کشور مقصد را با علایق و شرایط خود هماهنگ کنید.",
		},
		{
			number: "۰۲",
			title: "شرایط را بررسی کنید",
			text: "مهلت درخواست، شرایط پذیرش و جزئیات بورسیه را با دقت بخوانید.",
		},
		{
			number: "۰۳",
			title: "مدارک را آماده سازید",
			text: "مدارک لازم را ترجمه و آماده کنید و از کامل بودن آن‌ها مطمئن شوید.",
		},
		{
			number: "۰۴",
			title: "درخواست را ارسال کنید",
			text: "فرم درخواست را پیش از پایان مهلت تکمیل و نتیجه را پیگیری کنید.",
		},
	];

	const toggleDocument = (document: string) => {
		const checked = !checkedDocuments.includes(document);
		setCheckedDocuments((current) => (checked ? [...current, document] : current.filter((item) => item !== document)));
		if (user) {
			api("/me/checklist/guide", { method: "PUT", body: { item: document, checked } }).catch(() => undefined);
		}
	};

	return (
		<main className="mx-auto max-w-6xl px-5 pb-8 pt-5 lg:px-8">
			<AdBanner className="mb-3" placement="guide" />
			<section className="mb-4 text-right">
				<p className="mb-1 text-[9px] font-medium text-[#81908a]">
					از جستجو تا ارسال درخواست، قدم‌به‌قدم همراه شما هستیم
				</p>
				<h1 className="text-xl font-extrabold leading-relaxed text-ink sm:text-2xl">
					راهنمای درخواست بورسیه
				</h1>
				<p className="mt-1 text-[9px] leading-5 text-[#83908b]">
					با یک برنامه‌ریزی درست، مسیر اپلای را ساده‌تر کنید و با آمادگی بیشتری
					درخواست دهید.
				</p>
			</section>

			<section className="mb-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-forest px-4 py-4 text-white min-[520px]:flex-row min-[520px]:items-center">
				<div>
					<p className="text-[8px] font-semibold text-[#f2bb4d]">
						مسیر اپلای در چهار گام
					</p>
					<h2 className="mt-1 text-sm font-bold">
						از انتخاب بورسیه تا ثبت درخواست
					</h2>
					<p className="mt-1 text-[8px] leading-4 text-white/70">
						نکته‌ها و مدارک لازم را مرور کنید و برای فرصت تحصیلی بعدی‌تان آماده
						شوید.
					</p>
				</div>
				<button
					className="shrink-0 rounded-md bg-[#f2bb4d] px-3 py-2 text-[8px] font-bold text-forest transition hover:bg-[#f6c965]"
					onClick={onBrowse}
					type="button"
				>
					جستجوی بورسیه‌ها
				</button>
			</section>

			<section className="mb-4">
				<div className="mb-2">
					<h2 className="text-xs font-extrabold text-ink">
						مراحل درخواست بورسیه
					</h2>
					<p className="mt-1 text-[8px] text-[#81908a]">
						هر مرحله را با دقت انجام دهید تا درخواست کامل‌تری داشته باشید.
					</p>
				</div>
				<div className="grid gap-2 min-[520px]:grid-cols-2 lg:grid-cols-4">
					{steps.map((step) => (
						<article
							className="rounded-lg border border-[#e7ebe7] bg-white p-3"
							key={step.number}
						>
							<div className="mb-2 flex items-center justify-between">
								<span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf3ef] text-[8px] font-bold text-forest">
									{step.number}
								</span>
								<span className="h-px flex-1 bg-[#e5ece8] mx-2" />
								<Icon name="arrow" className="h-3 w-3 text-[#589083]" />
							</div>
							<h3 className="text-[9px] font-bold text-ink">{step.title}</h3>
							<p className="mt-1.5 text-[8px] leading-4 text-[#82908a]">
								{step.text}
							</p>
						</article>
					))}
				</div>
			</section>

			<div className="mb-4 grid items-start gap-3 min-[520px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<section className="rounded-xl border border-[#e8ece8] bg-white p-4">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-xs font-bold text-ink">
								چک‌لیست مدارک موردنیاز
							</h2>
							<p className="mt-1 text-[8px] text-[#81908a]">
								موارد آماده‌شده را علامت بزنید.
							</p>
						</div>
						<span className="rounded-full bg-[#eaf3ef] px-2 py-1 text-[7px] font-semibold text-forest">
							{checkedDocuments.length} از {documents.length} مورد
						</span>
					</div>
					<div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
						{documents.map((document) => (
							<label
								className="flex cursor-pointer items-center gap-2 rounded-md bg-[#f8faf8] px-2.5 py-2 text-[8px] text-[#526963]"
								key={document}
							>
								<input
									checked={checkedDocuments.includes(document)}
									className="h-3 w-3 accent-[#267162]"
									onChange={() => toggleDocument(document)}
									type="checkbox"
								/>
								{document}
							</label>
						))}
					</div>
				</section>

				<section className="rounded-xl border border-[#e8ece8] bg-white p-4">
					<h2 className="text-xs font-bold text-ink">
						نکته‌های مهم پیش از ارسال
					</h2>
					<ul className="mt-2 space-y-2 text-[8px] leading-4 text-[#72827d]">
						<li className="flex gap-2">
							<span className="text-[#267162]">✓</span>نام و اطلاعات را مطابق
							مدارک رسمی وارد کنید.
						</li>
						<li className="flex gap-2">
							<span className="text-[#267162]">✓</span>مهلت و شرایط هر دانشگاه
							را جداگانه بررسی کنید.
						</li>
						<li className="flex gap-2">
							<span className="text-[#267162]">✓</span>ترجمه مدارک را به روزهای
							پایانی موکول نکنید.
						</li>
						<li className="flex gap-2">
							<span className="text-[#267162]">✓</span>پس از ارسال، ایمیل خود را
							برای پیگیری بررسی کنید.
						</li>
					</ul>
				</section>
			</div>

			<section className="mb-4 rounded-xl border border-[#e8ece8] bg-white p-4">
				<h2 className="text-xs font-bold text-ink">زمان‌بندی پیشنهادی</h2>
				<div className="mt-3 grid gap-2 min-[520px]:grid-cols-3">
					{[
						{
							title: "۲ تا ۳ ماه قبل",
							text: "پیدا کردن فرصت و بررسی شرایط پذیرش",
						},
						{
							title: "۱ تا ۲ ماه قبل",
							text: "آماده‌سازی و ترجمه مدارک موردنیاز",
						},
						{
							title: "پیش از مهلت نهایی",
							text: "بازبینی نهایی و ارسال درخواست",
						},
					].map((item) => (
						<div
							className="rounded-lg bg-[#f7f9f7] px-3 py-2.5"
							key={item.title}
						>
							<h3 className="text-[8px] font-bold text-forest">{item.title}</h3>
							<p className="mt-1 text-[7px] leading-4 text-[#81908a]">
								{item.text}
							</p>
						</div>
					))}
				</div>
			</section>

			<div className="flex flex-col items-start justify-between gap-3 rounded-lg bg-sand px-4 py-3 min-[520px]:flex-row min-[520px]:items-center">
				<div>
					<h2 className="text-[9px] font-bold text-ink">
						آماده‌اید فرصت بعدی خود را پیدا کنید؟
					</h2>
					<p className="mt-1 text-[7px] text-[#82908a]">
						بورسیه‌های متناسب با شرایط خود را جستجو کنید.
					</p>
				</div>
				<button
					className="rounded-md bg-forest px-3 py-2 text-[8px] font-semibold text-white hover:bg-[#0a332f]"
					onClick={onBrowse}
					type="button"
				>
					مشاهده فرصت‌های تحصیلی
				</button>
			</div>
		</main>
	);
}

