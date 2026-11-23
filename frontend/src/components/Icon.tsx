export default function Icon({
	name,
	className = "h-4 w-4",
}: {
	name:
		| "bookmark"
		| "search"
		| "book"
		| "menu"
		| "globe"
		| "arrow"
		| "home"
		| "user"
		| "userPlus"
		| "bell"
		| "clipboard"
		| "video"
		| "users"
		| "chat"
		| "shield"
		| "info";
	className?: string;
}) {
	const paths = {
		bookmark: (
			<path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.75L6 21V4.75Z" />
		),
		search: (
			<>
				<circle cx="10.8" cy="10.8" r="6.3" />
				<path d="m15.5 15.5 4 4" />
			</>
		),
		book: (
			<>
				<path d="M3 5.5c3.4-1.6 6.4-1.3 9 1v13c-2.6-2.3-5.6-2.6-9-1v-13Z" />
				<path d="M21 5.5c-3.4-1.6-6.4-1.3-9 1v13c2.6-2.3 5.6-2.6 9-1v-13Z" />
			</>
		),
		menu: <path d="M4 6h16M4 12h16M4 18h16" />,
		home: <path d="m3 10 9-7 9 7M5.5 9v12h13V9M9 21v-7h6v7" />,
		user: (
			<>
				<circle cx="12" cy="8" r="4" />
				<path d="M5 21a7 7 0 0 1 14 0" />
			</>
		),
		userPlus: (
			<>
				<circle cx="9" cy="8" r="4" />
				<path d="M2 21a7 7 0 0 1 14 0M19 8v6m-3-3h6" />
			</>
		),
		globe: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
			</>
		),
		arrow: <path d="M19 12H5m0 0 6 6m-6-6 6-6" />,
		bell: (
			<>
				<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
				<path d="M10 21h4" />
			</>
		),
		clipboard: (
			<>
				<rect x="5" y="4" width="14" height="17" rx="2" />
				<path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5" />
			</>
		),
		video: (
			<>
				<rect x="3" y="6" width="13" height="12" rx="2" />
				<path d="m16 10 5-3v10l-5-3Z" />
			</>
		),
		users: (
			<>
				<circle cx="9" cy="8" r="3" />
				<path d="M3 21a6 6 0 0 1 12 0M17 11a3 3 0 0 0 0-6M18 14a5 5 0 0 1 3 4" />
			</>
		),
		chat: (
			<>
				<path d="M4 5h16v11H9l-5 4V5Z" />
				<path d="M8 9h8M8 12h5" />
			</>
		),
		shield: (
			<>
				<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
				<path d="m9 12 2 2 4-5" />
			</>
		),
		info: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 11v5M12 8h.01" />
			</>
		),
	};

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.7"
			viewBox="0 0 24 24"
		>
			{paths[name]}
		</svg>
	);
}

