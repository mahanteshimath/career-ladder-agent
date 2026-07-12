-- Career-Ladder-Agent Snowflake Schema
-- Database: CAREER_LADDER | Schema: PUBLIC
-- Run via scripts/bootstrap-snowflake.ts or directly in Snowflake worksheet
--
-- USAGE: Run the DROP section first for a clean slate, then CREATE section.
--        Alternatively, skip DROPs and rely on IF NOT EXISTS for incremental updates.

-- ============================================================
-- DROP ALL (uncomment to reset — DESTRUCTIVE! Wipes ALL data.)
-- WARNING: These are intentionally commented out. The bootstrap script
-- executes every non-comment statement, so leaving these live would drop
-- all tables (including CL_USERS) and destroy production data on each run.
-- Uncomment ONLY for a deliberate, full reset.
-- ============================================================
-- DROP TASK IF EXISTS CL_CACHE_CLEANUP;
-- DROP TASK IF EXISTS CL_OTP_CLEANUP;
-- DROP TABLE IF EXISTS CL_EVALUATIONS;
-- DROP TABLE IF EXISTS CL_OTP_CODES;
-- DROP TABLE IF EXISTS CL_TRACKER;
-- DROP TABLE IF EXISTS CL_USAGE;
-- DROP TABLE IF EXISTS CL_ISSUES;
-- DROP TABLE IF EXISTS CL_AGENT_CACHE;
-- DROP TABLE IF EXISTS CL_DRAFTS;
-- DROP TABLE IF EXISTS CL_MATCHES;
-- DROP TABLE IF EXISTS CL_JOBS;
-- DROP TABLE IF EXISTS CL_POSITIONS;
-- DROP TABLE IF EXISTS CL_CVS;
-- DROP TABLE IF EXISTS CL_INSTITUTIONS;
-- DROP TABLE IF EXISTS CL_USERS;
-- DROP STAGE IF EXISTS CAREERMATCH_STAGE;

-- ============================================================
-- STAGE: Internal stage for CV file storage
-- ============================================================
CREATE STAGE IF NOT EXISTS CAREERMATCH_STAGE
  ENCRYPTION = (TYPE = 'SNOWFLAKE_SSE');

-- ============================================================
-- TABLE: CL_USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_USERS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  EMAIL VARCHAR(320) NOT NULL,
  NAME VARCHAR(256),
  IMAGE_URL VARCHAR(2048),
  PERSONA VARCHAR(20) DEFAULT 'job_seeker', -- 'student' | 'job_seeker'
  RESEARCH_INTERESTS ARRAY,                 -- JSON array of research area tags (students only)
  PROFILE_JSON VARIANT,                     -- Full user profile (goal, field, level, geoPref, etc.)
  ONBOARDING_COMPLETE BOOLEAN DEFAULT FALSE,
  TIER VARCHAR(10) DEFAULT 'free',          -- 'free' | 'basic' | 'premium'
  INSTITUTION_ID VARCHAR(36),               -- B2B: link to institution (NULL for individual users)
  SUBSCRIPTION_STARTS_AT TIMESTAMP_NTZ,
  SUBSCRIPTION_EXPIRES_AT TIMESTAMP_NTZ,
  PAYMENT_ID VARCHAR(128),
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (EMAIL)
);

-- ============================================================
-- TABLE: CL_CVS
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_CVS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  FILENAME VARCHAR(512) NOT NULL,
  RAW_TEXT TEXT,
  PARSED_JSON VARIANT,
  EMBEDDING VECTOR(FLOAT, 768),
  STAGE_PATH VARCHAR(1024),
  UPLOADED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID)
);

-- ============================================================
-- TABLE: CL_POSITIONS (Academic — pre-seeded)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_POSITIONS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  TITLE VARCHAR(512) NOT NULL,
  UNIVERSITY VARCHAR(512),
  PROFESSOR VARCHAR(256),
  DEPARTMENT VARCHAR(256),
  TYPE VARCHAR(50),          -- 'phd' | 'postdoc' | 'masters' | 'research_assistant'
  CONTINENT VARCHAR(50),
  COUNTRY VARCHAR(100),
  DEADLINE DATE,
  SOURCE_URL VARCHAR(2048),
  DESCRIPTION TEXT,
  KEYWORDS ARRAY,
  EMBEDDING VECTOR(FLOAT, 768),
  DEDUP_HASH VARCHAR(64),
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (DEDUP_HASH)
);

