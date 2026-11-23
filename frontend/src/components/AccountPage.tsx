import { useState, type FormEvent } from "react";
import Icon from "./Icon";
import { useAuth } from "../lib/auth";
import { api, ApiError, errorMessage } from "../lib/api";

type View = "form" | "forgot" | "reset";

export default function AccountPage({
	mode,
	onSwitch,
	onHome,
	onSuccess,
	refCode,
	resetToken,
	onResetDone,
}: {
	mode: "login" | "signup";
	onSwitch: (mode: "login" | "signup") => void;
	onHome: () => void;
	onSuccess: (role: "user" | "admin") => void;
	refCode?: string;
	resetToken?: string;
	onResetDone?: () => void;
}) {
	const { login, signup } = useAuth();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState("");
	const [success, setSuccess] = useState("");
	const [remember, setRemember] = useState(false);
	const [busy, setBusy] = useState(false);
	const [view, setView] = useState<View>(resetToken ? "reset" : "form");
	const isSignup = mode === "signup" && view === "form";
	const showName = isSignup;
	const showEmail = view !== "reset";
	const showPassword = view !== "forgot";
	const showConfirm = isSignup || view === "reset";

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMessage("");
		setSuccess("");
		if (showConfirm && password !== confirmPassword) {
			setMessage("رمز عبور و تکرار آن یکسان نیستند.");
			return;
		}
		setBusy(true);
		try {
			if (view === "forgot") {
				const result = await api<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } });
				setSuccess(result.message);
			} else if (view === "reset") {
				await api("/auth/reset-password", { method: "POST", body: { token: resetToken, password } });
				setSuccess("رمز عبور تغییر کرد. اکنون می‌توانید وارد شوید.");
				setPassword("");
				setConfirmPassword("");
				setView("form");
				onResetDone?.();
			} else if (isSignup) {
				await signup({ name, email, password, ref: refCode });
				onSuccess("user");
			} else {
				const user = await login({ email, password, remember });
				onSuccess(user.role === "admin" || user.role === "expert" ? "admin" : "user");
			}
		} catch (error) {
			const fields = error instanceof ApiError ? error.fields : undefined;
			setMessage(fields ? Object.values(fields)[0] : errorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="mx-auto max-w-5xl px-5 pb-10 pt-7 lg:px-8">
			<div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-[#e6ebe7] bg-white shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
				<section className="bg-forest px-6 py-7 text-white sm:px-8 sm:py-9">
					<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2bb4d] text-forest">
						<Icon name="book" className="h-5 w-5" />
					</span>
					<p className="mt-5 text-[9px] font-semibold text-[#f2bb4d]">
						بورسیه‌یار، همراه مسیر آینده شما
					</p>
					<h1 className="mt-2 text-xl font-extrabold leading-9">
						{isSignup ? "حساب خود را بسازید" : "خوش آمدید"}
					</h1>
					<p className="mt-2 text-[9px] leading-6 text-white/70">
						{isSignup
							? "با ساخت حساب، فرصت‌های تحصیلی مناسب خود را ذخیره و پیگیری کنید."
							: "برای پیگیری فرصت‌های ذخیره‌شده و ادامه مسیر تحصیلی خود وارد شوید."}
					</p>
					<ul className="mt-5 space-y-3 text-[8px] text-white/80">
						<li className="flex items-center gap-2">
							<span className="text-[#f2bb4d]">✓</span>دسترسی به فرصت‌های به‌روز
							بورسیه
						</li>
						<li className="flex items-center gap-2">
							<span className="text-[#f2bb4d]">✓</span>ذخیره و پیگیری فرصت‌های
							موردعلاقه
						</li>
						<li className="flex items-center gap-2">
							<span className="text-[#f2bb4d]">✓</span>آمادگی بهتر برای درخواست
							تحصیلی
						</li>
					</ul>
				</section>

				<section className="px-6 py-7 sm:px-8 sm:py-9">
					<button
						className="text-[8px] text-[#72827d] hover:text-forest"
						onClick={onHome}
						type="button"
					>
						← بازگشت به صفحه اصلی
					</button>
					<h2 className="mt-4 text-base font-extrabold text-ink">
						{view === "forgot" ? "بازیابی رمز عبور" : view === "reset" ? "تعیین رمز عبور جدید" : isSignup ? "ساخت حساب کاربری" : "ورود به حساب کاربری"}
					</h2>
					<p className="mt-1 text-[8px] text-[#89958f]">
						{view === "forgot"
							? "ایمیل حساب خود را وارد کنید تا لینک بازیابی برایتان ارسال شود."
							: view === "reset"
								? "رمز عبور جدید خود را وارد کنید."
								: isSignup
									? "اطلاعات خود را برای ایجاد حساب وارد کنید."
									: "اطلاعات حساب خود را وارد کنید."}
					</p>
					<form className="mt-5 space-y-3" onSubmit={handleSubmit}>
						{showName && (
							<label className="block text-[8px] font-medium text-[#526963]">
								نام و نام خانوادگی
								<input
									autoComplete="name"
									className="mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2.5 text-[9px] text-ink outline-none focus:border-forest"
									onChange={(event) => setName(event.target.value)}
									placeholder="نام خود را وارد کنید"
									required
									value={name}
								/>
							</label>
						)}
						{showEmail && (
						<label className="block text-[8px] font-medium text-[#526963]">
							ایمیل
							<input
								autoComplete="email"
								className="mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2.5 text-left text-[9px] text-ink outline-none focus:border-forest"
								dir="ltr"
								onChange={(event) => setEmail(event.target.value)}
								placeholder="name@example.com"
								required
								type="email"
								value={email}
							/>
						</label>
						)}
						{showPassword && (
						<label className="block text-[8px] font-medium text-[#526963]">
							{view === "reset" ? "رمز عبور جدید" : "رمز عبور"}
							<input
								autoComplete={isSignup || view === "reset" ? "new-password" : "current-password"}
								className="mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2.5 text-[9px] text-ink outline-none focus:border-forest"
								minLength={8}
								onChange={(event) => setPassword(event.target.value)}
								placeholder="حداقل ۸ نویسه"
								required
								type="password"
								value={password}
							/>
						</label>
						)}
						{showConfirm && (
							<label className="block text-[8px] font-medium text-[#526963]">
								تکرار رمز عبور
								<input
									autoComplete="new-password"
									className="mt-1.5 w-full rounded-md border border-[#e5e9e5] bg-white px-3 py-2.5 text-[9px] text-ink outline-none focus:border-forest"
									minLength={8}
									onChange={(event) => setConfirmPassword(event.target.value)}
									placeholder="رمز عبور را دوباره وارد کنید"
									required
									type="password"
									value={confirmPassword}
								/>
							</label>
						)}
						{mode === "login" && view === "form" && (
							<div className="flex items-center justify-between text-[8px]">
								<label className="flex items-center gap-1.5 text-[#72827d]">
									<input
										checked={remember}
										className="h-3 w-3 accent-[#267162]"
										onChange={(event) => setRemember(event.target.checked)}
										type="checkbox"
									/>
									مرا به خاطر بسپار
								</label>
								<button
									className="text-[#267162] hover:underline"
									onClick={() => {
										setView("forgot");
										setMessage("");
										setSuccess("");
									}}
									type="button"
								>
									بازیابی رمز عبور
								</button>
							</div>
						)}
						{success && (
							<p
								aria-live="polite"
								className="rounded-md bg-[#eaf3ef] px-3 py-2 text-[8px] leading-4 text-[#2f6b5d]"
							>
								{success}
							</p>
						)}
						{message && (
							<p
								aria-live="polite"
								className="rounded-md bg-sand px-3 py-2 text-[8px] leading-4 text-[#826a37]"
							>
								{message}
							</p>
						)}
						<button
							className="w-full rounded-md bg-forest px-3 py-2.5 text-[9px] font-semibold text-white transition hover:bg-[#0a332f] disabled:opacity-60"
							disabled={busy}
							type="submit"
						>
							{busy ? "لطفاً صبر کنید..." : view === "forgot" ? "ارسال لینک بازیابی" : view === "reset" ? "ذخیره رمز عبور" : isSignup ? "ساخت حساب" : "ورود"}
						</button>
					</form>

					{view !== "form" ? (
						<p className="mt-4 text-center text-[8px] text-[#72827d]">
							<button
								className="font-bold text-forest hover:underline"
								onClick={() => {
									setView("form");
									setMessage("");
									setSuccess("");
								}}
								type="button"
							>
								بازگشت به ورود
							</button>
						</p>
					) : (
					<p className="mt-4 text-center text-[8px] text-[#72827d]">
						{mode === "signup" ? "قبلاً حساب ساخته‌اید؟" : "هنوز حساب ندارید؟"}
						<button
							className="mr-1 font-bold text-forest hover:underline"
							onClick={() => onSwitch(mode === "signup" ? "login" : "signup")}
							type="button"
						>
							{mode === "signup" ? "ورود" : "ساخت حساب"}
						</button>
					</p>
					)}
				</section>
			</div>
		</main>
	);
}

