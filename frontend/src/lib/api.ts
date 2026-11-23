export class ApiError extends Error {
	status: number;
	fields?: Record<string, string>;
	constructor(status: number, message: string, fields?: Record<string, string>) {
		super(message);
		this.status = status;
		this.fields = fields;
	}
}

type Options = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	form?: FormData;
	query?: Record<string, string | number | boolean | undefined | null>;
	signal?: AbortSignal;
};

// رویداد سراسری: وقتی نشست منقضی شد (۴۰۱) برنامه کاربر را به صفحه ورود می‌برد
export const SESSION_EXPIRED_EVENT = "session-expired";

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
	const url = new URL(`/api${path}`, window.location.origin);
	for (const [key, value] of Object.entries(options.query ?? {})) {
		if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
	}
	const init: RequestInit = {
		method: options.method ?? (options.body || options.form ? "POST" : "GET"),
		credentials: "include",
		signal: options.signal,
		headers: {},
	};
	if (options.form) {
		init.body = options.form;
	} else if (options.body !== undefined) {
		(init.headers as Record<string, string>)["Content-Type"] = "application/json";
		init.body = JSON.stringify(options.body);
	}

	let response: Response;
	try {
		response = await fetch(url, init);
	} catch (error) {
		if ((error as Error).name === "AbortError") throw error;
		throw new ApiError(0, "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
	}

	const data = response.status === 204 ? null : await response.json().catch(() => null);
	if (!response.ok) {
		if (response.status === 401 && !path.startsWith("/auth/")) {
			window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
		}
		throw new ApiError(response.status, data?.error ?? "خطایی رخ داد. دوباره تلاش کنید.", data?.fields);
	}
	return data as T;
}

export const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : "خطایی رخ داد. دوباره تلاش کنید.";
