import { useEffect, useState, type FormEvent } from "react";
import Icon from "./Icon";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatNumber } from "../lib/format";

type ReferralData = {
	code: string;
	link: string;
	stats: { total: number; registered: number; invited: number };
	items: Array<{ id: number; name: string; status: "invited" | "registered"; createdAt: string }>;
};

export default function ReferralPage() {
	const [data, setData] = useState<ReferralData | null>(null);
	const [copied, setCopied] = useState(false);
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
	const [busy, setBusy] = useState(false);

	const load = () =>
		api<ReferralData>("/referrals")
			.then(setData)
			.catch((error) => setMessage({ type: "error", text: errorMessage(error) }));

	useEffect(() => {
		void load();
	}, []);

	const copyLink = async () => {
		if (!data) return;
		try {
			await navigator.clipboard.writeText(data.link);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2500);
		} catch {
			setMessage({ type: "error", text: "کپی خودکار ممکن نشد؛ پیوند را به‌صورت دستی انتخاب و کپی کنید." });
		}
	};

	const invite = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setBusy(true);
		setMessage(null);
		try {
			await api("/referrals/invite", { method: "POST", body: { email, name: name || undefined } });
			setEmail("");
			setName("");
			setMessage({ type: "ok", text: "دعوت‌نامه ارسال شد." });
			await load();
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
		} finally {
			setBusy(false);
		}
	};

	const stats = data?.stats;
	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<section className="mb-5 text-center">
				<h1 className="text-[20px] font-extrabold leading-9 text-ink">فرصت‌ها را با دوستان‌تان شریک بسازید</h1>
				<p className="mt-1 text-[8px] text-[#89958f]">دوستان خود را به سایت بورسیه‌یار دعوت کنید و با هم در این مسیر تحصیلی پیش بروید.</p>
			</section>

			<div className="grid grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] items-start gap-4 max-[800px]:grid-cols-1">
				<section className="rounded-lg border border-[#e7ebe7] bg-white px-5 py-5">
					<div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#edf0ed] bg-[#f8faf8] text-[#267162]">
						<Icon name="users" className="h-6 w-6" />
					</div>
					<h2 className="text-[11px] font-bold text-ink">با هم، آماده‌تر می‌شویم</h2>
					<p className="mt-3 text-[9px] leading-5 text-[#72827d]">
						با دعوت دوستان خود از بورسیه‌یار، فرصتی برای افرادی فراهم می‌کنید که به دنبال ادامه تحصیل هستند.
					</p>
					<form className="mt-4 space-y-2" onSubmit={invite}>
						<input
							aria-label="نام دوست (اختیاری)"
							className="w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[9px] outline-none focus:border-forest"
							maxLength={60}
							onChange={(event) => setName(event.target.value)}
							placeholder="نام دوست (اختیاری)"
							value={name}
						/>
						<input
							aria-label="ایمیل دوست"
							className="w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-left text-[9px] outline-none focus:border-forest"
							dir="ltr"
							onChange={(event) => setEmail(event.target.value)}
							placeholder="friend@example.com"
							required
							type="email"
							value={email}
						/>
						<button className="rounded-md bg-forest px-4 py-2 text-[8px] font-bold text-white disabled:opacity-60" disabled={busy} type="submit">
							{busy ? "در حال ارسال..." : "ارسال دعوت‌نامه"}
						</button>
					</form>
				</section>

				<section className="rounded-lg border border-[#e7ebe7] bg-white px-5 py-5">
					<h2 className="text-[11px] font-bold text-ink">پیوند دعوت شخصی شما</h2>
					<p className="mt-2 text-[8px] leading-4 text-[#89958f]">پیوند زیر را در گروه‌ها یا شبکه‌های اجتماعی خود منتشر کنید:</p>
					<div className="mt-3 flex items-center gap-2 rounded-md bg-[#f7f9f7] px-3 py-2">
						<input
							aria-label="پیوند دعوت"
							className="min-w-0 flex-1 border-0 bg-transparent text-left text-[9px] text-[#526963] outline-none"
							dir="ltr"
							onFocus={(event) => event.target.select()}
							readOnly
							value={data?.link ?? ""}
						/>
						<button className="shrink-0 rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" onClick={copyLink} type="button">
							{copied ? "کپی شد" : "کپی پیوند"}
						</button>
					</div>
					<div className="mt-3 flex items-center gap-1.5 text-[7px] leading-4 text-[#267162]">
						<Icon name="shield" className="h-3 w-3" />
						این پیوند مخصوص شماست و هر ثبت‌نام از طریق آن به نام شما ثبت می‌شود.
					</div>
				</section>
			</div>

			<section className="mt-4 grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
				{[
					["۱", "کل دعوت‌ها", formatNumber(stats?.total ?? 0)],
					["۲", "در انتظار ثبت‌نام", formatNumber(stats?.invited ?? 0)],
					["۳", "ثبت‌نام‌شده", formatNumber(stats?.registered ?? 0)],
				].map(([number, title, value]) => (
					<div className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-3" key={title}>
						<div className="flex items-center justify-between">
							<p className="text-[9px] font-bold text-ink">{title}</p>
							<span className="grid h-5 w-5 place-items-center rounded-full bg-[#edf4f0] text-[8px] font-bold text-[#267162]">{number}</span>
						</div>
						<p className="mt-2 text-[16px] font-extrabold text-ink">{value}</p>
					</div>
				))}
			</section>

			<section className="mt-4 rounded-lg border border-[#e7ebe7] bg-white px-5 py-5">
				<h2 className="text-[11px] font-bold text-ink">وضعیت دعوت‌ها</h2>
				<p className="mt-1 text-[7px] text-[#89958f]">برای حفظ حریم خصوصی، فقط نام کوتاه، تاریخ و وضعیت هر دعوت نمایش داده می‌شود.</p>
				<div className="mt-3 overflow-x-auto">
					<table className="w-full min-w-[420px] text-right text-[8px]">
						<thead className="text-[#89958f]">
							<tr>
								<th className="py-2 font-medium">دوست دعوت‌شده</th>
								<th className="py-2 font-medium">تاریخ دعوت</th>
								<th className="py-2 font-medium">وضعیت</th>
							</tr>
						</thead>
						<tbody>
							{(data?.items ?? []).map((row) => (
								<tr className="border-t border-[#edf0ed] text-[#526963]" key={row.id}>
									<td className="py-3">{row.name}</td>
									<td className="py-3">{formatDate(row.createdAt)}</td>
									<td className="py-3">{row.status === "registered" ? "ثبت‌نام کرده" : "در انتظار ثبت‌نام"}</td>
								</tr>
							))}
							{data && data.items.length === 0 && (
								<tr>
									<td className="py-6 text-center text-[#98a49e]" colSpan={3}>
										هنوز کسی را دعوت نکرده‌اید.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{message && (
				<p className={`mt-3 rounded-md px-3 py-2 text-[8px] ${message.type === "ok" ? "bg-[#eaf3ef] text-[#267162]" : "bg-[#fbeaea] text-[#a14b4b]"}`} role="status">
					{message.text}
				</p>
			)}
		</div>
	);
}
