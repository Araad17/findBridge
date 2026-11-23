import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, SESSION_EXPIRED_EVENT } from "./api";

export type Role = "applicant" | "consultant" | "admin" | "expert";

export type AuthUser = {
	id: number;
	firstName: string;
	lastName: string;
	name: string;
	email: string;
	role: Role;
	avatarUrl: string | null;
	referralCode: string;
};

type AuthContextValue = {
	user: AuthUser | null;
	loading: boolean;
	isAdminArea: boolean;
	login: (input: { email: string; password: string; remember: boolean }) => Promise<AuthUser>;
	signup: (input: { name: string; email: string; password: string; ref?: string }) => Promise<AuthUser>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const data = await api<{ user: AuthUser }>("/auth/me");
			setUser(data.user);
		} catch {
			setUser(null);
		}
	}, []);

	useEffect(() => {
		refresh().finally(() => setLoading(false));
	}, [refresh]);

	useEffect(() => {
		const onExpired = () => setUser(null);
		window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
		return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			loading,
			isAdminArea: user?.role === "admin" || user?.role === "expert",
			async login(input) {
				const data = await api<{ user: AuthUser }>("/auth/login", { method: "POST", body: input });
				setUser(data.user);
				return data.user;
			},
			async signup(input) {
				const data = await api<{ user: AuthUser }>("/auth/signup", { method: "POST", body: input });
				setUser(data.user);
				return data.user;
			},
			async logout() {
				await api("/auth/logout", { method: "POST" }).catch(() => undefined);
				setUser(null);
			},
			refresh,
		}),
		[user, loading, refresh],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