-- ============================================================
-- TABLE: CL_JOBS (Industry — pre-seeded + user-posted)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_JOBS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  TITLE VARCHAR(512) NOT NULL,
  COMPANY VARCHAR(512),
  LOCATION VARCHAR(256),
  SOURCE VARCHAR(100),       -- 'pre_seeded' | 'user_posted' | 'scraped'
  DESCRIPTION TEXT,
  KEYWORDS ARRAY,
  SALARY_RANGE VARCHAR(128),
  EMPLOYMENT_TYPE VARCHAR(50), -- 'full_time' | 'part_time' | 'contract' | 'internship'
  EMBEDDING VECTOR(FLOAT, 768),
  POSTED_BY VARCHAR(36),     -- NULL for pre-seeded
  VERIFIED BOOLEAN DEFAULT FALSE,
  DEDUP_HASH VARCHAR(64),
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (DEDUP_HASH)
);

-- ============================================================
-- TABLE: CL_MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_MATCHES (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  CV_ID VARCHAR(36) NOT NULL,
  TARGET_TYPE VARCHAR(20) NOT NULL, -- 'position' | 'job'
  TARGET_ID VARCHAR(36) NOT NULL,
  SCORE FLOAT,
  MATCH_METHOD VARCHAR(20),  -- 'keyword' | 'semantic' | 'hybrid'
  MATCHED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID),
  FOREIGN KEY (CV_ID) REFERENCES CL_CVS(ID)
);

-- ============================================================
-- TABLE: CL_DRAFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_DRAFTS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  TYPE VARCHAR(20) NOT NULL, -- 'sop' | 'cover_letter' | 'cv' | 'email'
  CONTENT TEXT,
  CONTEXT VARIANT,           -- JSON with job/position context used for generation
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID)
);

-- ============================================================
-- TABLE: CL_AGENT_CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_AGENT_CACHE (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  CACHE_KEY VARCHAR(512) NOT NULL,
  RESPONSE VARIANT,
  TTL_HOURS INTEGER DEFAULT 24,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (CACHE_KEY)
);

-- ============================================================
-- TABLE: CL_JOB_POSTS (External submissions pending approval)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_JOB_POSTS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  POSTED_BY_EMAIL VARCHAR(320) NOT NULL,
  POSTED_BY_NAME VARCHAR(256),
  TITLE VARCHAR(512) NOT NULL,
  COMPANY VARCHAR(512),
  LOCATION VARCHAR(256),
  DESCRIPTION TEXT,
  APPLY_URL VARCHAR(2048),
  SALARY VARCHAR(128),
  JOB_TYPE VARCHAR(50),       -- 'full_time' | 'part_time' | 'contract' | 'internship'
  SPAM_SCORE FLOAT DEFAULT 0,
  SPAM_REASON TEXT,
  POSTER_IP VARCHAR(45),
  STATUS VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'spam'
  REVIEWED_BY VARCHAR(36),
  REVIEWED_AT TIMESTAMP_NTZ,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID)
);

-- ============================================================
-- TABLE: CL_ISSUES
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_ISSUES (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36),
  CATEGORY VARCHAR(50),      -- 'bug' | 'feature' | 'content' | 'other'
  DESCRIPTION TEXT NOT NULL,
  ATTACHMENT TEXT,           -- optional screenshot stored as a base64 image data URL
  STATUS VARCHAR(20) DEFAULT 'open', -- 'open' | 'in_progress' | 'resolved' | 'closed'
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID)
);

-- ============================================================
-- TABLE: CL_TRACKER (Journey-aware application / program tracker)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_TRACKER (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  JOURNEY VARCHAR(20) NOT NULL,      -- 'job' | 'academic'
  STAGE VARCHAR(30) NOT NULL DEFAULT 'saved', -- see config/tracker.ts
  TITLE VARCHAR(512) NOT NULL,       -- job title / position title
  ORGANIZATION VARCHAR(512),         -- company / university
  LOCATION VARCHAR(256),
  URL VARCHAR(2048),                 -- apply / source url
  DEADLINE DATE,                     -- academic deadline (optional)
  SOURCE_TYPE VARCHAR(20),           -- 'job' | 'position' | 'manual'
  SOURCE_ID VARCHAR(36),             -- optional ref to CL_JOBS / CL_POSITIONS
  DEDUP_HASH VARCHAR(64),            -- hash(user + title + org + location) to prevent dupes
  NOTES TEXT,
  METADATA VARIANT,                  -- snapshot: salary, score, professor, skills, etc.
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (DEDUP_HASH),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID)
);

