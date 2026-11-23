import { useEffect, useState } from "react";
import Icon from "./Icon";
import { api, ApiError, errorMessage } from "../lib/api";
import { activityLabels, degreeLabels, fundingLabels } from "../lib/labels";
import { formatDate, formatDateTime } from "../lib/format";
import {
	emptyScholarshipForm,
	toForm,
	type AdminScholarship,
	type ScholarshipForm,
} from "../types/adminScholarship";
import type { DegreeLevel } from "../types/scholarships";

const fieldClass =
	"mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2 text-[8px] text-[#526963] outline-none focus:border-forest";

type Detail = {
	scholarship: AdminScholarship;
	lastEditor: string | null;
	history: Array<{ action: string; detail: string | null; createdAt: string; actor: string }>;
};

const timezones = ["وقت اروپای مرکزی — مطابق منبع", "وقت افغانستان", "وقت ایران", "وقت جهانی UTC"];

export default function AdminScholarshipEditorPage({
	scholarshipId,
	onBack,
}: {
	scholarshipId: number | null;
	onBack: () => void;
}) {
	const [id, setId] = useState<number | null>(scholarshipId);
	const [form, setForm] = useState<ScholarshipForm | null>(scholarshipId === null ? emptyScholarshipForm : null);
	const [docsText, setDocsText] = useState("");
	const [detail, setDetail] = useState<Detail | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
	const [saving, setSaving] = useState(false);

	const load = (targetId: number) =>
		api<Detail>(`/admin/scholarships/${targetId}`)
			.then((data) => {
				setDetail(data);
				const loaded = toForm(data.scholarship);
				setForm(loaded);
				setDocsText(loaded.requiredDocuments.join("\n"));
			})
			.catch((error) => setNotice({ type: "error", text: errorMessage(error) }));

	useEffect(() => {
		if (scholarshipId !== null) void load(scholarshipId);
	}, [scholarshipId]);

	if (!form) {
		return (
			<div className="mx-auto max-w-[1050px] px-5 py-10 text-center text-[9px] text-[#89958f]">
				{notice?.text ?? "در حال بارگذاری..."}
				<div>
					<button className="mt-3 text-forest underline" onClick={onBack} type="button">
						بازگشت به فهرست
					</button>
				</div>
			</div>
		);
	}

	const set = <K extends keyof ScholarshipForm>(key: K, value: ScholarshipForm[K]) =>
		setForm((current) => (current ? { ...current, [key]: value } : current));
	const err = (key: string) =>
		fieldErrors[key] ? <span className="mt-1 block text-[7px] font-normal text-[#a14b4b]">{fieldErrors[key]}</span> : null;

	const toggleDegree = (level: DegreeLevel) =>
		set(
			"degreeLevels",
			form.degreeLevels.includes(level) ? form.degreeLevels.filter((item) => item !== level) : [...form.degreeLevels, level],
		);

	const persist = async (status: ScholarshipForm["status"]) => {
		setSaving(true);
		setNotice(null);
		setFieldErrors({});
		const body = {
			...form,
			status,
			fundingType: form.fundingType || null,
			requiredDocuments: docsText.split("\n").map((line) => line.trim()).filter(Boolean),
		};
		try {
			const result = await api<{ scholarship: AdminScholarship }>(id === null ? "/admin/scholarships" : `/admin/scholarships/${id}`, {
				method: id === null ? "POST" : "PUT",
				body,
			});
			setId(result.scholarship.id);
			await load(result.scholarship.id);
			setNotice({ type: "ok", text: status === "published" ? "بورسیه منتشر شد." : "تغییرات بورسیه ذخیره شد." });
		} catch (error) {
			if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
			setNotice({ type: "error", text: errorMessage(error) });
		} finally {
			setSaving(false);
		}
	};

	const title = form.title || "جدید";
	const lastSaved = detail?.history[0];

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<button className="mb-1 inline-flex items-center gap-1 text-[8px] text-[#72827d] hover:text-forest" onClick={onBack} type="button">
						<Icon name="arrow" className="h-3 w-3 rotate-180" />
						بازگشت به فهرست بورسیه‌ها
					</button>
					<h1 className="text-[20px] font-extrabold leading-8 text-ink">{id === null ? "بورسیه جدید" : `ویرایش بورسیه ${title}`}</h1>
					<p className="mt-1 text-[8px] text-[#89958f]">
						بورسیه‌ها / {id === null ? "ایجاد" : "ویرایش"}
						{lastSaved ? ` / آخرین ذخیره: ${formatDateTime(lastSaved.createdAt)} توسط ${lastSaved.actor}` : ""}
					</p>
				</div>
			</div>

			<div className="mb-3 flex items-center gap-2 rounded-md bg-[#fbf2dc] px-3 py-2 text-[7px] text-[#826a37]">
				<Icon name="info" className="h-3 w-3 shrink-0" />
				{form.status === "published"
					? "این بورسیه منتشر شده است و تغییرات پس از ذخیره برای همه نمایش داده می‌شود."
					: "پیش از انتشار، تمام موارد الزامی (*) و منبع رسمی را تکمیل و بررسی کنید."}
			</div>

			<div className="grid grid-cols-[minmax(0,1fr)_230px] items-start gap-4 max-[850px]:grid-cols-1">
				<div className="space-y-3">
					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[11px] font-bold text-ink">اطلاعات اصلی</h2>
						<div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
							<label className="col-span-2 text-[8px] font-bold text-[#526963] max-[600px]:col-span-1">
								عنوان بورسیه *
								<input className={fieldClass} maxLength={200} onChange={(e) => set("title", e.target.value)} value={form.title} />
								{err("title")}
							</label>
							<label className="text-[8px] font-bold text-[#526963]">
								کشور مقصد *
								<input className={fieldClass} list="country-suggestions" onChange={(e) => set("country", e.target.value)} value={form.country} />
								<datalist id="country-suggestions">
									{["آلمان", "فنلاند", "ترکیه", "استرالیا", "دانمارک", "اروپا", "ژاپن", "همه کشورها"].map((item) => (
										<option key={item} value={item} />
									))}
								</datalist>
								{err("country")}
							</label>
							<label className="text-[8px] font-bold text-[#526963]">
								ارائه‌کننده
								<input className={fieldClass} onChange={(e) => set("provider", e.target.value)} value={form.provider} />
							</label>
							<fieldset className="text-[8px] font-bold text-[#526963]">
								<legend>مقطع تحصیلی *</legend>
								<div className="mt-2 flex flex-wrap gap-3 font-normal">
									{(Object.keys(degreeLabels) as DegreeLevel[]).map((level) => (
										<label className="flex items-center gap-1.5" key={level}>
											<input checked={form.degreeLevels.includes(level)} className="accent-[#267162]" onChange={() => toggleDegree(level)} type="checkbox" />
											{degreeLabels[level]}
										</label>
									))}
								</div>
								{err("degreeLevels")}
							</fieldset>
							<label className="text-[8px] font-bold text-[#526963]">
								رشته‌های تحصیلی
								<input className={fieldClass} onChange={(e) => set("field", e.target.value)} placeholder="توسعه، اقتصاد، مهندسی" value={form.field} />
							</label>
						</div>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							شرح فرصت *
							<textarea className={`${fieldClass} h-24 resize-y`} onChange={(e) => set("description", e.target.value)} value={form.description} />
							{err("description")}
						</label>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							برچسب (مثلاً «پیشنهاد ویژه»)
							<input className={fieldClass} maxLength={60} onChange={(e) => set("badge", e.target.value)} value={form.badge} />
						</label>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[11px] font-bold text-ink">شرایط متقاضیان</h2>
						<label className="block text-[8px] font-bold text-[#526963]">
							شرایط پذیرش و صلاحیت
							<textarea className={`${fieldClass} h-16 resize-y`} onChange={(e) => set("eligibility", e.target.value)} value={form.eligibility} />
						</label>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							شرایط تحصیلی و تجربه
							<textarea className={`${fieldClass} h-14 resize-y`} onChange={(e) => set("requirements", e.target.value)} value={form.requirements} />
						</label>
						<div className="mt-3 grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
							<label className="flex items-center gap-2 text-[8px] font-bold text-[#526963]">
								<input checked={form.languageRequired} className="accent-[#267162]" onChange={(e) => set("languageRequired", e.target.checked)} type="checkbox" />
								مدرک زبان لازم است
							</label>
							<label className="text-[8px] font-bold text-[#526963]">
								توضیح شرایط زبان
								<input className={fieldClass} onChange={(e) => set("languageNote", e.target.value)} value={form.languageNote} />
							</label>
						</div>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[11px] font-bold text-ink">پوشش مالی و اسناد</h2>
						<label className="block text-[8px] font-bold text-[#526963]">
							نوع پوشش
							<select className={fieldClass} onChange={(e) => set("fundingType", e.target.value as ScholarshipForm["fundingType"])} value={form.fundingType}>
								<option value="">مشخص نشده</option>
								{Object.entries(fundingLabels).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</label>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							جزئیات حمایت مالی
							<textarea className={`${fieldClass} h-14 resize-y`} onChange={(e) => set("fundingDetails", e.target.value)} value={form.fundingDetails} />
						</label>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							اسناد مورد نیاز (هر سند در یک خط)
							<textarea className={`${fieldClass} h-20 resize-y`} onChange={(e) => setDocsText(e.target.value)} value={docsText} />
						</label>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[11px] font-bold text-ink">تاریخ‌ها و منبع رسمی</h2>
						<div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
							<label className="text-[8px] font-bold text-[#526963]">
								آغاز درخواست
								<input className={`${fieldClass} text-left`} dir="ltr" onChange={(e) => set("startDate", e.target.value)} type="date" value={form.startDate} />
								{form.startDate && <span className="mt-1 block text-[7px] font-normal text-[#89958f]">{formatDate(form.startDate)}</span>}
							</label>
							<label className="text-[8px] font-bold text-[#526963]">
								مهلت درخواست *
								<input className={`${fieldClass} text-left`} dir="ltr" onChange={(e) => set("deadline", e.target.value)} type="date" value={form.deadline} />
								{form.deadline && <span className="mt-1 block text-[7px] font-normal text-[#89958f]">{formatDate(form.deadline)}</span>}
								{err("deadline")}
							</label>
						</div>
						<div className="mt-3 grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
							<label className="text-[8px] font-bold text-[#526963]">
								توضیح مهلت
								<input className={fieldClass} onChange={(e) => set("deadlineNote", e.target.value)} value={form.deadlineNote} />
							</label>
							<label className="text-[8px] font-bold text-[#526963]">
								منطقه زمانی مهلت
								<select className={fieldClass} onChange={(e) => set("deadlineTimezone", e.target.value)} value={form.deadlineTimezone}>
									<option value="">مشخص نشده</option>
									{timezones.map((item) => (
										<option key={item}>{item}</option>
									))}
								</select>
							</label>
						</div>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							نشانی منبع رسمی *
							<input className={`${fieldClass} text-left`} dir="ltr" onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://..." value={form.sourceUrl} />
							{err("sourceUrl")}
						</label>
						<label className="mt-3 block text-[8px] font-bold text-[#526963]">
							پیوند مستقیم درخواست *
							<input
								aria-invalid={Boolean(fieldErrors.applicationUrl)}
								className={`${fieldClass} text-left`}
								dir="ltr"
								onChange={(e) => set("applicationUrl", e.target.value)}
								placeholder="https://..."
								value={form.applicationUrl}
							/>
							{err("applicationUrl")}
						</label>
						<label className="mt-3 flex items-start gap-2 text-[8px] text-[#526963]">
							<input checked={form.confirmVerified} className="mt-0.5 accent-[#267162]" onChange={(e) => set("confirmVerified", e.target.checked)} type="checkbox" />
							<span>
								شرایط، مهلت و پیوند را در منبع رسمی بررسی کرده‌ام.
								{detail?.scholarship.lastVerifiedAt && <span className="block text-[7px] text-[#89958f]">آخرین بررسی: {formatDate(detail.scholarship.lastVerifiedAt)}</span>}
								{err("confirmVerified")}
							</span>
						</label>
					</section>
				</div>

				<aside className="space-y-3">
					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">تنظیمات انتشار</h2>
						<p className="mt-3 text-[8px] font-bold text-[#526963]">وضعیت محتوا</p>
						<select className={fieldClass} onChange={(e) => set("status", e.target.value as ScholarshipForm["status"])} value={form.status}>
							<option value="draft">پیش‌نویس</option>
							<option value="published">منتشرشده</option>
							<option value="archived">بایگانی</option>
						</select>
						<label className="mt-3 flex items-center gap-2 text-[8px] text-[#526963]">
							<input checked={form.featured} className="accent-[#267162]" onChange={(e) => set("featured", e.target.checked)} type="checkbox" />
							نمایش بورسیه در فرصت‌های منتخب
						</label>
						<button className="mt-3 w-full rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white disabled:opacity-60" disabled={saving} onClick={() => persist(form.status)} type="button">
							{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
						</button>
						{form.status !== "published" && (
							<button className="mt-2 w-full rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest disabled:opacity-60" disabled={saving} onClick={() => persist("published")} type="button">
								انتشار این فرصت
							</button>
						)}
						<p className="mt-3 text-[7px] leading-4 text-[#89958f]">انتشار، بورسیه را برای متقاضیان قابل مشاهده می‌کند.</p>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[10px] font-bold text-ink">سابقه تغییرات</h2>
						{(detail?.history ?? []).length === 0 && <p className="mt-2 text-[7px] text-[#89958f]">هنوز تغییری ثبت نشده است.</p>}
						{(detail?.history ?? []).slice(0, 6).map((item) => (
							<p className="mt-2 text-[7px] leading-4 text-[#89958f]" key={`${item.createdAt}-${item.action}`}>
								{formatDateTime(item.createdAt)}
								<br />
								{activityLabels[item.action] ?? item.action} توسط {item.actor}
							</p>
						))}
					</section>
				</aside>
			</div>

			{notice && (
				<p className={`mt-3 rounded-md px-3 py-2 text-[8px] ${notice.type === "ok" ? "bg-[#eaf3ef] text-[#267162]" : "bg-[#fbeaea] text-[#a14b4b]"}`} role="status">
					{notice.text}
				</p>
			)}
			<div className="mt-3 flex justify-end gap-2">
				<button className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={onBack} type="button">
					بازگشت به فهرست
				</button>
			</div>
		</div>
	);
}
