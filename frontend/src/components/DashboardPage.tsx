import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import ProfilePage from "./ProfilePage";
import DocumentsPage from "./DocumentsPage";
import ConsultationPage from "./ConsultationPage";
import ReferralPage from "./ReferralPage";
import { useAuth } from "../lib/auth";
import { api, errorMessage } from "../lib/api";
import { applicationStatusLabels, degreesText } from "../lib/labels";
import { formatDate, formatDateTime, formatNumber } from "../lib/format";
import type { Scholarship } from "../types/scholarships";

type DashboardData = {
	user: { name: string; avatarUrl: string | null };
	stats: {
		saved: number;
		applications: number;
		pendingApplications: number;
		documents: number;
		approvedDocuments: number;
		profileCompletion: number;
	};
	nextConsultation: { id: number; startsAt: string; durationMinutes: number; topic: string | null; meetingUrl: string | null; consultantName: string } | null;
	applications: Array<{ id: number; status: string; scholarship: { id: number; title: string; country: string; degreeLevels: string[] } }>;
	savedItems: Scholarship[];
};

export default function DashboardPage({
	onNavigate,
	onLogout,
	onOpenScholarship,
}: {
	onNavigate: (tab: "home" | "scholarships" | "guide") => void;
	onLogout: () => void;
	onOpenScholarship: (scholarship: { id: number }) => void;
}) {
	const { user } = useAuth();
	const [data, setData] = useState<DashboardData | null>(null);
	const [loadError, setLoadError] = useState("");

	const load = useCallback(() => {
		api<DashboardData>("/me/dashboard")
			.then(setData)
			.catch((error) => setLoadError(errorMessage(error)));
	}, []);

	// با هر بار برگشتن به صفحه خانه، آمار به‌روز می‌شود
	const [refreshKey, setRefreshKey] = useState(0);
	useEffect(() => {
		load();
	}, [load, refreshKey]);

	const removeSaved = async (id: number) => {
		try {
			await api(`/me/saved/${id}`, { method: "DELETE" });
			load();
		} catch (error) {
			setLoadError(errorMessage(error));
		}
	};

	const displayName = data?.user.name ?? user?.name ?? "";
	const initial = displayName.trim().charAt(0) || "ب";

	const [view, setView] = useState<"home" | "profile" | "documents" | "consultation" | "referrals">("home");
	const menu = [
		{
			label: "خانه",
			icon: "home" as const,
			tab: "home" as const,
			view: "home" as const,
		},
		{
			label: "پروفایل",
			icon: "user" as const,
			tab: null,
			view: "profile" as const,
		},
		{
			label: "اسناد",
			icon: "clipboard" as const,
			tab: null,
			view: "documents" as const,
		},
		{
			label: "مشاوره",
			icon: "video" as const,
			tab: null,
			view: "consultation" as const,
		},
		{
			label: "معرفی دوستان",
			icon: "users" as const,
			tab: null,
			view: "referrals" as const,
		},
	];

	return (
		<div className="flex h-full min-h-0 bg-[#f6f7f4]" dir="rtl">
			<aside className="flex w-[200px] shrink-0 flex-col bg-[#16616a] text-white max-[700px]:w-[68px]">
				<button
					className="flex h-[78px] items-center justify-center gap-2 border-b border-white/10 px-3 max-[700px]:h-[64px]"
					onClick={() => onNavigate("home")}
					type="button"
				>
					<span className="grid h-8 w-8 place-items-center rounded-md bg-[#f0ad32] text-[16px] font-extrabold text-[#24524f]">
						{initial}
					</span>
					<span className="max-[700px]:hidden">
						<strong className="block text-[15px]">بورسیه‌یار</strong>
						<small className="block text-[7px] text-white/55">
							همراه مسیر تحصیلی شما
						</small>
					</span>
				</button>

				<nav className="flex-1 px-2 py-3">
					{menu.map((item) => (
						<button
							className={`mb-1 flex h-10 w-full items-center gap-2 rounded-md px-3 text-[10px] transition max-[700px]:justify-center ${
								item.view === view
									? "bg-[#9bc627] font-bold text-[#17484a]"
									: "text-white/78 hover:bg-white/10"
							}`}
							key={item.label}
							onClick={() => {
								setView(item.view);
								if (item.view === "home") setRefreshKey((key) => key + 1);
							}}
							type="button"
						>
							<Icon name={item.icon} className="h-4 w-4 shrink-0" />
							<span className="max-[700px]:hidden">{item.label}</span>
						</button>
					))}
				</nav>

				<div className="border-t border-white/10 p-2 max-[700px]:px-1">
					{[
						["chat", "گفتگوی دوستان"],
						["globe", "اخبار و فرهنگ"],
					].map(([icon, label]) => (
						<button
							className="flex h-9 w-full items-center gap-2 px-3 text-[9px] text-white/70 max-[700px]:justify-center"
							key={label}
							type="button"
						>
							<Icon name={icon as "chat" | "globe"} className="h-3.5 w-3.5" />
							<span className="max-[700px]:hidden">{label}</span>
						</button>
					))}
					<button
						className="mt-1 flex h-9 w-full items-center gap-2 rounded-md px-3 text-[9px] text-white/70 hover:bg-white/10 max-[700px]:justify-center"
						onClick={onLogout}
						type="button"
					>
						<Icon name="shield" className="h-3.5 w-3.5" />
						<span className="max-[700px]:hidden">خروج از حساب</span>
					</button>
				</div>
			</aside>

			<main className="min-w-0 flex-1 overflow-y-auto">
				<header
					className="flex h-[58px] items-center justify-between border-b border-[#e8ece8] bg-white px-6 max-[700px]:px-3"
					dir="ltr"
				>
					<div className="flex items-center gap-3 text-[9px] text-[#98a49e]" dir="rtl">
						<button
							aria-label="اعلان‌ها"
							className="text-[#7d8f89]"
							type="button"
						>
							<Icon name="bell" className="h-4 w-4" />
						</button>
						<span className="border-r border-[#e5e9e5] pr-3 max-[700px]:hidden">
							داشبورد محصل
						</span>
						<span className="font-semibold text-[#526963] max-[700px]:hidden">
							<span className="mx-1 text-[#98a49e]">/</span>
							{view === "profile" ? "پروفایل" : view === "documents" ? "اسناد" : view === "consultation" ? "مشاوره" : view === "referrals" ? "معرفی دوستان" : "خانه"}
						</span>
					</div>
					<div className="flex items-center gap-2" dir="rtl">
						<button
							className="grid h-8 w-8 place-items-center rounded-md bg-[#f0ad32] text-[11px] font-bold text-white"
							type="button"
						>
							{initial}
						</button>
						<div className="text-right">
							<p className="text-[11px] font-extrabold text-ink">{displayName || "بورسیه‌یار"}</p>
							<p className="text-[7px] text-[#89958f] max-[700px]:hidden">
								حساب کاربری
							</p>
						</div>
					</div>
				</header>

				{view === "profile" ? (
					<ProfilePage />
				) : view === "documents" ? (
					<DocumentsPage />
				) : view === "consultation" ? (
					<ConsultationPage />
				) : view === "referrals" ? (
					<ReferralPage />
				) : (
					<div className="mx-auto max-w-[1050px] px-5 py-6 max-[700px]:px-3">
						<section className="mb-4">
							<h1 className="text-[22px] font-extrabold leading-9 text-ink">
								خوش آمدید{displayName ? `، ${displayName}` : ""}!
							</h1>
							<p className="mt-1 text-[10px] text-[#81908a]">
								امروز چه کاری برای مسیر تحصیلی‌تان انجام می‌دهید؟
							</p>
						</section>

						<section className="mb-4 grid grid-cols-4 overflow-hidden rounded-lg border border-[#e7ebe7] bg-white max-[700px]:grid-cols-2">
							{[
								[formatNumber(data?.stats.saved ?? 0), "فرصت‌های ذخیره‌شده", "از فهرست بورسیه‌ها ذخیره کنید"],
								[formatNumber(data?.stats.applications ?? 0), "درخواست‌های ثبت‌شده", `${formatNumber(data?.stats.pendingApplications ?? 0)} درخواست در انتظار بررسی`],
								[formatNumber(data?.stats.documents ?? 0), "اسناد بارگذاری‌شده", `${formatNumber(data?.stats.approvedDocuments ?? 0)} سند تأیید شده`],
								[`${formatNumber(data?.stats.profileCompletion ?? 0)}٪`, "تکمیل پروفایل", "اطلاعات کامل‌تر، پیشنهادهای بهتر"],
							].map(([value, title, note], index) => (
								<div
									className={`px-5 py-4 text-center ${index > 0 ? "border-r border-[#edf0ed]" : ""} max-[700px]:border-b`}
									key={title}
								>
									<p className="mb-1 text-[9px] text-[#89958f]">{title}</p>
									<p className="text-[23px] font-extrabold text-ink">{value}</p>
									<p className="mt-1 text-[7px] text-[#89958f]">{note}</p>
								</div>
							))}
						</section>

						<div className="mb-4 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 max-[900px]:grid-cols-1">
							<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
								<div className="mb-3 flex items-center justify-between">
									<h2 className="text-[12px] font-bold text-ink">
										جلسه پیش رو
									</h2>
									<button className="text-[8px] text-[#267162]" onClick={() => setView("consultation")} type="button">
										رزرو جلسه
									</button>
								</div>
								<div className="rounded-md bg-[#f8faf8] px-4 py-3">
									<p className="text-[10px] font-bold text-ink">
										{data?.nextConsultation ? `جلسه با ${data.nextConsultation.consultantName}` : "جلسه‌ای رزرو نکرده‌اید"}
									</p>
									<p className="mt-2 text-[8px] text-[#89958f]">
										{data?.nextConsultation ? formatDateTime(data.nextConsultation.startsAt) : "برای گفت‌وگو با مشاور یک زمان انتخاب کنید."}
									</p>
								</div>
								{data?.nextConsultation?.meetingUrl && (
									<a
										className="mt-3 inline-block rounded-md border border-[#dfe8e3] px-3 py-1.5 text-[8px] font-bold text-forest"
										href={data.nextConsultation.meetingUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										ورود به جلسه
									</a>
								)}
							</section>

							<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
								<h2 className="text-[12px] font-bold text-ink">
									پروفایل شما {formatNumber(data?.stats.profileCompletion ?? 0)}٪ تکمیل شده است
								</h2>
								<p className="mt-1 text-[8px] text-[#89958f]">
									هرچه پروفایل کامل‌تر باشد، مشاوره و پیشنهادها دقیق‌تر خواهد بود.
								</p>
								<div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf1ed]">
									<div className="h-full rounded-full bg-[#2aa184]" style={{ width: `${data?.stats.profileCompletion ?? 0}%` }} />
								</div>
								<button
									className="mt-3 rounded-md bg-[#267162] px-3 py-1.5 text-[8px] font-bold text-white"
									onClick={() => setView("profile")}
									type="button"
								>
									تکمیل پروفایل
								</button>
							</section>
						</div>

						<section className="mb-4 rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
							<h2 className="mb-3 text-[12px] font-bold text-ink">
								درخواست‌های من
							</h2>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[540px] text-right text-[8px]">
									<thead>
										<tr className="border-b border-[#edf0ed] text-[#89958f]">
											<th className="px-2 py-2 font-medium">بورسیه</th>
											<th className="px-2 py-2 font-medium">کشور</th>
											<th className="px-2 py-2 font-medium">وضعیت</th>
											<th className="px-2 py-2 font-medium">مقطع تحصیلی</th>
										</tr>
									</thead>
									<tbody>
										{(data?.applications ?? []).map((row) => (
											<tr className="border-b border-[#f0f2ef] text-[#526963]" key={row.id}>
												<td className="px-2 py-3">
													<button className="hover:text-forest" onClick={() => onOpenScholarship(row.scholarship)} type="button">
														{row.scholarship.title}
													</button>
												</td>
												<td className="px-2 py-3">{row.scholarship.country}</td>
												<td className="px-2 py-3">{applicationStatusLabels[row.status] ?? row.status}</td>
												<td className="px-2 py-3">{degreesText(row.scholarship.degreeLevels as never)}</td>
											</tr>
										))}
										{data && data.applications.length === 0 && (
											<tr>
												<td className="px-2 py-6 text-center text-[#89958f]" colSpan={4}>
													هنوز درخواستی ثبت نکرده‌اید. از صفحه هر بورسیه روی «رفتن به درخواست اصلی» بزنید.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
							{loadError && (
								<div className="mt-3 flex gap-2 rounded-md bg-[#fbf2dc] px-3 py-2 text-[8px] text-[#826a37]" role="alert">
									<Icon name="info" className="h-3.5 w-3.5 shrink-0" />
									{loadError}
								</div>
							)}
						</section>

						<section>
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-[15px] font-extrabold text-ink">
									از فرصت‌های ذخیره‌شده شما
								</h2>
								<button
									className="text-[8px] text-[#267162]"
									onClick={() => onNavigate("scholarships")}
									type="button"
								>
									دیدن همه
								</button>
							</div>
							<div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
								{(data?.savedItems ?? []).map((item) => (
									<article
										className="relative rounded-lg border border-[#e7ebe7] bg-white px-4 py-4"
										key={item.title}
									>
										<button
											aria-label="حذف از ذخیره‌شده‌ها"
											className="absolute left-4 top-4 text-[#438b7a]"
											onClick={() => removeSaved(item.id)}
											type="button"
										>
											<Icon name="bookmark" className="h-4 w-4" />
										</button>
										<span className="inline-block rounded-full bg-[#edf4f0] px-2 py-1 text-[7px] font-bold text-[#267162]">
											{item.badge ?? "بورسیه"}
										</span>
										<h3 className="mt-2 text-[11px] font-bold text-ink">
											{item.title}
										</h3>
										<p className="mt-2 text-[8px] text-[#89958f]">
											{[item.country, degreesText(item.degreeLevels), item.field].filter(Boolean).join(" • ")}
										</p>
										<p className="mt-2 text-[8px] leading-4 text-[#72827d]">
											{item.description}
										</p>
										<div className="mt-3 flex items-center justify-between border-t border-[#edf0ed] pt-3">
											<span className="text-[7px] text-[#98a49e]">
												مهلت ارسال: {formatDate(item.deadline, "اعلام نشده")}
											</span>
											<button
												className="text-[8px] font-bold text-[#267162]"
												onClick={() => onOpenScholarship(item)}
												type="button"
											>
												مشاهده‌ی فایل →
											</button>
										</div>
									</article>
								))}
							</div>
						</section>
					</div>
				)}
			</main>
		</div>
	);
}

