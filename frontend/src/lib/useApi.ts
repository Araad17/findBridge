import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";

type Query = Record<string, string | number | boolean | undefined | null>;

/** یک GET ساده با وضعیت loading/error و امکان بارگذاری مجدد. */
export function useApi<T>(path: string | null, query?: Query) {
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(Boolean(path));
	const queryKey = JSON.stringify(query ?? {});
	const counter = useRef(0);

	const load = useCallback(async () => {
		if (!path) return;
		const ticket = ++counter.current;
		setLoading(true);
		setError("");
		try {
			const result = await api<T>(path, { query: JSON.parse(queryKey) as Query });
			if (ticket === counter.current) setData(result);
		} catch (err) {
			if (ticket === counter.current) setError(errorMessage(err));
		} finally {
			if (ticket === counter.current) setLoading(false);
		}
	}, [path, queryKey]);

	useEffect(() => {
		void load();
		return () => {
			counter.current += 1; // پاسخ‌های قدیمی نادیده گرفته می‌شوند
		};
	}, [load]);

	return { data, setData, error, loading, reload: load };
}
