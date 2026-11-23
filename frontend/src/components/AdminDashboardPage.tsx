import { useEffect, useState } from "react";
import Icon from "./Icon";
import AdminScholarshipsPage from "./AdminScholarshipsPage";
import AdminUsersPage from "./AdminUsersPage";
import AdminAdsPage from "./AdminAdsPage";
import { useAuth } from "../lib/auth";
import { api, errorMessage } from "../lib/api";
import { activityLabels, roleLabels } from "../lib/labels";
import { formatDate, formatDateTime, formatNumber } from "../lib/format";

type Stats = {
	scholarships: { published: number; draft: number; archived: number; open: number; deadlines_soon: number };
	users: { total: number; new_week: number; pending: number };
	applications: { active: number; unreviewed: number };
	activeAds: number;
	upcomingDeadlines: Array<{ id: number; title: string; deadline: string; applicants: number; owner: string | null }>;
	recentActivity: Array<{ id: number; action: string; detail: string | null; createdAt: string; actor: string }>;
};

type AdminView = "overview" | "scholarships" | "users" | "ads";

export default function AdminDashboardPage({
	onLogout,
}: {
	onLogout: () => void;
}) {
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const [view, setView] = useState<AdminView>("overview");
	const [notice, setNotice] = useState("");
	const [stats, setStats] = useState<Stats | null>(null);
	// درخواست‌هایی که از نمای کلی به صفحه‌های دیگر پاس داده می‌شوند
	const [scholarshipIntent, setScholarshipIntent] = useState<{ create?: boolean; status?: string } | null>(null);
	const [adIntent, setAdIntent] = useState(false);

	useEffect(() => {
		if (view !== "overview") return;
		api<Stats>("/admin/stats")
			.then(setStats)
			.catch((error) => setNotice(errorMessage(error)));
	}, [view]);

	const allMenu: Array<{ id: AdminView; label: string; icon: "home" | "book" | "users" | "globe"; adminOnly?: boolean }> = [
		{ id: "overview", label: "نمای کلی", icon: "home" },
		{ id: "scholarships", label: "بورسیه‌ها", icon: "book" },
		{ id: "users", label: "کاربران", icon: "users", adminOnly: true },
		{ id: "ads", label: "تبلیغات", icon: "globe" },
	];
	const menu = allMenu.filter((item) => !item.adminOnly || isAdmin);
	const openScholarships = (intent: { create?: boolean; status?: string } | null = null) => {
		setScholarshipIntent(intent);
		setView("scholarships");
	};

	const pageTitle = view === "overview" ? "نمای کلی مدیریت" : menu.find((item) => item.id === view)?.label;

	return (
		<div className="flex h-full min-h-0 bg-[#f6f7f4]" dir="rtl">
			<aside className="flex w-[200px] shrink-0 flex-col bg-[#10443e] text-white max-[700px]:w-[68px]">
				<div className="flex h-[58px] items-center justify-center gap-2 border-b border-white/10 px-3">
					<span className="grid h-8 w-8 place-items-center rounded-md bg-[#f0ad32] text-[16px] font-extrabold text-[#24524f]">ب</span>
					<span className="max-[700px]:hidden">
						<strong className="block text-[13px]">بورسیه‌یار</strong>
						<small className="block text-[7px] text-white/55">مدیریت سامانه</small>
					</span>
				</div>

				<p className="px-4 pb-2 pt-4 text-[7px] text-white/45 max-[700px]:hidden">مدیریت سامانه</p>
				<nav className="flex-1 px-2">
					{menu.map((item) => (
						<button
							className={`mb-1 flex h-9 w-full items-center gap-2 rounded-md px-3 text-[9px] transition max-[700px]:justify-center ${
								view === item.id ? "bg-[#24675d] font-bold text-[#f0bb42]" : "text-white/75 hover:bg-white/10"
							}`}
							key={item.id}
							onClick={() => setView(item.id)}
							type="button"
						>
							<Icon name={item.icon} className="h-3.5 w-3.5 shrink-0" />
							<span className="max-[700px]:hidden">{item.label}</span>
						</button>
					))}
					<div className="my-2 border-t border-white/10" />
					<button className="flex h-9 w-full items-center gap-2 px-3 text-[8px] text-white/70 max-[700px]:justify-center" type="button">
						<Icon name="search" className="h-3 w-3 shrink-0" />
						<span className="max-[700px]:hidden">جستجوی بورسیه‌ها</span>
					</button>
					<button className="flex h-9 w-full items-center gap-2 px-3 text-[8px] text-white/70 max-[700px]:justify-center" type="button">
						<Icon name="info" className="h-3 w-3 shrink-0" />
						<span className="max-[700px]:hidden">مرکز راهنمایی</span>
					</button>
				</nav>

				<div className="m-2 rounded-lg bg-[#174f48] p-3 max-[700px]:hidden">
					<Icon name="shield" className="h-3.5 w-3.5 text-[#f0bb42]" />
					<p className="mt-2 text-[8px] font-bold">مدیریت مسئولانه</p>
					<p className="mt-1 text-[7px] leading-4 text-white/60">دسترسی امن و نظارت بر اطلاعات کاربران و فرصت‌ها</p>
				</div>
				<button className="m-2 flex h-8 items-center gap-2 px-3 text-[8px] text-white/70 hover:bg-white/10 max-[700px]:justify-center" onClick={onLogout} type="button">
					<Icon name="user" className="h-3.5 w-3.5" />
					<span className="max-[700px]:hidden">خروج از حساب</span>
				</button>
			</aside>

			<main className="min-w-0 flex-1 overflow-y-auto">
				<header className="flex h-[58px] items-center justify-between border-b border-[#e8ece8] bg-white px-6 max-[700px]:px-3" dir="ltr">
					<div className="flex items-center gap-3 text-[8px] text-[#82918c]" dir="rtl">
						<Icon name="bell" className="h-4 w-4" />
						<span className="border-r border-[#e5e9e5] pr-3 max-[700px]:hidden">مدیریت سامانه / {pageTitle}</span>
						<span className="font-semibold text-[#526963] max-[700px]:hidden">{user ? roleLabels[user.role] : ""}</span>
					</div>
					<div className="flex items-center gap-2" dir="rtl">
						<span className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf2ee] text-[10px] font-bold text-forest">{user?.name.charAt(0) ?? "م"}</span>
						<span className="text-[8px] text-[#526963] max-[700px]:hidden">{user?.name}</span>
					</div>
				</header>

				{view === "scholarships" ? (
					<AdminScholarshipsPage initialCreate={scholarshipIntent?.create} initialStatus={scholarshipIntent?.status} key={JSON.stringify(scholarshipIntent)} />
				) : view === "users" ? (
					<AdminUsersPage />
				) : view === "ads" ? (
					<AdminAdsPage initialCreate={adIntent} key={String(adIntent)} />
				) : (
				<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<h1 className="text-[20px] font-extrabold leading-8 text-ink">{pageTitle}</h1>
							<p className="mt-1 text-[8px] text-[#89958f]">{formatDate(new Date().toISOString().slice(0, 10))} | از وضعیت سامانه و فعالیت‌ها باخبر شوید.</p>
						</div>
						<button className="rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" onClick={() => openScholarships({ create: true })} type="button">
							+ افزودن بورسیه
						</button>
					</div>

					<div className="mb-4 flex items-center gap-2 rounded-md bg-[#fbf2dc] px-3 py-2 text-[7px] text-[#826a37]">
						<Icon name="info" className="h-3 w-3 shrink-0" />
						مدیریت سامانه: بررسی فرصت‌ها، مدیریت کاربران و نظارت بر فعالیت‌های سایت
					</div>

					<section className="mb-4 grid grid-cols-4 gap-3 max-[750px]:grid-cols-2">
						{[
							[formatNumber(stats?.scholarships.published ?? 0), "بورسیه‌های منتشرشده", `${formatNumber(stats?.scholarships.draft ?? 0)} بورسیه در حال تکمیل`],
							[formatNumber(stats?.scholarships.open ?? 0), "فرصت‌های فعال", `${formatNumber(stats?.scholarships.deadlines_soon ?? 0)} مهلت تا هفته آینده`],
							[formatNumber(stats?.users.total ?? 0), "کاربران ثبت‌شده", `${formatNumber(stats?.users.new_week ?? 0)} حساب جدید در این هفته`],
							[formatNumber(stats?.applications.active ?? 0), "درخواست‌های فعال", `${formatNumber(stats?.applications.unreviewed ?? 0)} مورد در انتظار بررسی`],
						].map(([value, title, note]) => (
							<article className="rounded-lg border border-[#e7ebe7] bg-white px-3 py-3" key={title}>
								<p className="text-[8px] text-[#89958f]">{title}</p>
								<p className="mt-1 text-[18px] font-extrabold text-ink">{value}</p>
								<p className="mt-1 text-[7px] text-[#267162]">{note}</p>
							</article>
						))}
					</section>

					<div className="mb-4 grid grid-cols-[minmax(0,1fr)_230px] items-start gap-3 max-[850px]:grid-cols-1">
						<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-[11px] font-bold text-ink">مهلت‌های نزدیک</h2>
								<button className="text-[7px] text-[#267162]" onClick={() => setView("scholarships")} type="button">مشاهده همه</button>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[500px] text-right text-[7px]">
									<thead className="bg-[#f7f7f3] text-[#89958f]">
										<tr>
											<th className="px-2 py-2 font-medium">بورسیه</th>
											<th className="px-2 py-2 font-medium">مهلت نهایی</th>
											<th className="px-2 py-2 font-medium">متقاضی / اقدام</th>
											<th className="px-2 py-2 font-medium">مسئول / اقدام</th>
										</tr>
									</thead>
									<tbody>
										{(stats?.upcomingDeadlines ?? []).map((row) => (
											<tr className="border-t border-[#edf0ed] text-[#526963]" key={row.id}>
												<td className="px-2 py-2.5">{row.title}</td>
												<td className="px-2 py-2.5">{formatDate(row.deadline)}</td>
												<td className="px-2 py-2.5">{formatNumber(row.applicants)} درخواست</td>
												<td className="px-2 py-2.5">{row.owner ?? "—"}</td>
											</tr>
										))}
										{stats && stats.upcomingDeadlines.length === 0 && (
											<tr>
												<td className="px-2 py-6 text-center text-[#98a49e]" colSpan={4}>مهلت پیش‌رویی ثبت نشده است.</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</section>

						<div className="space-y-3">
							<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
								<h2 className="mb-3 text-[10px] font-bold text-ink">اولویت‌های امروز</h2>
								{[
									[`${formatNumber(stats?.applications.unreviewed ?? 0)} درخواست بررسی‌نشده`, "درخواست‌های ثبت‌شده توسط کاربران"],
									[`${formatNumber(stats?.scholarships.deadlines_soon ?? 0)} مهلت تا ۷ روز آینده`, "بررسی و تایید بورسیه‌ها"],
									[`${formatNumber(stats?.users.pending ?? 0)} حساب در انتظار تایید`, "مدیریت کاربران"],
								].map(([title, detail]) => (
									<div className="border-b border-[#edf0ed] py-2 last:border-0" key={title}>
										<p className="text-[8px] font-bold text-ink">{title}</p>
										<p className="mt-1 text-[7px] text-[#89958f]">{detail}</p>
									</div>
								))}
								<button className="mt-2 rounded-md border border-[#dfe8e3] px-2 py-1.5 text-[7px] font-bold text-forest" onClick={() => setView(isAdmin ? "users" : "scholarships")} type="button">{isAdmin ? "رفتن به مدیریت کاربران" : "رفتن به مدیریت بورسیه‌ها"}</button>
							</section>

							<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
								<h2 className="mb-2 text-[10px] font-bold text-ink">اقدام‌های سریع</h2>
								{([
									["ایجاد فرصت جدید", () => openScholarships({ create: true })],
									["افزودن تبلیغ", () => { setAdIntent(true); setView("ads"); }],
									["بازبینی پیش‌نویس‌ها", () => openScholarships({ status: "draft" })],
								] as Array<[string, () => void]>).map(([item, action]) => (
									<button className="mb-1 block w-full rounded-md border border-[#e5e9e5] px-2 py-1.5 text-right text-[7px] text-[#526963] hover:bg-[#f7faf8]" key={item} onClick={action} type="button">{item}</button>
								))}
							</section>
						</div>
					</div>

					<section className="mb-4 rounded-lg border border-[#e7ebe7] bg-white p-3">
						<div className="mb-2 flex items-center justify-between">
							<h2 className="text-[10px] font-bold text-ink">وضعیت محتوای بورسیه‌ها</h2>
							<div className="flex gap-2 text-[7px] text-[#72827d]">
								<span>منتشرشده: {formatNumber(stats?.scholarships.published ?? 0)}</span><span>پیش‌نویس: {formatNumber(stats?.scholarships.draft ?? 0)}</span><span>بایگانی: {formatNumber(stats?.scholarships.archived ?? 0)}</span>
							</div>
						</div>
						<div className="flex h-2 gap-1 overflow-hidden rounded-full bg-[#edf0ed]">
							{[
								[stats?.scholarships.published ?? 0, "bg-[#17645a]"],
								[stats?.scholarships.draft ?? 0, "bg-[#e8b447]"],
								[stats?.scholarships.archived ?? 0, "bg-[#dfe6e1]"],
							].map(([count, color], index) => (
								<span className={`rounded-full ${color}`} key={index} style={{ flexGrow: Number(count) }} />
							))}
						</div>
						<p className="mt-2 text-[7px] text-[#98a49e]">پیش‌نویس‌ها را بررسی کنید و فرصت‌های در انتظار انتشار را تکمیل نمایید.</p>
					</section>

					<section className="overflow-hidden rounded-lg border border-[#e7ebe7] bg-white">
						<div className="px-4 py-3">
							<h2 className="text-[11px] font-bold text-ink">تازه‌ترین فعالیت‌ها</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[570px] text-right text-[7px]">
								<thead className="bg-[#f7f7f3] text-[#89958f]">
									<tr>
										<th className="px-3 py-2 font-medium">اقدام</th>
										<th className="px-3 py-2 font-medium">انجام‌دهنده</th>
										<th className="px-3 py-2 font-medium">زمان</th>
										<th className="px-3 py-2 font-medium">نتیجه</th>
									</tr>
								</thead>
								<tbody>
									{(stats?.recentActivity ?? []).map((row) => (
										<tr className="border-t border-[#edf0ed] text-[#526963]" key={row.id}>
											<td className="px-3 py-3">{activityLabels[row.action] ?? row.action}{row.detail ? ` — ${row.detail}` : ""}</td>
											<td className="px-3 py-3">{row.actor}</td>
											<td className="px-3 py-3">{formatDateTime(row.createdAt)}</td>
											<td className="px-3 py-3">ثبت شد</td>
										</tr>
									))}
									{stats && stats.recentActivity.length === 0 && (
										<tr>
											<td className="px-3 py-6 text-center text-[#98a49e]" colSpan={4}>هنوز فعالیتی ثبت نشده است.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>
					{notice && <p className="mt-3 rounded-md bg-[#eaf3ef] px-3 py-2 text-[8px] text-[#267162]" role="status">{notice}</p>}
				</div>
				)}
			</main>
		</div>
	);
}
