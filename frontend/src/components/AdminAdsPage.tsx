import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { api, ApiError, errorMessage } from "../lib/api";
import { adStatusLabels, placementLabels } from "../lib/labels";
import { formatDate } from "../lib/format";

type Advertisement = {
	id: number | null;
	title: string;
	subtitle: string | null;
	description: string | null;
	destination: string;
	placement: "home" | "scholarships" | "guide";
	imageUrl: string | null;
	startDate: string | null;
	endDate: string | null;
	status: "active" | "draft" | "ended";
	visible: boolean;
};
type Draft = {
	id: number | null;
	title: string;
	subtitle: string;
	description: string;
	destination: string;
	placement: Advertisement["placement"];
	imageUrl: string | null;
	startDate: string;
	endDate: string;
	status: Advertisement["status"];
	visible: boolean;
};

const blankDraft: Draft = {
	id: null, title: "", subtitle: "", description: "", destination: "https://",
	placement: "home", imageUrl: null, startDate: "", endDate: "", status: "draft", visible: true,
};
const toDraft = (ad: Advertisement): Draft => ({
	id: ad.id, title: ad.title, subtitle: ad.subtitle ?? "", description: ad.description ?? "",
	destination: ad.destination, placement: ad.placement, imageUrl: ad.imageUrl,
	startDate: ad.startDate ?? "", endDate: ad.endDate ?? "", status: ad.status, visible: ad.visible,
});

