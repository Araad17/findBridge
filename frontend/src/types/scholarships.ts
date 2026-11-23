export type DegreeLevel = "bachelor" | "master" | "phd";
export type FundingType = "full_funding" | "full_tuition" | "tuition_housing" | "stipend" | "partial_tuition";

export type Scholarship = {
	id: number;
	title: string;
	provider: string | null;
	country: string;
	field: string | null;
	degreeLevels: DegreeLevel[];
	fundingType: FundingType | null;
	badge: string | null;
	description: string | null;
	deadline: string | null;
	startDate: string | null;
	languageRequired: boolean;
	featured: boolean;
	saved?: boolean;
};

export type ScholarshipDetailData = Scholarship & {
	fundingDetails: string | null;
	eligibility: string | null;
	requirements: string | null;
	languageNote: string | null;
	requiredDocuments: string[];
	deadlineNote: string | null;
	deadlineTimezone: string | null;
	sourceUrl: string | null;
	applicationUrl: string | null;
	lastVerifiedAt: string | null;
};

export type Page<T> = {
	items: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type ScholarshipFilters = {
	q: string;
	country: string;
	degree: string;
	funding: string;
	language: string;
	window: string;
	sort: "newest" | "deadline";
};

export const emptyFilters: ScholarshipFilters = {
	q: "",
	country: "",
	degree: "",
	funding: "",
	language: "",
	window: "",
	sort: "newest",
};
