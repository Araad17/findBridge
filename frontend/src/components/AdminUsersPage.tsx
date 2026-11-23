import { useCallback, useEffect, useState, type FormEvent } from "react";
import Icon from "./Icon";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { activityLabels, documentStatusLabels, roleLabels, userStatusLabels } from "../lib/labels";
import { formatBytes, formatDate, formatDateTime, formatNumber } from "../lib/format";

type UserRole = "applicant" | "consultant" | "admin" | "expert";
type UserStatus = "active" | "pending" | "blocked";
type AdminUser = {
	id: number;
	name: string;
	email: string;
	emailVerified: boolean;
	role: UserRole;
	status: UserStatus;
	createdAt: string;
	lastLoginAt: string | null;
};
type UserDetail = {
	user: AdminUser;
	documentCount: number;
	history: Array<{ action: string; detail: string | null; createdAt: string; actor: string }>;
};
type UserDoc = { id: number; name: string; status: string; sizeBytes: number; createdAt: string };

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
	const { user: me } = useAuth();
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [total, setTotal] = useState(0);
	const [query, setQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [detail, setDetail] = useState<UserDetail | null>(null);
	const [docs, setDocs] = useState<UserDoc[] | null>(null);
	const [newEmail, setNewEmail] = useState("");
	const [deleteConfirmation, setDeleteConfirmation] = useState(false);
	const [creating, setCreating] = useState(false);
	const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "applicant" as UserRole });
	const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

	const ok = (text: string) => setNotice({ type: "ok", text });
	const fail = (error: unknown) => setNotice({ type: "error", text: errorMessage(error) });

	const load = useCallback(() => {
		api<{ items: AdminUser[]; total: number }>("/admin/users", {
			query: { q: query.trim(), role: roleFilter, status: statusFilter, page, limit: PAGE_SIZE },
		})
			.then((data) => {
				setUsers(data.items);
				setTotal(data.total);
			})
			.catch(fail);
	}, [query, roleFilter, statusFilter, page]);

	useEffect(() => {
		const timer = window.setTimeout(load, 250);
		return () => window.clearTimeout(timer);
	}, [load]);

	const loadDetail = useCallback((id: number) => {
		api<UserDetail>(`/admin/users/${id}`).then(setDetail).catch(fail);
	}, []);

	useEffect(() => {
		setDocs(null);
		setNewEmail("");
		if (selectedId === null) {
			setDetail(null);
			return;
		}
		loadDetail(selectedId);
	}, [selectedId, loadDetail]);

	const selectedUser = users.find((item) => item.id === selectedId) ?? detail?.user ?? null;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const updateSelectedUser = async (changes: Partial<{ name: string; role: UserRole; status: UserStatus }>) => {
		if (!selectedUser) return;
		try {
			await api(`/admin/users/${selectedUser.id}`, { method: "PATCH", body: changes });
			ok("اطلاعات کاربر ذخیره شد.");
			load();
			loadDetail(selectedUser.id);
		} catch (error) {
			fail(error);
			load();
		}
	};

	const deleteSelectedUser = async () => {
		if (!selectedUser) return;
		try {
			await api(`/admin/users/${selectedUser.id}`, { method: "DELETE" });
			ok(`حساب «${selectedUser.name}» حذف شد.`);
			setSelectedId(null);
			setDeleteConfirmation(false);
			load();
		} catch (error) {
			fail(error);
		}
	};

	const createUser = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await api("/admin/users", { method: "POST", body: createForm });
			ok("کاربر جدید ایجاد شد.");
			setCreating(false);
			setCreateForm({ name: "", email: "", password: "", role: "applicant" });
			load();
		} catch (error) {
			fail(error);
		}
	};

	const sendVerification = async () => {
		if (!selectedUser) return;
		try {
			await api(`/admin/users/${selectedUser.id}/email-verification`, { method: "POST", body: newEmail ? { newEmail } : {} });
			ok(newEmail ? "پیوند تایید به ایمیل جدید ارسال شد." : "پیوند تایید ایمیل ارسال شد.");
			setNewEmail("");
			loadDetail(selectedUser.id);
		} catch (error) {
			fail(error);
		}
	};

	const sendReset = async () => {
		if (!selectedUser) return;
		try {
			await api(`/admin/users/${selectedUser.id}/password-reset`, { method: "POST" });
			ok("پیوند بازنشانی رمز عبور ارسال شد.");
			loadDetail(selectedUser.id);
		} catch (error) {
			fail(error);
		}
	};

	const showDocs = async () => {
		if (!selectedUser) return;
		try {
			const data = await api<{ items: UserDoc[] }>(`/admin/users/${selectedUser.id}/documents`);
			setDocs(data.items);
		} catch (error) {
			fail(error);
		}
	};

	const reviewDoc = async (docId: number, status: "approved" | "rejected") => {
		if (!selectedUser) return;
		try {
			await api(`/admin/users/${selectedUser.id}/documents/${docId}`, { method: "PATCH", body: { status } });
			await showDocs();
			loadDetail(selectedUser.id);
		} catch (error) {
			fail(error);
		}
	};

	return (
		<div className="mx-auto max-w-[1050px] px-5 py-5 max-[700px]:px-3">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-[20px] font-extrabold leading-8 text-ink">کاربران و پشتیبان حساب</h1>
					<p className="mt-1 text-[8px] text-[#89958f]">مدیریت کاربران، نقش‌ها و دسترسی‌ها را از این صفحه انجام دهید.</p>
				</div>
				<button className="rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" onClick={() => setCreating((value) => !value)} type="button">+ ایجاد کاربر</button>
			</div>

			<div className="mb-3 flex items-center gap-2 rounded-md bg-[#edf4f0] px-3 py-2 text-[7px] text-[#526963]">
				<Icon name="info" className="h-3 w-3 shrink-0 text-[#267162]" />
				با دقت نقش‌ها و دسترسی‌ها را مدیریت کنید. تغییرات حساب کاربران در سامانه ثبت می‌شوند.
			</div>

			{creating && (
				<form className="mb-3 grid grid-cols-2 gap-3 rounded-lg border border-[#e7ebe7] bg-white p-3 max-[700px]:grid-cols-1" onSubmit={createUser}>
					<label className="text-[8px] font-bold text-[#526963]">نام و نام خانوادگی<input className="mt-1.5 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] font-normal outline-none focus:border-forest" onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required value={createForm.name} /></label>
					<label className="text-[8px] font-bold text-[#526963]">ایمیل<input className="mt-1.5 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] font-normal outline-none focus:border-forest text-left" dir="ltr" onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required type="email" value={createForm.email} /></label>
					<label className="text-[8px] font-bold text-[#526963]">رمز عبور موقت (حداقل ۸ نویسه)<input autoComplete="new-password" className="mt-1.5 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] font-normal outline-none focus:border-forest text-left" dir="ltr" minLength={8} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required type="password" value={createForm.password} /></label>
					<label className="text-[8px] font-bold text-[#526963]">نقش<select className="filter-select mt-1.5 py-2 text-[8px]" onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })} value={createForm.role}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
					<div className="col-span-2 flex gap-2 max-[700px]:col-span-1"><button className="rounded-md bg-forest px-3 py-2 text-[8px] font-bold text-white" type="submit">ایجاد کاربر</button><button className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={() => setCreating(false)} type="button">انصراف</button></div>
				</form>
			)}

			<div className="grid grid-cols-[minmax(0,1.3fr)_minmax(235px,0.9fr)] items-start gap-4 max-[850px]:grid-cols-1">
				<div className="space-y-3">
					<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
						<h2 className="mb-3 text-[10px] font-bold text-ink">جستجوی کاربران</h2>
						<label className="sr-only" htmlFor="admin-user-search">نام یا ایمیل کاربر</label>
						<input
							className="w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] outline-none focus:border-forest"
							id="admin-user-search"
							onChange={(event) => { setQuery(event.target.value); setPage(1); }}
							placeholder="نام یا ایمیل کاربر"
							value={query}
						/>
						<div className="mt-2 grid grid-cols-2 gap-2">
							<select className="filter-select py-2 text-[8px]" onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} value={roleFilter}>
								<option value="">همه نقش‌ها</option>
								{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
							</select>
							<select className="filter-select py-2 text-[8px]" onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}>
								<option value="">همه وضعیت‌ها</option>
								{Object.entries(userStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
							</select>
						</div>

						<div className="mt-3 overflow-x-auto">
							<table className="w-full min-w-[510px] text-right text-[7px]">
								<thead className="bg-[#f7f7f3] text-[#89958f]">
									<tr>
										<th className="px-2 py-2 font-medium">کاربر</th>
										<th className="px-2 py-2 font-medium">نقش</th>
										<th className="px-2 py-2 font-medium">وضعیت</th>
										<th className="px-2 py-2 font-medium">عضویت</th>
										<th className="px-2 py-2 font-medium">عملیات</th>
									</tr>
								</thead>
								<tbody>
									{users.map((user) => (
										<tr className={`cursor-pointer border-t border-[#edf0ed] text-[#526963] ${selectedId === user.id ? "bg-[#f4f8f5]" : ""}`} key={user.id} onClick={() => { setSelectedId(user.id); setNotice(null); setDeleteConfirmation(false); }}>
											<td className="px-2 py-2.5">
												<p className="font-bold text-ink">{user.name}</p>
												<p className="mt-1 text-[6px] text-[#89958f]">{user.email}</p>
											</td>
											<td className="px-2 py-2.5">{roleLabels[user.role]}</td>
											<td className="px-2 py-2.5">
												<span className={`rounded-full px-2 py-1 ${user.status === "active" ? "bg-[#edf4f0] text-[#267162]" : user.status === "blocked" ? "bg-[#fbefed] text-[#a94e45]" : "bg-[#fbf2dc] text-[#826a37]"}`}>{userStatusLabels[user.status]}</span>
											</td>
											<td className="px-2 py-2.5">{formatDate(user.createdAt)}</td>
											<td className="whitespace-nowrap px-2 py-2.5">
												<button className="text-[#267162] hover:underline" onClick={(event) => { event.stopPropagation(); setSelectedId(user.id); }} type="button">ویرایش</button>
												<span className="mx-1 text-[#c5ceca]">·</span>
												<button className="text-[#a35c51] hover:underline" disabled={user.id === me?.id} onClick={(event) => { event.stopPropagation(); setSelectedId(user.id); setDeleteConfirmation(true); }} type="button">حذف</button>
											</td>
										</tr>
									))}
									{users.length === 0 && <tr><td className="px-3 py-8 text-center text-[#89958f]" colSpan={5}>کاربری با این مشخصات پیدا نشد.</td></tr>}
								</tbody>
							</table>
						</div>
						<div className="mt-2 flex items-center justify-between border-t border-[#edf0ed] pt-2 text-[7px] text-[#89958f]">
							<span>نمایش {formatNumber(users.length)} از {formatNumber(total)} کاربر</span>
							<span className="flex items-center gap-2">
								<button className="rounded-md border border-[#dfe8e3] px-2 py-1 font-semibold text-forest disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((c) => c - 1)} type="button">قبل</button>
								{formatNumber(page)} / {formatNumber(totalPages)}
								<button className="rounded-md border border-[#dfe8e3] px-2 py-1 font-semibold text-forest disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((c) => c + 1)} type="button">بعد</button>
							</span>
						</div>
					</section>

					<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
						<h2 className="mb-3 text-[10px] font-bold text-ink">ویرایش دسترسی کاربر انتخاب‌شده</h2>
						{selectedUser ? (
							<>
								<label className="block text-[8px] font-bold text-[#526963]">
									نام نمایشی
									<input className="mt-1.5 w-full rounded-md border border-[#e5e9e5] px-3 py-2 text-[8px] outline-none focus:border-forest" defaultValue={selectedUser.name} key={`${selectedUser.id}-${selectedUser.name}`} onBlur={(event) => event.target.value.trim() && updateSelectedUser({ name: event.target.value.trim() })} />
								</label>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<label className="text-[8px] font-bold text-[#526963]">
										نقش حساب
										<select className="filter-select mt-1.5 py-2 text-[8px]" onChange={(event) => updateSelectedUser({ role: event.target.value as UserRole })} value={selectedUser.role}>
											{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
										</select>
									</label>
									<label className="text-[8px] font-bold text-[#526963]">
										وضعیت حساب
										<select className="filter-select mt-1.5 py-2 text-[8px]" onChange={(event) => updateSelectedUser({ status: event.target.value as UserStatus })} value={selectedUser.status}>
											{Object.entries(userStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
										</select>
									</label>
								</div>
								<button className="mt-3 rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={() => selectedId !== null && loadDetail(selectedId)} type="button">بازخوانی اطلاعات</button>
								<p className="mt-2 text-[7px] text-[#89958f]">تغییر نقش یا وضعیت کاربر، دسترسی‌های او را در سامانه تغییر می‌دهد.</p>
							</>
						) : <p className="text-[8px] text-[#89958f]">برای ویرایش، یک کاربر را از فهرست انتخاب کنید.</p>}
					</section>

					{deleteConfirmation && selectedUser && (
						<section className="rounded-lg border border-[#f0d7d3] bg-white p-3">
							<h2 className="text-[10px] font-bold text-[#a94e45]">حذف حساب — نیازمند تایید</h2>
							<p className="mt-2 text-[8px] leading-5 text-[#72827d]">حذف حساب «{selectedUser.name}» دسترسی او را لغو می‌کند. این عملیات قابل بازگشت نیست.</p>
							<div className="mt-3 flex gap-2">
								<button className="rounded-md bg-[#b95045] px-3 py-2 text-[8px] font-bold text-white" onClick={deleteSelectedUser} type="button">تأیید و حذف حساب</button>
								<button className="rounded-md border border-[#dfe8e3] px-3 py-2 text-[8px] font-bold text-forest" onClick={() => setDeleteConfirmation(false)} type="button">انصراف</button>
							</div>
						</section>
					)}
				</div>

				<aside className="space-y-3">
					<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
						<h2 className="text-[11px] font-bold text-ink">پشتیبانی {selectedUser?.name ?? "کاربر"}</h2>
						<div className="mt-2 flex gap-2">
							<span className="rounded-full bg-[#edf4f0] px-2 py-1 text-[7px] text-[#267162]">{selectedUser ? userStatusLabels[selectedUser.status] : "—"}</span>
							<span className="rounded-full bg-[#edf4f0] px-2 py-1 text-[7px] text-[#267162]">{selectedUser ? roleLabels[selectedUser.role] : "—"}</span>
						</div>
						<p className="mt-2 text-[7px] text-[#89958f]">آخرین ورود: {formatDateTime(selectedUser?.lastLoginAt)} • {selectedUser?.emailVerified ? "ایمیل تاییدشده" : "ایمیل تایید نشده"}</p>
						<div className="my-3 border-t border-[#edf0ed]" />
						<h3 className="text-[9px] font-bold text-ink">۱. تایید هویت</h3>
						<p className="mt-2 text-[8px] leading-5 text-[#72827d]">برای بررسی بیشتر یا تایید وضعیت حساب، مدارک ارسال‌شده را بازبینی کنید و نتیجه را با کاربر در میان بگذارید.</p>
						<button className="mt-2 rounded-full bg-[#edf4f0] px-2.5 py-1 text-[7px] font-semibold text-[#267162]" disabled={!selectedUser} onClick={showDocs} type="button">مشاهده مدارک ({formatNumber(detail?.documentCount ?? 0)})</button>
						{docs && (
							<ul className="mt-2 space-y-2">
								{docs.length === 0 && <li className="text-[7px] text-[#89958f]">سندی بارگذاری نشده است.</li>}
								{docs.map((doc) => (
									<li className="rounded-md bg-[#f7f9f7] px-2 py-1.5 text-[7px] text-[#526963]" key={doc.id}>
										<a className="font-bold text-forest hover:underline" href={`/api/admin/users/${selectedUser?.id}/documents/${doc.id}/download`} rel="noopener noreferrer" target="_blank">{doc.name}</a>
										<span className="mx-1 text-[#98a49e]">• {documentStatusLabels[doc.status]} • {formatBytes(doc.sizeBytes)}</span>
										<button className="mr-1 text-[#267162]" onClick={() => reviewDoc(doc.id, "approved")} type="button">تایید</button>
										<button className="mr-1 text-[#a35c51]" onClick={() => reviewDoc(doc.id, "rejected")} type="button">رد</button>
									</li>
								))}
							</ul>
						)}

						<div className="my-3 border-t border-[#edf0ed]" />
						<h3 className="text-[9px] font-bold text-ink">۲. اصلاح ایمیل یا تایید مجدد</h3>
						<label className="mt-2 block text-[8px] font-bold text-[#526963]">ایمیل فعلی تاییدشده
							<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-2.5 py-2 text-left text-[7px] font-normal text-[#526963]" dir="ltr" readOnly value={selectedUser?.email ?? ""} />
						</label>
						<label className="mt-2 block text-[8px] font-bold text-[#526963]">ایمیل جدید پیشنهادی
							<input className="mt-1 w-full rounded-md border border-[#e5e9e5] px-2.5 py-2 text-left text-[7px] font-normal text-[#526963]" dir="ltr" onChange={(event) => setNewEmail(event.target.value)} placeholder="name@example.com" type="email" value={newEmail} />
						</label>
						<button className="mt-2 rounded-md bg-forest px-3 py-2 text-[7px] font-bold text-white" disabled={!selectedUser} onClick={sendVerification} type="button">{newEmail ? "ارسال پیوند تایید ایمیل جدید" : "ارسال پیوند تایید ایمیل فعلی"}</button>
						<p className="mt-2 text-[7px] leading-4 text-[#89958f]">پیوند تایید به ایمیل جدید ارسال می‌شود. از مالک حساب بودن کاربر مطمئن شوید.</p>

						<div className="my-3 border-t border-[#edf0ed]" />
						<h3 className="text-[9px] font-bold text-ink">۳. بازنشانی رمز عبور</h3>
						<p className="mt-2 text-[8px] leading-5 text-[#72827d]">در صورت نیاز، پیوند امن بازنشانی رمز عبور برای کاربر ارسال کنید.</p>
						<button className="mt-2 rounded-md border border-[#dfe8e3] px-3 py-2 text-[7px] font-bold text-forest" disabled={!selectedUser} onClick={sendReset} type="button">ارسال پیوند بازنشانی رمز</button>

						<div className="mt-3 flex gap-1.5 rounded-md bg-[#fbf2dc] px-2.5 py-2 text-[7px] leading-4 text-[#826a37]">
							<Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
							برای حفظ امنیت حساب، اطلاعات حساس را فقط پس از احراز هویت کاربر تغییر دهید.
						</div>
					</section>
					<section className="rounded-lg border border-[#e7ebe7] bg-white p-3">
						<h2 className="text-[10px] font-bold text-ink">سابقه پشتیبانی</h2>
						<p className="mt-2 text-[7px] leading-4 text-[#89958f]">
							{(detail?.history ?? []).length === 0 && "سابقه‌ای ثبت نشده است."}
							{(detail?.history ?? []).map((item) => (
								<span className="block" key={`${item.createdAt}-${item.action}`}>{formatDateTime(item.createdAt)} • {activityLabels[item.action] ?? item.action} ({item.actor})</span>
							))}
						</p>
					</section>
				</aside>
			</div>

			{notice && <p className={`mt-3 rounded-md px-3 py-2 text-[8px] ${notice.type === "ok" ? "bg-[#eaf3ef] text-[#267162]" : "bg-[#fbeaea] text-[#a14b4b]"}`} role="status">{notice.text}</p>}
		</div>
	);
}
