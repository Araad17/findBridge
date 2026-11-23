CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id               BIGSERIAL PRIMARY KEY,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL DEFAULT '',
  email            CITEXT NOT NULL UNIQUE,
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant','consultant','admin','expert')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','blocked')),
  gender           TEXT CHECK (gender IN ('female','male')),
  birth_place      TEXT,
  birth_date       DATE,
  field_of_study   TEXT,
  university       TEXT,
  degree_level     TEXT CHECK (degree_level IN ('bachelor','master','phd')),
  graduation_year  INT,
  bio              TEXT,
  phone            TEXT,
  avatar_path      TEXT,
  notify_prefs     JSONB NOT NULL DEFAULT '{"deadlines":true,"events":true,"tips":true}',
  consult_specialty TEXT,
  consult_detail    TEXT,
  referral_code    TEXT NOT NULL UNIQUE,
  referred_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX users_role_idx ON users(role);

CREATE TABLE scholarships (
  id                BIGSERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  provider          TEXT,
  country           TEXT NOT NULL DEFAULT '',
  field             TEXT,
  degree_levels     TEXT[] NOT NULL DEFAULT '{}',
  funding_type      TEXT CHECK (funding_type IN ('full_funding','full_tuition','tuition_housing','stipend','partial_tuition')),
  funding_details   TEXT,
  badge             TEXT,
  description       TEXT,
  eligibility       TEXT,
  requirements      TEXT,
  language_required BOOLEAN NOT NULL DEFAULT FALSE,
  language_note     TEXT,
  required_documents TEXT[] NOT NULL DEFAULT '{}',
  start_date        DATE,
  deadline          DATE,
  deadline_note     TEXT,
  deadline_timezone TEXT,
  source_url        TEXT,
  application_url   TEXT,
  last_verified_at  DATE,
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scholarships_status_idx ON scholarships(status, deadline);
CREATE INDEX scholarships_country_idx ON scholarships(country);

CREATE TABLE saved_scholarships (
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id BIGINT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scholarship_id)
);

CREATE TABLE applications (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id BIGINT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_review','returned','accepted','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scholarship_id)
);

CREATE TABLE documents (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  original_name TEXT,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documents_user_idx ON documents(user_id);

CREATE TABLE user_checklist (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope   TEXT NOT NULL,
  item    TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, scope, item)
);

CREATE TABLE consultant_availability (
  id            BIGSERIAL PRIMARY KEY,
  consultant_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday       INT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = یکشنبه (مثل JS getDay)
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  slot_minutes  INT NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 10 AND 240)
);

CREATE TABLE consultations (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at        TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  topic            TEXT,
  note             TEXT,
  meeting_url      TEXT,
  status           TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled','done')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- یک مشاور در یک زمان فقط یک رزرو فعال دارد
CREATE UNIQUE INDEX consultations_slot_uniq ON consultations(consultant_id, starts_at) WHERE status = 'booked';
CREATE INDEX consultations_user_idx ON consultations(user_id, starts_at);

CREATE TABLE referrals (
  id               BIGSERIAL PRIMARY KEY,
  referrer_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  invited_email    CITEXT,
  invited_name     TEXT,
  status           TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','registered')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX referrals_referrer_idx ON referrals(referrer_id);

CREATE TABLE ads (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  description TEXT,
  destination TEXT NOT NULL,
  placement   TEXT NOT NULL CHECK (placement IN ('home','scholarships','guide')),
  image_path  TEXT,
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active','draft','ended')),
  visible     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('password_reset','email_verify')),
  token_hash TEXT NOT NULL UNIQUE,
  payload    JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   BIGINT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_target_idx ON activity_log(target_type, target_id, created_at DESC);
