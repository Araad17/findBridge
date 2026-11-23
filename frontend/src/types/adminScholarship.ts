import type { DegreeLevel, FundingType, ScholarshipDetailData } from "./scholarships";

export type ScholarshipStatus = "draft" | "published" | "archived";

export type AdminScholarship = ScholarshipDetailData & {
	status: ScholarshipStatus;
	updatedAt: string;
	createdAt: string;
};

// داده‌ای که فرم ویرایش به سرور می‌فرستد
export type ScholarshipForm = {
	title: string;
	provider: string;
	country: string;
	field: string;
	degreeLevels: DegreeLevel[];
	fundingType: FundingType | "";
	fundingDetails: string;
	badge: string;
	description: string;
	eligibility: string;
	requirements: string;
	languageRequired: boolean;
	languageNote: string;
	requiredDocuments: string[];
	startDate: string;
	deadline: string;
	deadlineNote: string;
	deadlineTimezone: string;
	sourceUrl: string;
	applicationUrl: string;
	featured: boolean;
	status: ScholarshipStatus;
	confirmVerified: boolean;
};

export const emptyScholarshipForm: ScholarshipForm = {
	title: "",
	provider: "",
	country: "",
	field: "",
	degreeLevels: [],
	fundingType: "",
	fundingDetails: "",
	badge: "",
	description: "",
	eligibility: "",
	requirements: "",
	languageRequired: false,
	languageNote: "",
	requiredDocuments: [],
	startDate: "",
	deadline: "",
	deadlineNote: "",
	deadlineTimezone: "",
	sourceUrl: "",
	applicationUrl: "",
	featured: false,
	status: "draft",
	confirmVerified: false,
};

export const toForm = (s: AdminScholarship): ScholarshipForm => ({
	title: s.title,
	provider: s.provider ?? "",
	country: s.country,
	field: s.field ?? "",
	degreeLevels: s.degreeLevels,
	fundingType: s.fundingType ?? "",
	fundingDetails: s.fundingDetails ?? "",
	badge: s.badge ?? "",
	description: s.description ?? "",
	eligibility: s.eligibility ?? "",
	requirements: s.requirements ?? "",
	languageRequired: s.languageRequired,
	languageNote: s.languageNote ?? "",
	requiredDocuments: s.requiredDocuments,
	startDate: s.startDate ?? "",
	deadline: s.deadline ?? "",
	deadlineNote: s.deadlineNote ?? "",
	deadlineTimezone: s.deadlineTimezone ?? "",
	sourceUrl: s.sourceUrl ?? "",
	applicationUrl: s.applicationUrl ?? "",
	featured: s.featured,
	status: s.status,
	confirmVerified: Boolean(s.lastVerifiedAt),
});
