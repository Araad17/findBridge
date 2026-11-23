import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Icon from "./Icon";
import { api, errorMessage } from "../lib/api";
import { documentStatusLabels } from "../lib/labels";
import { formatBytes, formatDate, formatNumber } from "../lib/format";

type Doc = {
	id: number;
	name: string;
	originalName: string | null;
	mimeType: string;
	sizeBytes: number;
	status: "pending" | "in_review" | "approved" | "rejected";
	createdAt: string;
};

type DocsResponse = {
	items: Doc[];
	usage: { usedBytes: number; quotaBytes: number; total: number; approved: number; needsAttention: number };
};

const checklistItems = ["گذرنامه معتبر", "مدارک تحصیلی و ریزنمرات", "رزومه تحصیلی", "انگیزه‌نامه", "توصیه‌نامه", "مدرک زبان"];
const statusStyle: Record<Doc["status"], string> = {
	approved: "bg-[#edf4f0] text-[#267162]",
	in_review: "bg-[#fbf2dc] text-[#826a37]",
	pending: "bg-[#f0f2ef] text-[#526963]",
	rejected: "bg-[#fbeaea] text-[#a14b4b]",
};

export default function DocumentsPage() {
	const [data, setData] = useState<DocsResponse | null>(null);
	const [checked, setChecked] = useState<string[]>([]);
	const [name, setName] = useState("");
	const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
	const [uploading, setUploading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const pendingName = useRef<string | null>(null);

	const load = useCallback(() => {
		api<DocsResponse>("/documents")
			.then(setData)
			.catch((error) => setMessage({ type: "error", text: errorMessage(error) }));
	}, []);

	useEffect(() => {
		load();
		api<{ checked: string[] }>("/me/checklist/documents")
			.then((result) => setChecked(result.checked))
			.catch(() => undefined);
	}, [load]);

	const upload = async (file: File) => {
		setUploading(true);
		setMessage(null);
		const body = new FormData();
		body.append("name", pendingName.current ?? name);
		body.append("file", file);
		try {
			await api("/documents", { method: "POST", form: body });
			setMessage({ type: "ok", text: "سند بارگذاری شد و در انتظار بررسی است." });
			setName("");
			load();
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
		} finally {
			pendingName.current = null;
			setUploading(false);
		}
	};

	const pick = (presetName?: string) => {
		pendingName.current = presetName ?? null;
		fileInput.current?.click();
	};

	const onDrop = (event: DragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		setDragging(false);
		const file = event.dataTransfer.files?.[0];
		if (file) void upload(file);
	};

	const remove = async (doc: Doc) => {
		if (!window.confirm(`سند «${doc.name}» حذف شود؟`)) return;
		try {
			await api(`/documents/${doc.id}`, { method: "DELETE" });
			load();
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
		}
	};

	const toggle = (item: string) => {
		const value = !checked.includes(item);
		setChecked((current) => (value ? [...current, item] : current.filter((entry) => entry !== item)));
		api("/me/checklist/documents", { method: "PUT", body: { item, checked: value } }).catch(() => undefined);
	};

	const usage = data?.usage;
	const usedPercent = usage ? Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100)) : 0;

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<input
				accept="application/pdf,image/jpeg,image/png"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void upload(file);
					event.target.value = "";
				}}
				ref={fileInput}
				type="file"
			/>
			<div className="mb-5 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-[20px] font-extrabold leading-8 text-ink">اسناد من</h1>
					<p className="mt-1 text-[8px] leading-4 text-[#89958f]">یک جای امن برای آماده‌سازی و مدیریت مدارک تحصیلی شما</p>
					<div className="mt-2 flex items-center gap-1.5 text-[7px] text-[#72827d]">
						<Icon name="info" className="h-3 w-3 text-[#267162]" />
						اسناد شما فقط برای خودتان و بررسی‌کنندگان سامانه قابل مشاهده است؛ اطلاعات را با دقت وارد کنید.
					</div>
				</div>
				<button
					className="shrink-0 rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white disabled:opacity-60"
					disabled={uploading}
					onClick={() => pick()}
					type="button"
				>
					{uploading ? "در حال بارگذاری..." : "+ بارگذاری سند"}
				</button>
			</div>

			<section className="mb-4 grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
				{[
					[`${formatNumber(usedPercent)}٪`, "فضای استفاده‌شده", usage ? `${formatBytes(usage.usedBytes)} از ${formatBytes(usage.quotaBytes)}` : "—"],
					[formatNumber(usage?.approved ?? 0), "تأیید شده", "آماده برای ارسال درخواست"],
					[formatNumber(usage?.needsAttention ?? 0), "نیاز به بررسی", "در انتظار یا ردشده"],
				].map(([value, title, note]) => (
					<div className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4 text-center" key={title}>
						<p className="text-[16px] font-extrabold text-ink">{value}</p>
						<p className="mt-1 text-[9px] font-bold text-[#526963]">{title}</p>
						<p className="mt-1 text-[7px] text-[#98a49e]">{note}</p>
					</div>
				))}
			</section>

			<div className="grid grid-cols-[minmax(0,2.2fr)_minmax(210px,0.8fr)] items-start gap-4 max-[800px]:grid-cols-1">
				<div className="space-y-4">
					<label className="block text-[8px] font-medium text-[#526963]">
						نام سند (اختیاری)
						<input
							className="mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2 text-[9px] text-ink outline-none focus:border-forest"
							maxLength={120}
							onChange={(event) => setName(event.target.value)}
							placeholder="مثلاً پاسپورت"
							value={name}
						/>
					</label>
					<button
						className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-[#526963] ${dragging ? "border-forest bg-[#eef5f1]" : "border-[#98b9ae] bg-[#f7faf8]"}`}
						onClick={() => pick()}
						onDragLeave={() => setDragging(false)}
						onDragOver={(event) => {
							event.preventDefault();
							setDragging(true);
						}}
						onDrop={onDrop}
						type="button"
					>
						<Icon name="bookmark" className="mb-2 h-6 w-6 text-[#438b7a]" />
						<strong className="text-[10px] text-ink">سند را اینجا بکشید یا انتخاب کنید</strong>
						<span className="mt-2 text-[7px] text-[#98a49e]">فرمت‌های مجاز: PDF, JPG, PNG | حداکثر حجم فایل ۱۰ مگابایت</span>
					</button>

					<section className="overflow-hidden rounded-lg border border-[#e7ebe7] bg-white">
						<div className="border-b border-[#edf0ed] px-4 py-3">
							<h2 className="text-[11px] font-bold text-ink">فایل‌های بارگذاری‌شده</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[520px] text-right text-[8px]">
								<thead className="bg-[#fafbfa] text-[#89958f]">
									<tr>
										<th className="px-3 py-2.5 font-medium">نام سند</th>
										<th className="px-3 py-2.5 font-medium">وضعیت</th>
										<th className="px-3 py-2.5 font-medium">تاریخ/حجم</th>
										<th className="px-3 py-2.5 font-medium">عملیات</th>
									</tr>
								</thead>
								<tbody>
									{(data?.items ?? []).map((doc) => (
										<tr className="border-t border-[#edf0ed] text-[#526963]" key={doc.id}>
											<td className="px-3 py-3">
												<div className="flex items-center gap-2">
													<Icon name="clipboard" className="h-3.5 w-3.5 text-[#438b7a]" />
													<span className="font-bold text-ink">{doc.name}</span>
												</div>
											</td>
											<td className="px-3 py-3">
												<span className={`rounded-full px-2 py-1 text-[7px] ${statusStyle[doc.status]}`}>{documentStatusLabels[doc.status]}</span>
											</td>
											<td className="px-3 py-3">
												<p>{formatDate(doc.createdAt)}</p>
												<p className="mt-1 text-[7px] text-[#98a49e]">{formatBytes(doc.sizeBytes)}</p>
											</td>
											<td className="px-3 py-3">
												<a className="text-[7px] font-bold text-[#267162]" href={`/api/documents/${doc.id}/download`} rel="noopener noreferrer" target="_blank">
													مشاهده
												</a>
												<span className="mx-1 text-[#98a49e]">·</span>
												<button className="text-[7px] font-bold text-[#a14b4b]" onClick={() => remove(doc)} type="button">
													حذف
												</button>
											</td>
										</tr>
									))}
									{data && data.items.length === 0 && (
										<tr>
											<td className="px-3 py-8 text-center text-[#98a49e]" colSpan={4}>
												هنوز سندی بارگذاری نکرده‌اید.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>
				</div>

				<aside className="space-y-4">
					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">چک‌لیست مدارک</h2>
						<div className="mt-3 space-y-2 text-[8px] text-[#526963]">
							{checklistItems.map((label) => (
								<label className="flex items-center gap-2" key={label}>
									<input checked={checked.includes(label)} className="h-3 w-3 accent-[#267162]" onChange={() => toggle(label)} type="checkbox" />
									{label}
								</label>
							))}
						</div>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">توصیه‌نامه</h2>
						<p className="mt-2 text-[8px] leading-4 text-[#89958f]">
							توصیه‌نامه‌های استادان یا کارفرمایان را بارگذاری کنید تا درخواست‌هایتان کامل شود.
						</p>
						<button
							className="mt-3 rounded-md border border-[#dfe8e3] px-3 py-1.5 text-[8px] font-bold text-forest"
							onClick={() => pick("توصیه‌نامه")}
							type="button"
						>
							افزودن توصیه‌نامه
						</button>
					</section>
				</aside>
			</div>

			{message && (
				<p
					className={`mt-3 rounded-md px-3 py-2 text-[8px] ${message.type === "ok" ? "bg-[#eaf3ef] text-[#267162]" : "bg-[#fbeaea] text-[#a14b4b]"}`}
					role="status"
				>
					{message.text}
				</p>
			)}
		</div>
	);
}
