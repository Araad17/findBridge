import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { api, errorMessage } from "../lib/api";
import { formatDateTime, formatDayMonth, formatWeekday, formatNumber } from "../lib/format";

type Consultant = { id: number; name: string; specialty: string | null; detail: string | null };
type SlotDay = { date: string; weekday: number; times: Array<{ startsAt: string; label: string; durationMinutes: number }> };
type Consultation = {
	id: number;
	startsAt: string;
	status: "booked" | "cancelled" | "done";
	meetingUrl: string | null;
	topic: string | null;
	consultant: { id: number; name: string };
};

export default function ConsultationPage() {
	const [consultants, setConsultants] = useState<Consultant[]>([]);
	const [consultantId, setConsultantId] = useState<number | null>(null);
	const [days, setDays] = useState<SlotDay[]>([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [date, setDate] = useState<string | null>(null);
	const [startsAt, setStartsAt] = useState<string | null>(null);
	const [topic, setTopic] = useState("");
	const [note, setNote] = useState("");
	const [mine, setMine] = useState<Consultation[]>([]);
	const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
	const [busy, setBusy] = useState(false);

	const loadMine = useCallback(() => {
		api<{ items: Consultation[] }>("/consultations")
			.then((data) => setMine(data.items))
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		api<{ items: Consultant[] }>("/consultants")
			.then((data) => {
				setConsultants(data.items);
				setConsultantId((current) => current ?? data.items[0]?.id ?? null);
			})
			.catch((error) => setMessage({ type: "error", text: errorMessage(error) }));
		loadMine();
	}, [loadMine]);

	const loadSlots = useCallback((id: number) => {
		setSlotsLoading(true);
		setDate(null);
		setStartsAt(null);
		api<{ days: SlotDay[] }>(`/consultants/${id}/slots`, { query: { days: 14 } })
			.then((data) => {
				setDays(data.days);
				setDate(data.days[0]?.date ?? null);
			})
			.catch((error) => setMessage({ type: "error", text: errorMessage(error) }))
			.finally(() => setSlotsLoading(false));
	}, []);

	useEffect(() => {
		if (consultantId !== null) loadSlots(consultantId);
	}, [consultantId, loadSlots]);

	const selectedDay = useMemo(() => days.find((day) => day.date === date), [days, date]);
	const selectedTime = selectedDay?.times.find((time) => time.startsAt === startsAt);
	const consultant = consultants.find((item) => item.id === consultantId);
	const upcoming = mine.filter((item) => item.status === "booked" && new Date(item.startsAt) > new Date());

	const reserve = async () => {
		if (consultantId === null || !startsAt) return;
		setBusy(true);
		setMessage(null);
		try {
			await api("/consultations", { method: "POST", body: { consultantId, startsAt, topic, note } });
			setMessage({ type: "ok", text: `جلسه با ${consultant?.name ?? "مشاور"} در ${formatDateTime(startsAt)} رزرو شد` });
			setNote("");
			setTopic("");
			loadMine();
			loadSlots(consultantId);
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
			loadSlots(consultantId); // احتمالاً زمان توسط شخص دیگری رزرو شده است
		} finally {
			setBusy(false);
		}
	};

	const cancel = async (id: number) => {
		if (!window.confirm("این جلسه لغو شود؟")) return;
		try {
			await api(`/consultations/${id}`, { method: "DELETE" });
			loadMine();
			if (consultantId !== null) loadSlots(consultantId);
		} catch (error) {
			setMessage({ type: "error", text: errorMessage(error) });
		}
	};

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<section className="mb-5 text-center">
				<h1 className="text-[21px] font-extrabold leading-9 text-ink">یک گفت‌وگو، یک قدم روشن‌تر</h1>
				<p className="mt-1 text-[8px] leading-4 text-[#89958f]">برای بررسی مسیر تحصیلی، انتخاب رشته و آمادگی برای اپلای با مشاوران باتجربه صحبت کنید.</p>
				<div className="mt-2 flex justify-center">
					<div className="flex items-center gap-1.5 rounded-md bg-[#fbf2dc] px-3 py-1.5 text-[7px] text-[#826a37]">
						<Icon name="info" className="h-3 w-3" />
						جلسه‌ها رایگان است؛ حداقل یک ساعت قبل از شروع می‌توانید زمان رزرو کنید.
					</div>
				</div>
			</section>

			<div className="grid grid-cols-[minmax(0,1fr)_260px] items-start gap-4 max-[800px]:grid-cols-1">
				<div className="space-y-4">
					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[11px] font-bold text-ink">۱. مشاور و موضوع را انتخاب کنید</h2>
						<div className="space-y-2">
							{consultants.map((item, index) => (
								<button
									className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-right ${consultantId === item.id ? "border-[#267162] bg-[#edf6f2]" : "border-[#e5e9e5] bg-white"}`}
									key={item.id}
									onClick={() => setConsultantId(item.id)}
									type="button"
								>
									<span className="text-[9px] font-bold text-ink">{item.name}</span>
									<span className="max-w-[420px] text-[7px] leading-4 text-[#89958f]">
										{item.specialty}
										<br />
										{item.detail}
									</span>
									<span className={`grid h-6 w-6 place-items-center rounded-full text-[8px] font-bold ${consultantId === item.id ? "bg-[#267162] text-white" : "bg-[#eef1ee] text-[#6d817b]"}`}>
										{formatNumber(index + 1)}
									</span>
								</button>
							))}
							{consultants.length === 0 && <p className="text-[8px] text-[#89958f]">در حال حاضر مشاوری در دسترس نیست.</p>}
							<label className="block rounded-md border border-[#edf0ed] px-4 py-3 text-[8px] font-bold text-ink">
								موضوع جلسه
								<input
									className="mt-1 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] font-normal outline-none focus:border-forest"
									maxLength={200}
									onChange={(event) => setTopic(event.target.value)}
									placeholder="بررسی شرایط بورسیه، اپلای و انتخاب رشته تحصیلی"
									value={topic}
								/>
							</label>
						</div>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="mb-3 text-[11px] font-bold text-ink">۲. روز و ساعت را مشخص کنید</h2>
						{slotsLoading ? (
							<p className="text-[8px] text-[#89958f]">در حال بارگذاری زمان‌های آزاد...</p>
						) : days.length === 0 ? (
							<p className="text-[8px] text-[#89958f]">برای این مشاور در دو هفته آینده زمان آزادی وجود ندارد.</p>
						) : (
							<>
								<div className="grid grid-cols-4 gap-2 max-[700px]:grid-cols-2">
									{days.map((day) => (
										<button
											className={`rounded-md border px-2 py-2.5 text-center ${date === day.date ? "border-[#267162] bg-[#267162] text-white" : "border-[#e5e9e5] bg-[#fafbfa] text-[#526963]"}`}
											key={day.date}
											onClick={() => {
												setDate(day.date);
												setStartsAt(null);
											}}
											type="button"
										>
											<span className="block text-[8px] font-bold">{formatWeekday(day.date)}</span>
											<span className="mt-1 block text-[7px] opacity-75">{formatDayMonth(day.date)}</span>
										</button>
									))}
								</div>
								<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#edf0ed] pt-3">
									{(selectedDay?.times ?? []).map((time) => (
										<button
											className={`rounded-md px-3 py-1.5 text-[8px] ${startsAt === time.startsAt ? "bg-[#267162] font-bold text-white" : "bg-[#f5f7f5] text-[#526963]"}`}
											key={time.startsAt}
											onClick={() => setStartsAt(time.startsAt)}
											type="button"
										>
											{time.label.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}
										</button>
									))}
								</div>
							</>
						)}

						<label className="mt-3 block text-[8px] font-bold text-ink">
							یادداشت برای مشاور – اختیاری
							<textarea
								className="mt-2 h-16 w-full resize-none rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] font-normal outline-none focus:border-forest"
								maxLength={1000}
								onChange={(event) => setNote(event.target.value)}
								placeholder="می‌خواهید موضوع خود را با مشاور در میان بگذارید."
								value={note}
							/>
						</label>

						{selectedTime && (
							<div className="mt-3 rounded-md border border-[#dfe8e3] bg-[#edf4f1] px-3 py-2.5 text-[7px] text-[#526963]">
								<span className="ml-1 text-[#267162]">✓</span>
								زمان انتخاب‌شده: {formatDateTime(selectedTime.startsAt)}
							</div>
						)}

						<div className="mt-3 flex justify-end">
							<button
								className="rounded-md bg-forest px-4 py-2 text-[8px] font-bold text-white disabled:opacity-50"
								disabled={!startsAt || busy}
								onClick={reserve}
								type="button"
							>
								{busy ? "در حال ثبت..." : "ثبت و رزرو جلسه"}
							</button>
						</div>
					</section>
				</div>

				<aside className="space-y-4">
					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">جلسه‌های پیش رو</h2>
						{upcoming.length === 0 && <p className="mt-3 text-[8px] text-[#89958f]">جلسه‌ای رزرو نکرده‌اید.</p>}
						{upcoming.slice(0, 3).map((item) => (
							<div className="mt-3 rounded-md bg-[#edf4f1] px-3 py-3" key={item.id}>
								<p className="text-[9px] font-bold text-ink">{item.consultant.name}</p>
								<p className="mt-2 text-[7px] text-[#89958f]">{formatDateTime(item.startsAt)}</p>
								<div className="mt-2 flex gap-2">
									{item.meetingUrl && (
										<a className="rounded-md border border-[#dfe8e3] bg-white px-2 py-1 text-[7px] font-bold text-forest" href={item.meetingUrl} rel="noopener noreferrer" target="_blank">
											ورود به جلسه
										</a>
									)}
									<button className="rounded-md px-2 py-1 text-[7px] font-bold text-[#a14b4b]" onClick={() => cancel(item.id)} type="button">
										لغو جلسه
									</button>
								</div>
							</div>
						))}
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white px-4 py-4">
						<h2 className="text-[11px] font-bold text-ink">پیش از جلسه</h2>
						<ul className="mt-2 space-y-2 text-[7px] leading-4 text-[#72827d]">
							<li>✓ موضوع جلسه را مشخص کنید.</li>
							<li>✓ پرسش‌های خود را یادداشت کنید.</li>
							<li>✓ مدارک مرتبط را آماده داشته باشید.</li>
						</ul>
					</section>
				</aside>
			</div>

			{message && (
				<p className={`mt-3 rounded-md px-3 py-2 text-[8px] ${message.type === "ok" ? "bg-[#eaf3ef] text-[#267162]" : "bg-[#fbeaea] text-[#a14b4b]"}`} role="status">
					{message.text}
				</p>
			)}
		</div>
	);
}
