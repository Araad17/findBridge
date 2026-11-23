import { useEffect, useState, type FormEvent } from "react";
import Icon from "./Icon";
import AdBanner from "./AdBanner";
import { api } from "../lib/api";
import { degreeLabels, degreesText, fundingLabels } from "../lib/labels";
import { formatDate } from "../lib/format";
import type { Page, Scholarship } from "../types/scholarships";

type SearchInput = { q?: string; country?: string; degree?: string; funding?: string };

export default function HomePage({
	onSearch,
	onSelectScholarship,
	onToggleSave,
	savedIds,
}: {
	onSearch: (search: SearchInput) => void;
	onSelectScholarship: (scholarship: Scholarship) => void;
	onToggleSave: (id: number) => void;
	savedIds: number[];
}) {
	const [query, setQuery] = useState("");
	const [country, setCountry] = useState("");
	const [degree, setDegree] = useState("");
	const [funding, setFunding] = useState("");
	const [featured, setFeatured] = useState<Scholarship[]>([]);
	const [countries, setCountries] = useState<string[]>([]);
	const [loadError, setLoadError] = useState(false);

	useEffect(() => {
		api<Page<Scholarship>>("/scholarships", { query: { featured: "true", limit: 3 } })
			.then((data) => setFeatured(data.items))
			.catch(() => setLoadError(true));
		api<{ countries: string[] }>("/scholarships/filters")
			.then((data) => setCountries(data.countries))
			.catch(() => undefined);
	}, []);

	const handleSearch = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSearch({ q: query.trim() });
	};

	const clearFilters = () => {
		setQuery("");
		setCountry("");
		setDegree("");
		setFunding("");
	};

	return (
		<main className="mx-auto max-w-6xl px-5 pb-5 pt-3 lg:px-8">
			<div className="mb-2 flex items-center gap-2 rounded-md bg-sand px-2.5 py-1 text-[8px] leading-4 text-[#826a37]">
				<span className="grid h-3 w-3 shrink-0 place-items-center rounded-full border border-[#b39b61] text-[8px]">
					!
				</span>
				<p>
					با بورسیه‌یار، فرصت‌های تحصیلی معتبر و متناسب با شرایط خود را آسان‌تر
					پیدا کنید.
				</p>
			</div>

			<section className="grid items-center gap-4 py-2 min-[520px]:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] min-[520px]:gap-5">
				<div className="order-1">
					<div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#e8f1ed] px-2 py-0.5 text-[7px] font-semibold text-forest">
						<span className="h-1.5 w-1.5 rounded-full bg-[#3e8b6e]" />
						مسیر تحصیلی خودت را پیدا کن
					</div>
					<h1 className="max-w-2xl text-[18px] font-extrabold leading-7 tracking-tight text-ink">
						آینده تحصیلی شما، از یک فرصت آغاز می‌شود.
					</h1>
					<p className="mt-1 max-w-xl text-[8px] leading-4 text-[#72827d]">
						بورسیه‌های مناسب خود را پیدا کنید و با اطمینان برای ادامه تحصیل اقدام
						کنید.
					</p>
					<form className="mt-1" onSubmit={handleSearch}>
						<label className="sr-only" htmlFor="home-scholarship-search">
							جستجوی فرصت تحصیلی
						</label>
						<p className="mb-0.5 text-[7px] font-semibold text-ink">
							چه فرصتی می‌خواهید؟
						</p>
						<div className="flex gap-1.5">
							<input
								className="min-w-0 flex-1 rounded-md border border-[#e5e9e5] bg-white px-2.5 py-1 text-[8px] text-ink outline-none transition placeholder:text-[#98a49e] focus:border-forest"
								id="home-scholarship-search"
								onChange={(event) => setQuery(event.target.value)}
								placeholder="نام بورسیه، رشته یا کشور..."
								value={query}
							/>
							<button
								className="inline-flex shrink-0 items-center gap-1 rounded-md bg-forest px-3 py-1 text-[8px] font-semibold text-white transition hover:bg-[#0a332f]"
								type="submit"
							>
								<Icon name="search" className="h-3 w-3" />
								جستجوی بورسیه
							</button>
						</div>
					</form>
					<p className="mt-1 text-[7px] text-[#82918c]">
						جستجو در میان فرصت‌های تحصیلی به‌روز و معتبر
					</p>
				</div>

				<div className="relative order-2 overflow-hidden rounded-2xl">
					<img
						alt="دانشجویان در حال گفت‌وگو و مطالعه در کتابخانه"
						className="h-[190px] w-full object-cover min-[520px]:h-[150px]"
						src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1100&q=85"
					/>
					<div className="absolute inset-x-2 bottom-2 rounded-lg bg-forest/90 px-2.5 py-1.5 text-[7px] leading-4 text-white backdrop-blur-sm">
						<span className="font-semibold">یک مسیر روشن برای آینده‌ات</span>
						<span className="mr-1 text-white/75">
							؛ از پیدا کردن فرصت تا شروع یک زندگی تازه
						</span>
					</div>
				</div>
			</section>

			<section className="mb-3 rounded-xl border border-[#e8ece8] bg-white px-2.5 py-2">
				<div className="mb-1.5 flex items-center justify-between gap-3">
					<h2 className="text-[9px] font-bold text-ink">
						فرصت مناسب شرایط خود را پیدا کنید
					</h2>
					<button
						className="text-[7px] text-[#688079] underline-offset-2 hover:underline"
						onClick={clearFilters}
						type="button"
					>
						پاک کردن فیلترها
					</button>
				</div>
				<div className="grid gap-1.5 min-[520px]:grid-cols-4">
					<label className="block text-[7px] font-medium text-[#526963]">
						کشور مقصد
						<select className="mt-1 w-full rounded-md border border-[#e5e9e5] bg-white px-2 py-1 text-[7px] text-[#526963]" onChange={(event) => setCountry(event.target.value)} value={country}>
							<option value="">همه کشورها</option>
							{countries.map((option) => (
								<option key={option}>{option}</option>
							))}
						</select>
					</label>
					<label className="block text-[7px] font-medium text-[#526963]">
						مقطع تحصیلی
						<select className="mt-1 w-full rounded-md border border-[#e5e9e5] bg-white px-2 py-1 text-[7px] text-[#526963]" onChange={(event) => setDegree(event.target.value)} value={degree}>
							<option value="">همه مقاطع</option>
							{Object.entries(degreeLabels).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</label>
					<label className="block text-[7px] font-medium text-[#526963]">
						نوع بورسیه
						<select className="mt-1 w-full rounded-md border border-[#e5e9e5] bg-white px-2 py-1 text-[7px] text-[#526963]" onChange={(event) => setFunding(event.target.value)} value={funding}>
							<option value="">همه بورسیه‌ها</option>
							{Object.entries(fundingLabels).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</label>
					<button
						className="self-end rounded-md bg-forest px-2 py-1.5 text-[7px] font-semibold text-white transition hover:bg-[#0a332f]"
						onClick={() => onSearch({ q: query.trim(), country, degree, funding })}
						type="button"
					>
						نمایش فرصت‌ها
					</button>
				</div>
			</section>

			<AdBanner className="mb-3" placement="home" />

			<section className="mb-3" id="home-opportunities">
				<div className="mb-2 flex items-end justify-between gap-3">
					<div>
						<h2 className="text-xs font-extrabold text-ink">
							فرصت‌های منتخب برای شما
						</h2>
						<p className="mt-0.5 text-[7px] text-[#81908a]">
							فرصت‌های تحصیلی ویژه که با شرایط شما هماهنگ هستند.
						</p>
					</div>
					<button
						className="text-[7px] font-semibold text-forest"
						onClick={() => onSearch({})}
						type="button"
					>
						همه بورسیه‌ها ←
					</button>
				</div>
				<div className="grid gap-2 min-[520px]:grid-cols-3">
					{loadError && <p className="text-[8px] text-[#a14b4b]">بارگذاری فرصت‌ها ممکن نشد.</p>}
					{featured.map((item) => (
						<article
							className="rounded-lg border border-[#e7ebe7] bg-white px-2.5 py-1"
							key={item.id}
						>
							<div className="mb-1 flex items-center justify-between">
								<span className="rounded-full bg-[#eaf3ef] px-2 py-0.5 text-[7px] font-semibold text-[#4c7565]">
									{item.badge ?? (item.fundingType ? fundingLabels[item.fundingType] : "بورسیه")}
								</span>
								<button
									aria-label={`ذخیره ${item.title}`}
									aria-pressed={savedIds.includes(item.id)}
									className={savedIds.includes(item.id) ? "text-forest" : "text-[#438b7a]"}
									onClick={() => onToggleSave(item.id)}
									type="button"
								>
									<Icon name="bookmark" className="h-3 w-3" />
								</button>
							</div>
							<h3 className="text-[9px] font-bold text-ink">
								<button
									className="text-right hover:text-[#267162]"
									onClick={() =>
										onSelectScholarship(item)
									}
									type="button"
								>
									{item.title}
								</button>
							</h3>
							<p className="mt-1 text-[7px] text-[#86948e]">{[item.country, degreesText(item.degreeLevels), item.field].filter(Boolean).join(" • ")}</p>
							<p className="mt-1 text-[7px] leading-3 text-[#72827d]">
								{item.description}
							</p>
							<div className="mt-1.5 flex items-center justify-between border-t border-[#edf0ed] pt-1">
								<span className="text-[6px] text-[#98a49e]">
									مهلت درخواست: {formatDate(item.deadline, "اعلام نشده")}
								</span>
								<button
									className="text-[7px] font-semibold text-[#267162]"
									onClick={() =>
										onSelectScholarship(item)
									}
									type="button"
								>
									مشاهده فرصت ←
								</button>
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[#f1e4c4] bg-sand px-3 py-2">
				<Icon name="book" className="h-5 w-5 shrink-0 text-forest" />
				<div>
					<p className="text-[7px] text-[#99814b]">
						هنوز مطمئن نیستید از کجا شروع کنید؟
					</p>
					<h2 className="mt-0.5 text-[10px] font-bold text-ink">
						یک قدم نزدیک‌تر به رؤیای تحصیلی‌تان
					</h2>
					<p className="mt-0.5 text-[7px] text-[#82908a]">
						راهنمایی بگیرید و مسیر مناسب خود را با اطمینان پیدا کنید.
					</p>
				</div>
				<button
					className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-[7px] font-semibold text-forest shadow-sm"
					onClick={() => onSearch({})}
					type="button"
				>
					بیشتر بدانید
				</button>
			</section>

			<section
				className="mb-3 grid gap-2 min-[520px]:grid-cols-3"
				id="how-it-works"
			>
				{[
					{
						number: "۰۱",
						title: "شرایط را مقایسه کنید",
						text: "شرایط، مدارک و زمان‌بندی هر فرصت را بررسی کنید.",
					},
					{
						number: "۰۲",
						title: "اسناد را آماده سازید",
						text: "مدارک خود را با راهنمایی‌های ما آماده کنید.",
					},
					{
						number: "۰۳",
						title: "درخواست را ارسال کنید",
						text: "یک قدم دیگر به مسیر تحصیلی آینده‌تان نزدیک شوید.",
					},
				].map((step) => (
					<article
						className="rounded-lg border border-[#e7ebe7] bg-white px-3 py-2"
						key={step.number}
					>
						<div className="mb-1 flex items-center justify-between">
							<h3 className="text-[8px] font-bold text-ink">{step.title}</h3>
							<span className="rounded-full bg-[#eaf3ef] px-1.5 py-0.5 text-[7px] font-semibold text-[#4c7565]">
								{step.number}
							</span>
						</div>
						<p className="text-[7px] leading-4 text-[#82908a]">{step.text}</p>
					</article>
				))}
			</section>

			<div className="flex items-center gap-1.5 rounded-md bg-[#e9f2ee] px-2.5 py-1.5 text-[7px] leading-4 text-[#58786c]">
				<span className="text-[#267162]">✓</span>
				بورسیه‌یار از اولین جستجو تا ساختن آینده‌ای که همیشه آرزویش را داشتید
				همراه شماست.
			</div>
		</main>
	);
}