export default function AdminAdsPage({ initialCreate = false }: { initialCreate?: boolean }) {
	const [ads, setAds] = useState<Advertisement[]>([]);
	const [search, setSearch] = useState("");
	const [placementFilter, setPlacementFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [draft, setDraft] = useState<Draft | null>(initialCreate ? blankDraft : null);
	const [showDelete, setShowDelete] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
	const fileInput = useRef<HTMLInputElement>(null);

	const load = useCallback(() => {
		api<{ items: Advertisement[] }>("/admin/ads", { query: { q: search.trim(), placement: placementFilter, status: statusFilter } })
			.then((data) => setAds(data.items))
			.catch((error) => setNotice({ type: "error", text: errorMessage(error) }));
	}, [search, placementFilter, statusFilter]);

	useEffect(() => {
		const timer = window.setTimeout(load, 250);
		return () => window.clearTimeout(timer);
	}, [load]);

	const selectedId = draft?.id ?? null;
	const selectedAd = ads.find((ad) => ad.id === selectedId) ?? null;
	const selectAd = (ad: Advertisement) => {
		setDraft(toDraft(ad));
		setFieldErrors({});
		setNotice(null);
		setShowDelete(false);
	};
	const updateDraft = (changes: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...changes } : current));
	const err = (key: string) => (fieldErrors[key] ? <span className="mt-1 block text-[7px] font-normal text-[#a14b4b]">{fieldErrors[key]}</span> : null);

	const saveDraft = async () => {
		if (!draft) return;
		setFieldErrors({});
		try {
			const body = { ...draft, imageUrl: undefined, id: undefined };
			const result = await api<{ ad: Advertisement }>(draft.id === null ? "/admin/ads" : `/admin/ads/${draft.id}`, {
				method: draft.id === null ? "POST" : "PUT",
				body,
			});
			setDraft(toDraft(result.ad));
			setNotice({ type: "ok", text: "تبلیغ ذخیره شد." });
			load();
		} catch (error) {
			if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
			setNotice({ type: "error", text: errorMessage(error) });
		}
	};

	const uploadImage = async (file: File) => {
		if (!draft?.id) {
			setNotice({ type: "error", text: "ابتدا تبلیغ را ذخیره کنید، سپس تصویر را بارگذاری کنید." });
			return;
		}
		const body = new FormData();
		body.append("image", file);
		try {
			const result = await api<{ ad: Advertisement }>(`/admin/ads/${draft.id}/image`, { method: "POST", form: body });
			updateDraft({ imageUrl: result.ad.imageUrl });
			setNotice({ type: "ok", text: "تصویر تبلیغ تغییر کرد." });
			load();
		} catch (error) {
			setNotice({ type: "error", text: errorMessage(error) });
		}
	};

	const deleteSelected = async () => {
		if (!selectedAd?.id) return;
		try {
			await api(`/admin/ads/${selectedAd.id}`, { method: "DELETE" });
			setNotice({ type: "ok", text: `تبلیغ «${selectedAd.title}» حذف شد.` });
			setDraft(null);
			setShowDelete(false);
			load();
		} catch (error) {
			setNotice({ type: "error", text: errorMessage(error) });
		}
	};

	const filteredAds = ads;

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-[20px] font-extrabold leading-8 text-ink">مدیریت تبلیغات</h1>
					<p className="mt-1 text-[8px] text-[#89958f]">تبلیغات سایت را ایجاد، زمان‌بندی و مدیریت کنید.</p>
				</div>
				<button className="rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" onClick={() => { setDraft(blankDraft); setFieldErrors({}); setNotice(null); setShowDelete(false); }} type="button">+ افزودن تبلیغ</button>
			</div>

			<div className="mb-3 flex items-center gap-2 rounded-md bg-[#fbf2dc] px-3 py-2 text-[7px] text-[#826a37]">
				<Icon name="info" className="h-3 w-3 shrink-0" />
				برای حفظ تجربه کاربری، متن و تصویر تبلیغ را بازبینی کنید و بازه نمایش آن را مشخص نمایید.
			</div>

			<section className="mb-3 rounded-lg border border-[#e7ebe7] bg-white p-3">
				<h2 className="mb-3 text-[10px] font-bold text-ink">فهرست تبلیغات</h2>
				<div className="mb-3 grid grid-cols-[minmax(0,1.3fr)_minmax(120px,1fr)_minmax(120px,1fr)] gap-2 max-[700px]:grid-cols-1">
					<input className="rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] outline-none focus:border-forest" onChange={(event) => setSearch(event.target.value)} placeholder="نام تبلیغ را بنویسید" value={search} />
					<select className="filter-select py-2 text-[8px]" onChange={(event) => setPlacementFilter(event.target.value)} value={placementFilter}>
						<option value="">همه جایگاه‌ها</option>{Object.entries(placementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
					</select>
					<select className="filter-select py-2 text-[8px]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
						<option value="">همه وضعیت‌ها</option>{Object.entries(adStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
					</select>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[600px] text-right text-[7px]">
						<thead className="bg-[#f7f7f3] text-[#89958f]">
							<tr>
								<th className="px-2 py-2 font-medium">عنوان تبلیغ</th>
								<th className="px-2 py-2 font-medium">جایگاه</th>
								<th className="px-2 py-2 font-medium">بازه نمایش</th>
								<th className="px-2 py-2 font-medium">وضعیت</th>
								<th className="px-2 py-2 font-medium">عملیات</th>
							</tr>
						</thead>
						<tbody>
							{filteredAds.map((ad) => (
								<tr className={`cursor-pointer border-t border-[#edf0ed] text-[#526963] ${ad.id === selectedId ? "bg-[#f6faf8]" : ""}`} key={ad.id} onClick={() => selectAd(ad)}>
									<td className="px-2 py-2.5 font-bold text-ink">{ad.title}</td>
									<td className="px-2 py-2.5">{placementLabels[ad.placement]}</td>
									<td className="px-2 py-2.5">{formatDate(ad.startDate, "—")} – {formatDate(ad.endDate, "—")}</td>
									<td className="px-2 py-2.5">
										<span className={`rounded-full px-2 py-1 ${ad.status === "active" ? "bg-[#edf4f0] text-[#267162]" : ad.status === "draft" ? "bg-[#fbf2dc] text-[#826a37]" : "bg-[#f0f1ef] text-[#72827d]"}`}>{adStatusLabels[ad.status]}</span>
									</td>
									<td className="whitespace-nowrap px-2 py-2.5">
										<button className="text-[#267162] hover:underline" onClick={(event) => { event.stopPropagation(); selectAd(ad); document.getElementById("advertisement-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} type="button">ویرایش</button>
										<span className="mx-1 text-[#c5ceca]">·</span>
										<button className="text-[#a94e45] hover:underline" onClick={(event) => { event.stopPropagation(); selectAd(ad); setShowDelete(true); }} type="button">حذف</button>
									</td>
								</tr>
							))}
							{filteredAds.length === 0 && <tr><td className="px-3 py-6 text-center text-[#89958f]" colSpan={5}>تبلیغی با این مشخصات پیدا نشد.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>

			<div className="grid grid-cols-[minmax(0,1fr)_minmax(230px,0.72fr)] items-start gap-3 max-[800px]:grid-cols-1">
				<section className="rounded-lg border border-[#e7ebe7] bg-white p-3" id="advertisement-editor">
					<h2 className="mb-3 text-[10px] font-bold text-ink">{draft?.id === null ? "تبلیغ جدید" : `ویرایش تبلیغ ${selectedAd ? placementLabels[selectedAd.placement] : ""}`}</h2>
					{draft ? (
						<div className="space-y-2.5">
							<label className="block text-[8px] font-bold text-[#526963]">عنوان تبلیغ *
								<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] outline-none focus:border-forest" onChange={(event) => updateDraft({ title: event.target.value })} value={draft.title} />{err("title")}
							</label>
							<label className="block text-[8px] font-bold text-[#526963]">جایگاه نمایش *
								<select className="filter-select mt-1 py-2 text-[8px]" onChange={(event) => updateDraft({ placement: event.target.value as Draft["placement"] })} value={draft.placement}>
									{Object.entries(placementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
								</select>
							</label>
							<label className="block text-[8px] font-bold text-[#526963]">عنوان فرعی
								<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px]" onChange={(event) => updateDraft({ subtitle: event.target.value })} value={draft.subtitle} />
							</label>
							<label className="block text-[8px] font-bold text-[#526963]">متن تبلیغ
								<textarea className="mt-1 h-12 w-full resize-y rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px]" onChange={(event) => updateDraft({ description: event.target.value })} value={draft.description} />
							</label>
							<label className="block text-[8px] font-bold text-[#526963]">پیوند مقصد *
								<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-left text-[8px]" dir="ltr" onChange={(event) => updateDraft({ destination: event.target.value })} value={draft.destination} />{err("destination")}
							</label>
							<div className="grid grid-cols-2 gap-2">
								<label className="text-[8px] font-bold text-[#526963]">آغاز نمایش
									<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-2 py-2 text-[8px]" dir="ltr" onChange={(event) => updateDraft({ startDate: event.target.value })} type="date" value={draft.startDate} />
								</label>
								<label className="text-[8px] font-bold text-[#526963]">پایان نمایش
									<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-2 py-2 text-[8px]" dir="ltr" onChange={(event) => updateDraft({ endDate: event.target.value })} type="date" value={draft.endDate} />{err("endDate")}
								</label>
							</div>
							<div className="flex items-center justify-between rounded-md border border-dashed border-[#dfe8e3] px-3 py-2">
								<div>
									<p className="text-[8px] font-bold text-[#526963]">تصویر تبلیغ</p>
									<p className="mt-1 text-[7px] text-[#89958f]">ابعاد پیشنهادی: ۱۲۰۰ × ۶۰۰</p>
								</div>
								<button className="rounded-md border border-[#dfe8e3] px-2.5 py-1.5 text-[7px] font-bold text-forest" onClick={() => fileInput.current?.click()} type="button">{draft.imageUrl ? "تغییر تصویر" : "بارگذاری تصویر"}</button>
								<input accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} ref={fileInput} type="file" />
							</div>
							<label className="block text-[8px] font-bold text-[#526963]">وضعیت تبلیغ
								<select className="filter-select mt-1 py-2 text-[8px]" onChange={(event) => updateDraft({ status: event.target.value as Advertisement["status"] })} value={draft.status}>
									{Object.entries(adStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
								</select>
							</label>
							<label className="flex items-center gap-2 text-[7px] text-[#526963]">
								<input checked={draft.visible} className="accent-[#267162]" onChange={(event) => updateDraft({ visible: event.target.checked })} type="checkbox" />
								نمایش در جایگاه انتخاب‌شده
							</label>
							<div className="flex justify-end gap-2">
								<button className="rounded-md bg-forest px-3 py-2 text-[7px] font-bold text-white" onClick={saveDraft} type="button">ذخیره تبلیغ</button>
							</div>
						</div>
					) : <p className="text-[8px] text-[#89958f]">برای ویرایش، یک تبلیغ از فهرست انتخاب کنید.</p>}
				</section>

				<aside className="space-y-3">
					<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
						<h2 className="mb-2 text-[10px] font-bold text-ink">پیش‌نمایش جایگاه</h2>
						<div className="overflow-hidden rounded-md border border-[#eee5d3] bg-[#fbf2dc]">
							<div className="grid h-24 place-items-center bg-[#efe6d3] text-[#927b52]">
								{draft?.imageUrl ? <img alt="" className="h-full w-full object-cover" src={draft.imageUrl} /> : <Icon name="book" className="h-8 w-8" />}
							</div>
							<div className="p-3">
								<p className="text-[6px] text-[#99814b]">{draft?.subtitle || "فرصت مناسب آینده تحصیلی شما"}</p>
								<h3 className="mt-1 text-[10px] font-bold text-ink">{draft?.title || "عنوان تبلیغ"}</h3>
								<p className="mt-1 text-[7px] leading-4 text-[#72827d]">{draft?.description || "مسیر تحصیلی خود را پیدا کنید و برای فرصت بعدی آماده شوید."}</p>
								<button className="mt-2 rounded-md bg-white px-2 py-1 text-[7px] font-semibold text-forest" type="button">مشاهده بیشتر</button>
							</div>
						</div>
						<p className="mt-2 text-[7px] text-[#89958f]">نمایش فعلی در: {draft ? placementLabels[draft.placement] : "جایگاه انتخاب نشده"}</p>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
						<h2 className="text-[10px] font-bold text-ink">حذف تبلیغ</h2>
						<p className="mt-2 text-[7px] leading-4 text-[#89958f]">با حذف تبلیغ، از تمام جایگاه‌های نمایش خارج می‌شود.</p>
						<button className="mt-3 rounded-md border border-[#f0d7d3] px-3 py-1.5 text-[7px] font-bold text-[#a94e45]" disabled={!selectedAd} onClick={() => setShowDelete(true)} type="button">حذف این تبلیغ</button>
					</section>

					{showDelete && selectedAd && (
						<section className="rounded-lg border border-[#f0d7d3] bg-white p-3">
							<h2 className="text-[9px] font-bold text-[#a94e45]">تأیید حذف</h2>
							<p className="mt-2 text-[7px] leading-4 text-[#72827d]">تبلیغ «{selectedAd.title}» حذف شود؟</p>
							<div className="mt-2 flex gap-2">
								<button className="rounded-md bg-[#b95045] px-2.5 py-1.5 text-[7px] font-bold text-white" onClick={deleteSelected} type="button">تأیید حذف</button>
								<button className="rounded-md border border-[#dfe8e3] px-2.5 py-1.5 text-[7px] font-bold text-forest" onClick={() => setShowDelete(false)} type="button">انصراف</button>
							</div>
						</section>
					)}
				</aside>
			</div>
			{notice && <p className={`mt-3 rounded-md px-3 py-2 text-[8px] ${notice.type === "ok" ? "bg-[#eaf3ef] text-[#267162]" : "bg-[#fbeaea] text-[#a14b4b]"}`} role="status">{notice.text}</p>}
		</div>
	);
}
