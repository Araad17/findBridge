import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Ad = {
	id: number;
	title: string;
	subtitle: string | null;
	description: string | null;
	destination: string;
	imageUrl: string | null;
};

export default function AdBanner({
	placement,
	className = "",
}: {
	placement: "home" | "scholarships" | "guide";
	className?: string;
}) {
	const [ad, setAd] = useState<Ad | null>(null);

	useEffect(() => {
		api<{ items: Ad[] }>("/ads", { query: { placement } })
			.then((data) => setAd(data.items[0] ?? null))
			.catch(() => setAd(null));
	}, [placement]);

	if (!ad) return null;
	return (
		<aside
			aria-label="تبلیغ"
			className={`flex items-center gap-4 rounded-xl border border-[#f1e4c4] bg-[#fbf2dc] px-4 py-3 ${className}`}
		>
			{ad.imageUrl && <img alt="" className="h-14 w-24 shrink-0 rounded-md object-cover" src={ad.imageUrl} />}
			<div className="min-w-0 flex-1">
				{ad.subtitle && <p className="text-[9px] text-[#99814b]">{ad.subtitle}</p>}
				<h3 className="mt-0.5 text-xs font-bold text-ink">{ad.title}</h3>
				{ad.description && <p className="mt-1 text-[9px] text-[#82908a]">{ad.description}</p>}
			</div>
			<a
				className="shrink-0 rounded-md bg-white px-3 py-2 text-[9px] font-semibold text-forest shadow-sm hover:bg-[#f8f8f4]"
				href={ad.destination}
				rel="noopener noreferrer sponsored"
				target="_blank"
			>
				مشاهده بیشتر
			</a>
		</aside>
	);
}
