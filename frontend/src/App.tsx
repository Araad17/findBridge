import { useCallback, useEffect, useState, type FormEvent } from "react";
import Icon from "./components/Icon";
import HomePage from "./components/HomePage";
import ScholarshipDetail from "./components/ScholarshipDetail";
import GuidancePage from "./components/GuidancePage";
import AccountPage from "./components/AccountPage";
import DashboardPage from "./components/DashboardPage";
import AdminDashboardPage from "./components/AdminDashboardPage";
import AdBanner from "./components/AdBanner";
import { useAuth } from "./lib/auth";
import { api, errorMessage } from "./lib/api";
import { degreeLabels, degreesText, fundingLabels } from "./lib/labels";
import { formatDate, formatNumber } from "./lib/format";
import {
	emptyFilters,
	type Page,
	type Scholarship,
	type ScholarshipFilters,
} from "./types/scholarships";

type Tab =
	| "home"
	| "scholarships"
	| "detail"
	| "guide"
	| "login"
	| "signup"
	| "dashboard";
type FilterOptions = {
	countries: string[];
	degrees: string[];
	fundingTypes: string[];
};

type UrlParams = { ref?: string; reset?: string; verify?: string };

const readUrlParams = (): UrlParams => {
	const params = new URLSearchParams(window.location.search);
	return {
		ref: params.get("ref") ?? undefined,
		reset: params.get("reset") ?? undefined,
		verify: params.get("verify") ?? undefined,
	};
};

