export const userPublic = (u) => ({
  id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  name: `${u.first_name} ${u.last_name}`.trim(),
  email: u.email,
  emailVerified: u.email_verified,
  role: u.role,
  status: u.status,
  avatarUrl: u.avatar_path ? `/uploads/${u.avatar_path}` : null,
  referralCode: u.referral_code,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
});

export const profile = (u) => ({
  ...userPublic(u),
  gender: u.gender,
  birthPlace: u.birth_place,
  birthDate: u.birth_date,
  fieldOfStudy: u.field_of_study,
  university: u.university,
  degreeLevel: u.degree_level,
  graduationYear: u.graduation_year,
  bio: u.bio,
  phone: u.phone,
  notifyPrefs: u.notify_prefs,
});

export const scholarshipCard = (s) => ({
  id: s.id,
  title: s.title,
  provider: s.provider,
  country: s.country,
  field: s.field,
  degreeLevels: s.degree_levels,
  fundingType: s.funding_type,
  badge: s.badge,
  description: s.description,
  deadline: s.deadline,
  startDate: s.start_date,
  languageRequired: s.language_required,
  featured: s.featured,
  ...(s.saved !== undefined ? { saved: s.saved } : {}),
});

export const scholarshipDetail = (s) => ({
  ...scholarshipCard(s),
  fundingDetails: s.funding_details,
  eligibility: s.eligibility,
  requirements: s.requirements,
  languageNote: s.language_note,
  requiredDocuments: s.required_documents,
  deadlineNote: s.deadline_note,
  deadlineTimezone: s.deadline_timezone,
  sourceUrl: s.source_url,
  applicationUrl: s.application_url,
  lastVerifiedAt: s.last_verified_at,
});

export const scholarshipAdmin = (s) => ({
  ...scholarshipDetail(s),
  status: s.status,
  updatedAt: s.updated_at,
  createdAt: s.created_at,
});

export const adPublic = (a) => ({
  id: a.id,
  title: a.title,
  subtitle: a.subtitle,
  description: a.description,
  destination: a.destination,
  placement: a.placement,
  imageUrl: a.image_path ? `/uploads/${a.image_path}` : null,
});

export const adAdmin = (a) => ({
  ...adPublic(a),
  startDate: a.start_date,
  endDate: a.end_date,
  status: a.status,
  visible: a.visible,
});
