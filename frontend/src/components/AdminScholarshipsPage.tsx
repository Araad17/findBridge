import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import AdminScholarshipEditorPage from "./AdminScholarshipEditorPage";
import { api, errorMessage } from "../lib/api";
import { degreesText, scholarshipStatusLabels } from "../lib/labels";
import { formatDate, formatNumber } from "../lib/format";
import type { AdminScholarship } from "../types/adminScholarship";

type ListResponse = {
	items: AdminScholarship[];
	total: number;
	page: number;
	limit: number;
	counts: { all: number; published: number; draft: number; archived: number };
	countries: string[];
};

const PAGE_SIZE = 15;

export default function AdminScholarshipsPage({
	initialCreate = false,
	initialStatus,
}: {
	initialCreate?: boolean;
	initialStatus?: string;
}) {
	const [data, setData] = useState<ListResponse | null>(null);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState(initialStatus ?? "");
	const [country, setCountry] = useState("");
	const [page, setPage] = useState(1);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	// undefined = فهرست، null = بورسیه جدید، عدد = ویرایش
	const [editingId, setEditingId] = useState<number | null | undefined>(initialCreate ? null : undefined);
	const [notice, setNotice] = useState("");
	const [error, setError] = useState("");

	const load = useCallback(() => {
		api<ListResponse>("/admin/scholarships", {
			query: { q: search.trim(), status, country, page, limit: PAGE_SIZE },
		})
			.then((result) => {
				setData(result);
				setError("");
			})
			.catch((err) => setError(errorMessage(err)));
	}, [search, status, country, page]);

	useEffect(() => {
		// جستجو با کمی تأخیر تا برای هر کلید درخواست ارسال نشود
		const timer = window.setTimeout(load, 250);
		return () => window.clearTimeout(timer);
	}, [load]);

	const visibleScholarships = data?.items ?? [];
	const selectedScholarship = visibleScholarships.find((item) => item.id === selectedId);
	const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

	if (editingId !== undefined) {
		return (
			<AdminScholarshipEditorPage
				onBack={() => {
					setEditingId(undefined);
					load();
				}}
				scholarshipId={editingId}
			/>
		);
	}

	const archiveSelected = async () => {
		if (!selectedScholarship) return;
		try {
			await api(`/admin/scholarships/${selectedScholarship.id}/archive`, { method: "POST" });
			setNotice(`«${selectedScholarship.title}» بایگانی شد.`);
			setSelectedId(null);
			load();
		} catch (err) {
			setNotice(errorMessage(err));
		}
	};

	const deleteSelected = async () => {
		if (!selectedScholarship) return;
		try {
			await api(`/admin/scholarships/${selectedScholarship.id}`, { method: "DELETE" });
			setNotice(`«${selectedScholarship.title}» حذف شد.`);
			setSelectedId(null);
			load();
		} catch (err) {
			setNotice(errorMessage(err));
		}
	};

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-[20px] font-extrabold leading-8 text-ink">مدیریت بورسیه‌ها</h1>
					<p className="mt-1 text-[8px] text-[#89958f]">فرصت‌ها را ایجاد، بازبینی و منتشر کنید؛ تغییرات در سامانه مدیریت ثبت می‌شوند.</p>
				</div>
				<button className="rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" onClick={() => setEditingId(null)} type="button">+ افزودن بورسیه</button>
			</div>

			<div className="mb-3 flex flex-wrap items-center gap-2 text-[7px] font-semibold text-[#267162]">
				<span className="rounded-full bg-[#edf4f0] px-2 py-1">همه: {formatNumber(data?.counts.all ?? 0)}</span>
				<span>منتشرشده: {formatNumber(data?.counts.published ?? 0)}</span>
				<span>پیش‌نویس: {formatNumber(data?.counts.draft ?? 0)}</span>
				<span>بایگانی: {formatNumber(data?.counts.archived ?? 0)}</span>
			</div>

			<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
				<div className="mb-3 grid grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] gap-2 max-[700px]:grid-cols-1">
					<label className="sr-only" htmlFor="admin-scholarship-search">جستجوی بورسیه</label>
					<input
						className="rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] outline-none focus:border-forest"
						id="admin-scholarship-search"
						onChange={(event) => { setSearch(event.target.value); setPage(1); }}
						placeholder="نام بورسیه را بنویسید"
						value={search}
					/>
					<select className="filter-select py-2 text-[8px]" onChange={(event) => { setStatus(event.target.value); setPage(1); }} value={status}>
						<option value="">همه وضعیت‌ها</option>
						<option value="published">منتشرشده</option>
						<option value="draft">پیش‌نویس</option>
						<option value="archived">بایگانی</option>
					</select>
					<select className="filter-select py-2 text-[8px]" onChange={(event) => { setCountry(event.target.value); setPage(1); }} value={country}>
						<option value="">همه کشورها</option>
						{(data?.countries ?? []).map((item) => <option key={item}>{item}</option>)}
					</select>
					<button className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={() => { setSearch(""); setStatus(""); setCountry(""); setPage(1); }} type="button">پاک کردن</button>
				</div>

				{error && (
					<div className="mb-3 flex items-center gap-2 rounded-md bg-[#fbeaea] px-3 py-2 text-[7px] text-[#a14b4b]" role="alert">
						<Icon name="info" className="h-3 w-3 shrink-0" />
						{error}
					</div>
				)}

				<div className="overflow-x-auto">
					<table className="w-full min-w-[650px] text-right text-[7px]">
						<thead className="bg-[#f7f7f3] text-[#89958f]">
							<tr>
								<th className="px-2 py-2.5 font-medium">عنوان / مقطع</th>
								<th className="px-2 py-2.5 font-medium">منبع</th>
								<th className="px-2 py-2.5 font-medium">مهلت نهایی</th>
								<th className="px-2 py-2.5 font-medium">وضعیت</th>
								<th className="px-2 py-2.5 font-medium">عملیات</th>
							</tr>
						</thead>
						<tbody>
							{visibleScholarships.map((item) => (
								<tr className="border-t border-[#edf0ed] text-[#526963]" key={item.id}>
									<td className="px-2 py-3">
										<button className="text-right font-bold text-ink hover:text-[#267162]" onClick={() => setEditingId(item.id)} type="button">{item.title}</button>
										<p className="mt-1 text-[7px] text-[#89958f]">{degreesText(item.degreeLevels)}</p>
									</td>
									<td className="px-2 py-3">{item.country}</td>
									<td className="px-2 py-3">{formatDate(item.deadline, "—")}</td>
									<td className="px-2 py-3">
										<span className={`rounded-full px-2 py-1 ${item.status === "published" ? "bg-[#edf4f0] text-[#267162]" : item.status === "draft" ? "bg-[#fbf2dc] text-[#826a37]" : "bg-[#f0f1ef] text-[#72827d]"}`}>{scholarshipStatusLabels[item.status]}</span>
									</td>
									<td className="px-2 py-3 whitespace-nowrap">
										<button className="text-[#267162] hover:underline" onClick={() => setEditingId(item.id)} type="button">ویرایش</button>
										<span className="mx-1 text-[#c5ceca]">·</span>
										<button className="text-[#a35c51] hover:underline" onClick={() => { setSelectedId(item.id); setNotice(""); }} type="button">حذف</button>
									</td>
								</tr>
							))}
							{visibleScholarships.length === 0 && (
								<tr><td className="px-3 py-8 text-center text-[#89958f]" colSpan={5}>بورسیه‌ای با این مشخصات پیدا نشد.</td></tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="flex items-center justify-between border-t border-[#edf0ed] pt-3 text-[7px] text-[#89958f]">
					<span>نمایش {formatNumber(visibleScholarships.length)} از {formatNumber(data?.total ?? 0)} فرصت بورسیه</span>
					<div className="flex items-center gap-2">
						<button className="rounded-md border border-[#dfe8e3] px-3 py-1.5 text-[8px] font-semibold text-forest disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">صفحه قبل</button>
						<span>{formatNumber(page)} از {formatNumber(totalPages)}</span>
						<button className="rounded-md border border-[#dfe8e3] px-3 py-1.5 text-[8px] font-semibold text-forest disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button">صفحه بعد</button>
					</div>
				</div>
			</section>

			{selectedScholarship && (
				<div className="mt-3 grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
					<section className="rounded-lg border border-[#e7ebe7] bg-white p-4">
						<h2 className="text-[10px] font-bold text-ink">بایگانی یا حذف؟</h2>
						<p className="mt-2 text-[8px] leading-5 text-[#72827d]">بایگانی این فرصت را از فهرست عمومی خارج می‌کند و اطلاعات آن را نگه می‌دارد. حذف، این فرصت را برای همیشه پاک می‌کند.</p>
						<button className="mt-3 rounded-md bg-[#edf4f0] px-3 py-2 text-[8px] font-bold text-[#267162]" onClick={archiveSelected} type="button">بایگانی «{selectedScholarship.title}»</button>
					</section>
					<section className="rounded-lg border border-[#e7ebe7] bg-white p-4">
						<h2 className="text-[10px] font-bold text-ink">تأیید حذف بورسیه</h2>
						<p className="mt-2 text-[8px] leading-5 text-[#72827d]">آیا از حذف «{selectedScholarship.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.</p>
						<div className="mt-3 flex gap-2">
							<button className="rounded-md bg-[#b95045] px-3 py-2 text-[8px] font-bold text-white" onClick={deleteSelected} type="button">تأیید حذف</button>
							<button className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={() => setSelectedId(null)} type="button">انصراف</button>
						</div>
					</section>
				</div>
			)}
			{notice && <p className="mt-3 rounded-md bg-[#eaf3ef] px-3 py-2 text-[8px] text-[#267162]" role="status">{notice}</p>}
		</div>
	);
}
