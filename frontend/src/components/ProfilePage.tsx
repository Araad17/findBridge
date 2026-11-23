import { useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";

type Profile = {
	firstName: string;
	lastName: string;
	name: string;
	email: string;
	gender: "female" | "male" | null;
	birthPlace: string | null;
	birthDate: string | null;
	fieldOfStudy: string | null;
	university: string | null;
	degreeLevel: "bachelor" | "master" | "phd" | null;
	graduationYear: number | null;
	bio: string | null;
	phone: string | null;
	avatarUrl: string | null;
	lastLoginAt: string | null;
	notifyPrefs: { deadlines: boolean; events: boolean; tips: boolean };
};

type Form = {
	firstName: string;
	lastName: string;
	gender: string;
	birthPlace: string;
	birthDate: string;
	fieldOfStudy: string;
	university: string;
	degreeLevel: string;
	graduationYear: string;
	bio: string;
	phone: string;
	notifyPrefs: Profile["notifyPrefs"];
};

const toForm = (p: Profile): Form => ({
	firstName: p.firstName,
	lastName: p.lastName,
	gender: p.gender ?? "",
	birthPlace: p.birthPlace ?? "",
	birthDate: p.birthDate ?? "",
	fieldOfStudy: p.fieldOfStudy ?? "",
	university: p.university ?? "",
	degreeLevel: p.degreeLevel ?? "",
	graduationYear: p.graduationYear ? String(p.graduationYear) : "",
	bio: p.bio ?? "",
	phone: p.phone ?? "",
	notifyPrefs: p.notifyPrefs,
});

const notifyItems: Array<[keyof Profile["notifyPrefs"], string]> = [
	["deadlines", "ایمیل اسناد و مهلت‌ها"],
	["events", "هشدارهای رویدادهای جدید"],
	["tips", "گزارش‌ها و پیشنهادهای آموزشی"],
];

export default function ProfilePage() {
	const { refresh } = useAuth();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [form, setForm] = useState<Form | null>(null);
	const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [passwordOpen, setPasswordOpen] = useState(false);
	const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
	const fileInput = useRef<HTMLInputElement>(null);

	const load = () =>
		api<{ profile: Profile }>("/me/profile")
			.then((data) => {
				setProfile(data.profile);
				setForm(toForm(data.profile));
			})
			.catch((error) => setMessage({ type: "error", text: errorMessage(error) }));

	useEffect(() => {
		void load();
	}, []);

	const inputClass =
		"mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2 text-[9px] text-ink outline-none focus:border-forest";

	if (!form || !profile) {
		return (
			<div className="mx-auto max-w-[1050px] px-5 py-10 text-center text-[10px] text-[#81908a]">
				{message?.text ?? "در حال بارگذاری..."}
			</div>
		);
	}

	const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => (current ? { ...current, [key]: value } : current));
	const fieldError = (key: string) =>
		fieldErrors[key] ? <span className="mt-1 block text-[7px] text-[#a14b4b]">{fieldErrors[key]}</span> : null;

	const save = async () => {
		setSaving(true);
		setMessage(null);
		setFieldErrors({});
		try {
			const data = await api<{ profile: Profile }>("/me/profile", {
				method: "PUT",
				body: { ...form, gender: form.gender || null, degreeLevel: form.degreeLevel || null },
			});
			setProfile(data.profile);
			setForm(toForm(data.profile));
			setMessage({ type: "ok", text: "تغییرات پروفایل با موفقیت ذخیره شد" });
			void refresh();
		} catch (error) {
			if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
			setMessage({ type: "error", text: errorMessage(error) });
		} finally {
			setSaving(false);
		}
	};

	const uploadAvatar = async (file: File) => {
		const body = new FormData();
		body.append("avatar", file);
		try {
			const data = await api<{ profile: Profile }>("/me/avatar", { method: "POST", form: body });
			setProfile(data.profile);
			setMessage({ type: "ok", text: "تصویر پروفایل تغییر کرد" });
			void refresh();
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
		}
	};

	const changePassword = async () => {
		if (passwords.newPassword !== passwords.confirm) {
			setMessage({ type: "error", text: "رمز عبور جدید و تکرار آن یکسان نیستند." });
			return;
		}
		try {
			await api("/me/password", {
				method: "POST",
				body: { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword },
			});
			setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
			setPasswordOpen(false);
			setMessage({ type: "ok", text: "رمز عبور تغییر کرد" });
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
		}
	};

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<h1 className="mb-4 text-[21px] font-extrabold leading-8 text-ink">پروفایل من</h1>

			<div className="grid grid-cols-[minmax(0,1fr)_minmax(220px,0.33fr)] items-start gap-4 max-[800px]:grid-cols-1">
				<div className="space-y-4">
					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[12px] font-bold text-ink">اطلاعات شخصی</h2>
						<div className="grid grid-cols-2 gap-x-4 gap-y-3 max-[700px]:grid-cols-1">
							<label className="text-[9px] font-medium text-[#526963]">
								نام
								<input className={inputClass} onChange={(e) => set("firstName", e.target.value)} value={form.firstName} />
								{fieldError("firstName")}
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								نام خانوادگی
								<input className={inputClass} onChange={(e) => set("lastName", e.target.value)} value={form.lastName} />
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								جنسیت
								<select className={inputClass} onChange={(e) => set("gender", e.target.value)} value={form.gender}>
									<option value="">انتخاب نشده</option>
									<option value="female">زن</option>
									<option value="male">مرد</option>
								</select>
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								محل تولد
								<input className={inputClass} onChange={(e) => set("birthPlace", e.target.value)} value={form.birthPlace} />
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								تاریخ تولد
								<input
									className={`${inputClass} text-left`}
									dir="ltr"
									onChange={(e) => set("birthDate", e.target.value)}
									type="date"
									value={form.birthDate}
								/>
								{fieldError("birthDate")}
							</label>
						</div>

						<h3 className="mb-3 mt-5 text-[11px] font-bold text-ink">پیشینه تحصیلی</h3>
						<div className="grid grid-cols-2 gap-x-4 gap-y-3 max-[700px]:grid-cols-1">
							<label className="text-[9px] font-medium text-[#526963]">
								رشته تحصیلی
								<input className={inputClass} onChange={(e) => set("fieldOfStudy", e.target.value)} value={form.fieldOfStudy} />
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								دانشگاه
								<input className={inputClass} onChange={(e) => set("university", e.target.value)} value={form.university} />
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								مقطع تحصیلی
								<select className={inputClass} onChange={(e) => set("degreeLevel", e.target.value)} value={form.degreeLevel}>
									<option value="">انتخاب نشده</option>
									<option value="bachelor">کارشناسی</option>
									<option value="master">کارشناسی ارشد</option>
									<option value="phd">دکتری</option>
								</select>
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								سال فارغ‌التحصیلی
								<input
									className={`${inputClass} text-left`}
									dir="ltr"
									inputMode="numeric"
									onChange={(e) => set("graduationYear", e.target.value)}
									value={form.graduationYear}
								/>
							</label>
						</div>

						<div className="mt-4">
							<label className="block text-[9px] font-medium text-[#526963]">
								توضیحات
								<textarea
									className={`${inputClass} h-16 resize-none`}
									onChange={(e) => set("bio", e.target.value)}
									placeholder="فعالیت‌ها، پروژه‌ها و دستاوردهای تحصیلی"
									value={form.bio}
								/>
							</label>
						</div>

						<h3 className="mb-3 mt-5 text-[11px] font-bold text-ink">اطلاعات تماس</h3>
						<div className="grid grid-cols-2 gap-x-4 gap-y-3 max-[700px]:grid-cols-1">
							<label className="text-[9px] font-medium text-[#526963]">
								ایمیل
								<input className={`${inputClass} bg-[#f7f9f7] text-left`} dir="ltr" readOnly value={profile.email} />
								<span className="mt-1 block text-[7px] text-[#98a49e]">
									برای تغییر ایمیل با پشتیبانی تماس بگیرید تا هویت شما تایید شود
								</span>
							</label>
							<label className="text-[9px] font-medium text-[#526963]">
								شماره تماس
								<input
									className={`${inputClass} text-left`}
									dir="ltr"
									onChange={(e) => set("phone", e.target.value)}
									value={form.phone}
								/>
								{fieldError("phone")}
							</label>
						</div>
					</section>
				</div>

				<aside className="space-y-4">
					<section className="relative rounded-lg border border-[#e7ebe7] bg-white px-4 pb-4 pt-12 text-center">
						<div className="absolute right-4 top-3 text-right">
							<h2 className="text-[11px] font-bold text-ink">{profile.name}</h2>
							<p className="mt-0.5 text-[7px] text-[#89958f]">{profile.email}</p>
						</div>
						{profile.avatarUrl ? (
							<img alt="" className="mx-auto h-20 w-20 rounded-full border-2 border-white object-cover shadow-sm" src={profile.avatarUrl} />
						) : (
							<div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-white bg-[#e5ece8] text-[28px] font-extrabold text-[#527269] shadow-sm">
								{profile.firstName.charAt(0)}
							</div>
						)}
						<input
							accept="image/png,image/jpeg,image/webp"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) void uploadAvatar(file);
								e.target.value = "";
							}}
							ref={fileInput}
							type="file"
						/>
						<button
							className="mt-3 rounded-md border border-[#dfe8e3] px-3 py-1.5 text-[8px] font-bold text-forest"
							onClick={() => fileInput.current?.click()}
							type="button"
						>
							تغییر تصویر
						</button>
						<p className="mt-2 text-[7px] leading-4 text-[#98a49e]">فرمت‌های JPG، PNG یا WebP تا ۱۰ مگابایت</p>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">امنیت حساب</h2>
						<p className="mt-2 text-[8px] text-[#89958f]">آخرین ورود: {formatDateTime(profile.lastLoginAt)}</p>
						{passwordOpen ? (
							<div className="mt-3 space-y-2">
								{(
									[
										["currentPassword", "رمز عبور فعلی"],
										["newPassword", "رمز عبور جدید (حداقل ۸ نویسه)"],
										["confirm", "تکرار رمز عبور جدید"],
									] as const
								).map(([key, label]) => (
									<input
										aria-label={label}
										autoComplete={key === "currentPassword" ? "current-password" : "new-password"}
										className={inputClass}
										key={key}
										onChange={(e) => setPasswords((current) => ({ ...current, [key]: e.target.value }))}
										placeholder={label}
										type="password"
										value={passwords[key]}
									/>
								))}
								<div className="flex gap-2">
									<button className="flex-1 rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" onClick={changePassword} type="button">
										ذخیره رمز
									</button>
									<button className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={() => setPasswordOpen(false)} type="button">
										انصراف
									</button>
								</div>
							</div>
						) : (
							<button
								className="mt-3 w-full rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest"
								onClick={() => setPasswordOpen(true)}
								type="button"
							>
								تغییر رمز عبور
							</button>
						)}
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">تنظیمات اطلاع‌رسانی</h2>
						{notifyItems.map(([key, label]) => (
							<label className="mt-3 flex cursor-pointer items-center gap-2 text-[8px] text-[#526963]" key={key}>
								<input
									checked={form.notifyPrefs[key]}
									className="h-3 w-3 accent-[#267162]"
									onChange={(e) => set("notifyPrefs", { ...form.notifyPrefs, [key]: e.target.checked })}
									type="checkbox"
								/>
								{label}
							</label>
						))}
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
			<div className="mt-3 flex items-center justify-end gap-2">
				<button
					className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest"
					onClick={() => {
						setForm(toForm(profile));
						setFieldErrors({});
						setMessage(null);
					}}
					type="button"
				>
					انصراف
				</button>
				<button
					className="rounded-md bg-forest px-4 py-2 text-[8px] font-bold text-white disabled:opacity-60"
					disabled={saving}
					onClick={save}
					type="button"
				>
					{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
				</button>
			</div>
		</div>
	);
}