-- ============================================================
-- TABLE: CL_USAGE (Tier limit tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_USAGE (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  ACTION_TYPE VARCHAR(50) NOT NULL, -- 'cv_upload' | 'job_search' | 'position_search' | 'sop_generate' | 'cv_generate' | 'evaluate'
  CV_ID VARCHAR(36),
  METADATA VARIANT,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID)
);

-- ============================================================
-- TABLE: CL_EVALUATIONS (Structured evaluation reports)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_EVALUATIONS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  CV_ID VARCHAR(36),
  INPUT_TYPE VARCHAR(10) NOT NULL,   -- 'url' | 'text'
  INPUT_CONTENT TEXT NOT NULL,
  TARGET_TYPE VARCHAR(20) NOT NULL,  -- 'job' | 'masters' | 'phd' | 'postdoc'
  EVALUATION_JSON VARIANT NOT NULL,  -- Full structured report (blocks array)
  OVERALL_SCORE FLOAT,
  RECOMMENDATION VARCHAR(20),        -- 'strong_match' | 'good_match' | 'weak_match' | 'skip'
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID)
);

-- ============================================================
-- TABLE: CL_INSTITUTIONS (B2B — colleges/placement cells)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_INSTITUTIONS (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  NAME VARCHAR(512) NOT NULL,
  ADMIN_USER_ID VARCHAR(36),
  LICENSE_TYPE VARCHAR(20) DEFAULT 'free_trial', -- 'free_trial' | 'basic' | 'premium'
  MAX_STUDENTS INT DEFAULT 50,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID)
);

-- ============================================================
-- SEARCH OPTIMIZATION
-- ============================================================
ALTER TABLE CL_AGENT_CACHE ADD SEARCH OPTIMIZATION ON EQUALITY(CACHE_KEY);
ALTER TABLE CL_USERS ADD SEARCH OPTIMIZATION ON EQUALITY(EMAIL);
ALTER TABLE CL_JOBS ADD SEARCH OPTIMIZATION ON EQUALITY(DEDUP_HASH);
ALTER TABLE CL_POSITIONS ADD SEARCH OPTIMIZATION ON EQUALITY(DEDUP_HASH);
ALTER TABLE CL_USAGE ADD SEARCH OPTIMIZATION ON EQUALITY(USER_ID, ACTION_TYPE);

-- ============================================================
-- CACHE CLEANUP TASK (runs daily, removes expired entries)
-- ============================================================
CREATE OR REPLACE TASK CL_CACHE_CLEANUP
  WAREHOUSE = 'COMPUTE_WH'
  SCHEDULE = 'USING CRON 0 2 * * * UTC'
AS
  DELETE FROM CL_AGENT_CACHE
  WHERE DATEADD('hour', TTL_HOURS, CREATED_AT) < CURRENT_TIMESTAMP();

ALTER TASK CL_CACHE_CLEANUP RESUME;

-- ============================================================
-- TABLE: CL_OTP_CODES (Email verification for sign-in)
-- ============================================================
CREATE TABLE IF NOT EXISTS CL_OTP_CODES (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  EMAIL VARCHAR(320) NOT NULL,
  OTP_HASH VARCHAR(64) NOT NULL,        -- SHA-256 hash (never store plain OTP)
  USED BOOLEAN DEFAULT FALSE,
  EXPIRES_AT TIMESTAMP_NTZ NOT NULL,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID)
);

-- Auto-cleanup expired OTPs daily
CREATE OR REPLACE TASK CL_OTP_CLEANUP
  WAREHOUSE = 'COMPUTE_WH'
  SCHEDULE = 'USING CRON 0 */4 * * * UTC'
AS
  DELETE FROM CL_OTP_CODES
  WHERE EXPIRES_AT < CURRENT_TIMESTAMP() OR USED = TRUE;

ALTER TASK CL_OTP_CLEANUP RESUME;