function App() {
	const { user, loading: authLoading, logout } = useAuth();
	const [urlParams, setUrlParams] = useState<UrlParams>(readUrlParams);
	const [activeTab, setActiveTab] = useState<Tab>(
		urlParams.reset ? "login" : urlParams.ref ? "signup" : "home",
	);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [filters, setFilters] = useState<ScholarshipFilters>(emptyFilters);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [list, setList] = useState<Page<Scholarship> | null>(null);
	const [listLoading, setListLoading] = useState(false);
	const [listError, setListError] = useState("");
	const [options, setOptions] = useState<FilterOptions>({
		countries: [],
		degrees: [],
		fundingTypes: [],
	});
	const [savedIds, setSavedIds] = useState<number[]>([]);
	const [notice, setNotice] = useState("");

	const clearUrlParams = useCallback(() => {
		window.history.replaceState({}, "", window.location.pathname);
		setUrlParams({});
	}, []);

	// تایید ایمیل از روی لینکی که به ایمیل ارسال شده است
	useEffect(() => {
		if (!urlParams.verify) return;
		api("/auth/verify-email", {
			method: "POST",
			body: { token: urlParams.verify },
		})
			.then(() => setNotice("ایمیل شما با موفقیت تایید شد."))
			.catch((error) => setNotice(errorMessage(error)))
			.finally(clearUrlParams);
	}, [urlParams.verify, clearUrlParams]);

	useEffect(() => {
		api<FilterOptions>("/scholarships/filters")
			.then(setOptions)
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		if (!user) {
			setSavedIds([]);
			return;
		}
		api<{ ids: number[] }>("/me/saved/ids")
			.then((data) => setSavedIds(data.ids))
			.catch(() => undefined);
	}, [user]);

	useEffect(() => {
		if (activeTab !== "scholarships") return;
		const controller = new AbortController();
		setListLoading(true);
		setListError("");
		api<Page<Scholarship>>("/scholarships", {
			query: { ...filters, page, limit: 10 },
			signal: controller.signal,
		})
			.then(setList)
			.catch((error) => {
				if ((error as Error).name !== "AbortError")
					setListError(errorMessage(error));
			})
			.finally(() => {
				if (!controller.signal.aborted) setListLoading(false);
			});
		return () => controller.abort();
	}, [activeTab, filters, page]);

	const updateFilters = (changes: Partial<ScholarshipFilters>) => {
		setFilters((current) => ({ ...current, ...changes }));
		setPage(1);
	};

	const handleSearch = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		updateFilters({ q: query.trim() });
	};

	const navigateToTab = (tab: Tab) => {
		setActiveTab(tab);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const toggleSaved = async (id: number) => {
		if (!user) {
			setNotice("برای ذخیره بورسیه ابتدا وارد حساب خود شوید.");
			navigateToTab("login");
			return;
		}
		const wasSaved = savedIds.includes(id);
		setSavedIds((current) =>
			wasSaved ? current.filter((item) => item !== id) : [...current, id],
		);
		try {
			await api(`/me/saved/${id}`, { method: wasSaved ? "DELETE" : "PUT" });
		} catch (error) {
			setSavedIds((current) =>
				wasSaved ? [...current, id] : current.filter((item) => item !== id),
			);
			setNotice(errorMessage(error));
		}
	};

	const openScholarship = (item: { id: number }) => {
		setSelectedId(item.id);
		navigateToTab("detail");
	};

	const handleLogout = async () => {
		await logout();
		navigateToTab("home");
	};

	const isDashboard = activeTab === "dashboard" && Boolean(user);
	const isAdminArea = user?.role === "admin" || user?.role === "expert";
	const saved = savedIds;

	const mobileTabs: Array<{
		id: Tab;
		label: string;
		icon: "home" | "book" | "arrow" | "user" | "userPlus";
	}> = [
		{ id: "home", label: "خانه", icon: "home" },
		{ id: "scholarships", label: "بورسیه‌ها", icon: "book" },
		{ id: "guide", label: "راهنما", icon: "arrow" },
		...(user
			? [{ id: "dashboard" as const, label: "داشبورد", icon: "user" as const }]
			: [
					{ id: "login" as const, label: "ورود", icon: "user" as const },
					{
						id: "signup" as const,
						label: "ساخت حساب",
						icon: "userPlus" as const,
					},
				]),
	];

	const renderScholarship = (item: Scholarship) => (
		<article
			className="rounded-xl border border-[#e5e9e5] bg-white px-4 py-3 transition hover:shadow-soft"
			key={item.id}
		>
			<div className="flex items-start justify-between gap-3">
				<span className="rounded-full bg-[#eaf3ef] px-2.5 py-1 text-[9px] font-semibold text-[#47806f]">
					{item.badge ??
						(item.fundingType ? fundingLabels[item.fundingType] : "بورسیه")}
				</span>
				<button
					aria-label={
						saved.includes(item.id)
							? `حذف ${item.title} از ذخیره‌شده‌ها`
							: `ذخیره ${item.title}`
					}
					aria-pressed={saved.includes(item.id)}
					className={`mt-0.5 rounded p-1 transition ${saved.includes(item.id) ? "bg-[#eaf3ef] text-forest" : "text-[#438b7a] hover:bg-[#eef5f1]"}`}
					onClick={() => toggleSaved(item.id)}
					type="button"
				>
					<Icon name="bookmark" className="h-3.5 w-3.5" />
				</button>
			</div>
			<h3 className="mt-1 text-sm font-bold text-ink">
				<button
					className="text-right hover:text-[#267162]"
					onClick={() => openScholarship(item)}
					type="button"
				>
					{item.title}
				</button>
			</h3>
			<p className="mt-1 text-[10px] text-[#89958f]">
				{item.country}
				<span className="mx-1.5">•</span>
				{degreesText(item.degreeLevels)}
				<span className="mx-1.5">•</span>
				{item.field ?? "—"}
			</p>
			<p className="mt-2 text-[10px] leading-5 text-[#72827d]">
				{item.description}
			</p>
			<div className="mt-2 flex items-center justify-between border-t border-[#edf0ed] pt-2">
				<span className="text-[9px] text-[#98a49e]">
					مهلت درخواست: {formatDate(item.deadline, "اعلام نشده")}
				</span>
				<button
					className="text-[10px] font-semibold text-[#267162] hover:text-forest"
					onClick={() => openScholarship(item)}
					type="button"
				>
					مشاهده فرصت ←
				</button>
			</div>
		</article>
	);

	return (
		<div className="flex h-screen min-h-0 flex-col overflow-hidden bg-paper text-ink">
			<header
				className={`bg-[#10443e] text-white ${isDashboard ? "hidden" : ""}`}
			>
				<div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-5 lg:px-8">
					<a
						aria-label="بورسیه‌یار، صفحه اصلی"
						className="flex items-center gap-2"
						href="#home"
						onClick={(event) => {
							event.preventDefault();
							navigateToTab("home");
						}}
					>
						<span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f2bb4d] text-forest">
							<Icon name="book" className="h-4 w-4" />
						</span>
						<span>
							<span className="block text-sm font-extrabold">ScolarBridge</span>
							<span className="block text-[8px] text-white/60">
								مسیر تحصیلی آینده شما
							</span>
						</span>
					</a>

					<nav
						aria-label="ناوبری اصلی"
						className="hidden items-center gap-3 text-[9px] text-white/75 min-[520px]:static min-[520px]:flex min-[520px]:flex-row min-[520px]:gap-4 min-[520px]:bg-transparent min-[520px]:p-0 min-[520px]:shadow-none md:static md:flex md:flex-row md:bg-transparent md:p-0 md:shadow-none"
					>
						<a
							aria-current={activeTab === "home" ? "page" : undefined}
							className={
								activeTab === "home"
									? "font-semibold text-[#f2bb4d]"
									: "transition hover:text-white"
							}
							href="#home"
							onClick={(event) => {
								event.preventDefault();
								navigateToTab("home");
							}}
						>
							خانه
						</a>
						<a
							aria-current={
								activeTab === "scholarships" || activeTab === "detail"
									? "page"
									: undefined
							}
							className={
								activeTab === "scholarships" || activeTab === "detail"
									? "font-semibold text-[#f2bb4d]"
									: "transition hover:text-white"
							}
							href="#scholarships"
							onClick={(event) => {
								event.preventDefault();
								navigateToTab("scholarships");
							}}
						>
							بورسیه‌ها
						</a>
						<a
							aria-current={activeTab === "guide" ? "page" : undefined}
							className={
								activeTab === "guide"
									? "font-semibold text-[#f2bb4d]"
									: "transition hover:text-white"
							}
							href="#guide"
							onClick={(event) => {
								event.preventDefault();
								navigateToTab("guide");
							}}
						>
							راهنمای درخواست
						</a>
						<a className="transition hover:text-white" href="#about">
							درباره ما
						</a>
					</nav>

					<div className="hidden items-center gap-4 min-[520px]:flex">
						{user ? (
							<>
								<button
									className={`rounded-md border px-3 py-2 text-[10px] transition ${activeTab === "dashboard" ? "border-[#f2bb4d] text-[#f2bb4d]" : "border-white/25 hover:bg-white/10"}`}
									onClick={() => navigateToTab("dashboard")}
									type="button"
								>
									{isAdminArea ? "پنل مدیریت" : "داشبورد من"}
								</button>
								<button
									className="text-[10px] text-white/75 transition hover:text-white"
									onClick={handleLogout}
									type="button"
								>
									خروج
								</button>
							</>
						) : (
							<>
								<button
									className={`text-[10px] transition hover:text-white ${activeTab === "login" ? "font-bold text-[#f2bb4d]" : "text-white/75"}`}
									onClick={() => navigateToTab("login")}
									type="button"
								>
									ورود
								</button>
								<a
									className={`rounded-md border px-3 py-2 text-[10px] transition ${activeTab === "signup" ? "border-[#f2bb4d] text-[#f2bb4d]" : "border-white/25 hover:bg-white/10"}`}
									href="#signup"
									onClick={(event) => {
										event.preventDefault();
										navigateToTab("signup");
									}}
								>
									ساخت حساب
								</a>
							</>
						)}
					</div>
				</div>
			</header>

			<nav
				aria-label="ناوبری موبایل"
				className={`grid gap-1 border-b border-[#e7ebe7] bg-white px-2 py-1.5 min-[520px]:hidden ${isDashboard ? "hidden" : ""}`}
				style={{
					gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))`,
				}}
			>
				{mobileTabs.map((tab) => {
					const isActive =
						tab.id === "scholarships"
							? activeTab === "scholarships" || activeTab === "detail"
							: activeTab === tab.id;

					return (
						<button
							aria-current={isActive ? "page" : undefined}
							className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[7px] transition ${isActive ? "bg-[#eaf3ef] font-bold text-forest" : "text-[#82918c] hover:bg-[#f5f8f6]"}`}
							key={tab.id}
							onClick={() => navigateToTab(tab.id)}
							type="button"
						>
							<Icon name={tab.icon} className="h-3.5 w-3.5" />
							<span className="whitespace-nowrap">{tab.label}</span>
						</button>
					);
				})}
			</nav>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{notice && (
					<div
						className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-md bg-[#fbf2dc] px-4 py-2 text-[10px] text-[#826a37]"
						role="status"
					>
						<span>{notice}</span>
						<button
							aria-label="بستن پیام"
							onClick={() => setNotice("")}
							type="button"
						>
							×
						</button>
					</div>
				)}
				{activeTab === "scholarships" ? (
					<main className="mx-auto max-w-6xl px-5 pb-10 pt-7 lg:px-8">
						<section className="mb-5 text-right">
							<p className="mb-1 text-[10px] font-medium text-[#81908a]">
								مسیر آینده‌ات را با یک فرصت مناسب شروع کن
							</p>
							<h1 className="text-2xl font-extrabold leading-relaxed text-ink sm:text-[28px]">
								فرصت بعدی خود را پیدا کنید
							</h1>
							<p className="mt-1 text-[10px] leading-5 text-[#83908b]">
								بورسیه‌های مناسب خود را پیدا کنید و با اطمینان برای ادامه تحصیل
								اقدام کنید.
							</p>
						</section>

						<div className="mb-4 flex items-center gap-2 rounded-md bg-[#fbf2dc] px-3 py-2 text-[9px] leading-5 text-[#826a37]">
							<span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-[#b39b61] text-[8px]">
								!
							</span>
							<p>
								فرصت‌های تحصیلی به‌روز را بر اساس شرایط خود بررسی کنید و مسیر
								مناسب‌تان را پیدا کنید.
							</p>
						</div>

						<AdBanner className="mb-4" placement="scholarships" />

						<form className="mb-5" onSubmit={handleSearch}>
							<label
								className="mb-1.5 block text-[10px] font-semibold text-ink"
								htmlFor="scholarship-search"
							>
								نام رشته یا مقطع
							</label>
							<div className="flex gap-2">
								<input
									className="min-w-0 flex-1 rounded-md border border-[#e5e9e5] bg-white px-3 py-2.5 text-[10px] text-ink outline-none transition placeholder:text-[#98a49e] focus:border-forest"
									id="scholarship-search"
									onChange={(event) => setQuery(event.target.value)}
									placeholder="مثلاً مهندسی، مدیریت، کارشناسی ارشد..."
									value={query}
								/>
								<button
									className="inline-flex items-center gap-1.5 rounded-md bg-forest px-4 py-2 text-[10px] font-semibold text-white transition hover:bg-[#0a332f]"
									type="submit"
								>
									<Icon name="search" className="h-3.5 w-3.5" />
									جستجو
								</button>
							</div>
						</form>

						<div className="grid items-start gap-4 min-[520px]:grid-cols-[minmax(0,1fr)_minmax(0,3.55fr)]">
							<aside className="space-y-4">
								<section className="rounded-xl border border-[#e8ece8] bg-white p-4">
									<h2 className="mb-3 text-sm font-bold text-ink">
										محدود کردن نتایج
									</h2>
									<label className="mb-3 block text-[10px] font-medium text-[#526963]">
										کشور مقصد
										<select
											className="filter-select mt-1.5"
											onChange={(event) =>
												updateFilters({ country: event.target.value })
											}
											value={filters.country}
										>
											<option value="">همه کشورها</option>
											{options.countries.map((option) => (
												<option key={option}>{option}</option>
											))}
										</select>
									</label>
									<label className="mb-3 block text-[10px] font-medium text-[#526963]">
										مقطع تحصیلی
										<select
											className="filter-select mt-1.5"
											onChange={(event) =>
												updateFilters({ degree: event.target.value })
											}
											value={filters.degree}
										>
											<option value="">همه مقاطع</option>
											{Object.entries(degreeLabels).map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
										</select>
									</label>
									<label className="mb-3 block text-[10px] font-medium text-[#526963]">
										نوع بورسیه
										<select
											className="filter-select mt-1.5"
											onChange={(event) =>
												updateFilters({ funding: event.target.value })
											}
											value={filters.funding}
										>
											<option value="">همه بورسیه‌ها</option>
											{Object.entries(fundingLabels).map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
										</select>
									</label>
									<label className="mb-3 block text-[10px] font-medium text-[#526963]">
										مدرک زبان
										<select
											className="filter-select mt-1.5"
											onChange={(event) =>
												updateFilters({ language: event.target.value })
											}
											value={filters.language}
										>
											<option value="">همه شرایط</option>
											<option value="none">بدون مدرک زبان</option>
											<option value="required">نیازمند مدرک زبان</option>
										</select>
									</label>
									<label className="block text-[10px] font-medium text-[#526963]">
										مهلت درخواست
										<select
											className="filter-select mt-1.5"
											onChange={(event) =>
												updateFilters({ window: event.target.value })
											}
											value={filters.window}
										>
											<option value="">همه فرصت‌ها</option>
											<option value="open">در حال پذیرش</option>
											<option value="upcoming">به‌زودی</option>
										</select>
									</label>
									<button
										className="mt-3 rounded-md bg-forest px-4 py-2 text-[10px] font-semibold text-white transition hover:bg-[#0a332f]"
										onClick={() => updateFilters({ q: query.trim() })}
										type="button"
									>
										اعمال فیلترها
									</button>
								</section>

								<section
									className="rounded-xl border border-[#e8ece8] bg-white p-4"
									id="help"
								>
									<h2 className="text-xs font-bold text-ink">
										نیازمندی پیدا نشد؟
									</h2>
									<p className="mt-2 text-[9px] leading-5 text-[#84918b]">
										مشاوران ما کمک می‌کنند فرصت‌های متناسب با شرایط خود را پیدا
										کنید.
									</p>
									<a
										className="mt-3 inline-flex items-center gap-1 rounded-md border border-[#dfe8e3] px-3 py-2 text-[9px] font-semibold text-forest hover:bg-[#f7faf8]"
										href="#about"
									>
										<Icon name="globe" className="h-3 w-3" />
										دریافت مشاوره
									</a>
								</section>
							</aside>

							<section id="opportunities">
								<div className="mb-3 flex items-center justify-between gap-3">
									<div>
										<h2 className="text-sm font-bold text-ink">
											{formatNumber(list?.total ?? 0)} فرصت مناسب شما
										</h2>
										<p className="mt-1 text-[9px] text-[#89958f]">
											فرصت‌های تحصیلی منتخب و به‌روز
										</p>
									</div>
									<label className="flex items-center gap-2 text-[9px] text-[#81908a]">
										مرتب‌سازی:
										<select
											className="rounded-md border border-[#e5e9e5] bg-white px-2 py-1.5 text-[9px] text-[#526963]"
											onChange={(event) =>
												updateFilters({
													sort: event.target
														.value as ScholarshipFilters["sort"],
												})
											}
											value={filters.sort}
										>
											<option value="newest">جدیدترین</option>
											<option value="deadline">نزدیک‌ترین مهلت</option>
										</select>
									</label>
								</div>

								<div className="space-y-3">
									{listError ? (
										<div className="rounded-xl border border-dashed border-[#e8c9c9] bg-white px-5 py-10 text-center text-xs text-[#a14b4b]">
											{listError}
										</div>
									) : listLoading && !list ? (
										<div className="rounded-xl border border-[#e8ece8] bg-white px-5 py-10 text-center text-xs text-[#81908a]">
											در حال بارگذاری فرصت‌ها...
										</div>
									) : (list?.items.length ?? 0) > 0 ? (
										(list?.items ?? []).map((item, index) => (
											<div key={item.id}>
												{renderScholarship(item)}
												{index === 1 && (
													<section className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[#f1e4c4] bg-[#fbf2dc] px-4 py-3">
														<div>
															<p className="text-[9px] text-[#99814b]">
																هنوز مطمئن نیستید از کجا شروع کنید؟
															</p>
															<h3 className="mt-1 text-xs font-bold text-ink">
																یک قدم نزدیک‌تر به رؤیای تحصیلی‌تان
															</h3>
															<p className="mt-1 text-[9px] text-[#82908a]">
																راهنمایی بگیرید و مسیر مناسب خود را پیدا کنید.
															</p>
														</div>
														<a
															className="shrink-0 rounded-md bg-white px-3 py-2 text-[9px] font-semibold text-forest shadow-sm hover:bg-[#f8f8f4]"
															href="#help"
														>
															بیشتر بدانید
														</a>
													</section>
												)}
											</div>
										))
									) : (
										<div className="rounded-xl border border-dashed border-[#d9e2dd] bg-white px-5 py-10 text-center">
											<p className="text-sm font-semibold text-ink">
												فرصتی با این مشخصات پیدا نشد
											</p>
											<p className="mt-2 text-xs text-[#81908a]">
												فیلترها را تغییر دهید تا فرصت‌های بیشتری ببینید.
											</p>
										</div>
									)}
								</div>

								{(list?.totalPages ?? 1) > 1 && (
									<nav
										aria-label="صفحه‌بندی نتایج"
										className="mt-4 flex items-center justify-center gap-2 text-[9px]"
									>
										<button
											className="rounded-md bg-white px-3 py-2 text-forest shadow-sm disabled:opacity-40"
											disabled={page <= 1}
											onClick={() => setPage((current) => current - 1)}
											type="button"
										>
											صفحه قبل
										</button>
										<span
											className="rounded-md bg-forest px-2.5 py-1.5 text-white"
											aria-current="page"
										>
											{formatNumber(page)} از{" "}
											{formatNumber(list?.totalPages ?? 1)}
										</span>
										<button
											className="rounded-md bg-white px-3 py-2 text-forest shadow-sm disabled:opacity-40"
											disabled={page >= (list?.totalPages ?? 1)}
											onClick={() => setPage((current) => current + 1)}
											type="button"
										>
											صفحه بعد
										</button>
									</nav>
								)}
							</section>
						</div>
					</main>
				) : activeTab === "detail" && selectedId !== null ? (
					<ScholarshipDetail
						isSaved={saved.includes(selectedId)}
						key={selectedId}
						onBack={() => navigateToTab("scholarships")}
						onDocuments={() => navigateToTab(user ? "dashboard" : "login")}
						onHome={() => navigateToTab("home")}
						onLoginRequired={() => {
							setNotice("برای ادامه ابتدا وارد حساب خود شوید.");
							navigateToTab("login");
						}}
						onToggleSave={() => toggleSaved(selectedId)}
						scholarshipId={selectedId}
					/>
				) : activeTab === "guide" ? (
					<GuidancePage onBrowse={() => navigateToTab("scholarships")} />
				) : activeTab === "dashboard" ? (
					authLoading ? (
						<p className="px-5 py-16 text-center text-xs text-[#81908a]">
							در حال بارگذاری...
						</p>
					) : !user ? (
						<AccountPage
							mode="login"
							onHome={() => navigateToTab("home")}
							onSuccess={() => navigateToTab("dashboard")}
							onSwitch={(mode) => navigateToTab(mode)}
						/>
					) : isAdminArea ? (
						<AdminDashboardPage onLogout={handleLogout} />
					) : (
						<DashboardPage
							onLogout={handleLogout}
							onNavigate={(tab) => navigateToTab(tab)}
							onOpenScholarship={openScholarship}
						/>
					)
				) : activeTab === "login" || activeTab === "signup" ? (
					user ? (
						<div className="mx-auto max-w-md px-5 py-16 text-center">
							<p className="text-sm font-bold text-ink">
								با حساب {user.name} وارد شده‌اید.
							</p>
							<button
								className="mt-4 rounded-md bg-forest px-4 py-2 text-[10px] font-semibold text-white"
								onClick={() => navigateToTab("dashboard")}
								type="button"
							>
								رفتن به داشبورد
							</button>
						</div>
					) : (
						<AccountPage
							mode={activeTab}
							onHome={() => navigateToTab("home")}
							onResetDone={clearUrlParams}
							onSuccess={() => navigateToTab("dashboard")}
							onSwitch={(mode) => navigateToTab(mode)}
							refCode={urlParams.ref}
							resetToken={urlParams.reset}
						/>
					)
				) : (
					<HomePage
						onSearch={(search) => {
							setFilters({ ...emptyFilters, ...search });
							setQuery(search.q ?? "");
							setPage(1);
							navigateToTab("scholarships");
						}}
						onSelectScholarship={openScholarship}
						onToggleSave={toggleSaved}
						savedIds={saved}
					/>
				)}
			</div>

			<footer
				className={`bg-[#0d3935] py-4 text-[9px] text-white/60 ${isDashboard ? "hidden" : ""}`}
				id="about"
			>
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 min-[520px]:flex-row min-[520px]:gap-4 lg:px-8">
					<span>© ۱۴۰۴ بورسیه‌یار. تمامی حقوق محفوظ است.</span>
					<span>همراه شما در مسیر آینده تحصیلی</span>
				</div>
			</footer>
		</div>
	);
}

export default App;
