import { executeQuery } from "./client";

export type SnowflakeRow = Record<string, unknown>;

// ============================================================
// USER QUERIES
// ============================================================

export async function getUserByEmail(email: string) {
  const result = await executeQuery(
    `SELECT * FROM CL_USERS WHERE EMAIL = ?`,
    [email]
  );
  return result.rows[0] || null;
}

export async function createUser(data: {
  email: string;
  name: string;
  imageUrl?: string;
}) {
  const result = await executeQuery(
    `INSERT INTO CL_USERS (EMAIL, NAME, IMAGE_URL) 
     SELECT ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM CL_USERS WHERE EMAIL = ?)`,
    [data.email, data.name, data.imageUrl || null, data.email]
  );
  return result;
}

export async function updateUserTier(
  userId: string,
  tier: "free" | "basic" | "premium",
  expiresAt?: string
) {
  await executeQuery(
    `UPDATE CL_USERS 
     SET TIER = ?, SUBSCRIPTION_EXPIRES_AT = ?, UPDATED_AT = CURRENT_TIMESTAMP()
     WHERE ID = ?`,
    [tier, expiresAt || null, userId]
  );
}

export async function updateUserPersona(
  userId: string,
  persona: "student" | "job_seeker",
  researchInterests?: string[]
) {
  await executeQuery(
    `UPDATE CL_USERS 
     SET PERSONA = ?, RESEARCH_INTERESTS = PARSE_JSON(?), UPDATED_AT = CURRENT_TIMESTAMP()
     WHERE ID = ?`,
    [persona, JSON.stringify(researchInterests || []), userId]
  );
}

export async function getPositions(filters: {
  type?: string;
  continent?: string;
  department?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const binds: (string | number)[] = [];

  if (filters.type) {
    conditions.push("TYPE = ?");
    binds.push(filters.type);
  }
  if (filters.continent) {
    conditions.push("CONTINENT = ?");
    binds.push(filters.continent);
  }
  if (filters.department) {
    conditions.push("DEPARTMENT ILIKE ?");
    binds.push(`%${filters.department}%`);
  }
  if (filters.keyword) {
    conditions.push("(TITLE ILIKE ? OR DESCRIPTION ILIKE ? OR ARRAY_CONTAINS(?::VARIANT, KEYWORDS))");
    binds.push(`%${filters.keyword}%`, `%${filters.keyword}%`, filters.keyword);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const result = await executeQuery(
    `SELECT * FROM CL_POSITIONS ${where} ORDER BY DEADLINE ASC NULLS LAST, CREATED_AT DESC LIMIT ? OFFSET ?`,
    [...binds, limit, offset]
  );
  return result.rows;
}

export async function savePosition(userId: string, positionId: string) {
  await executeQuery(
    `INSERT INTO CL_MATCHES (USER_ID, CV_ID, TARGET_TYPE, TARGET_ID, SCORE, MATCH_METHOD)
     SELECT ?, 'bookmark', 'position', ?, 0, 'bookmark'
     WHERE NOT EXISTS (
       SELECT 1 FROM CL_MATCHES WHERE USER_ID = ? AND TARGET_ID = ? AND MATCH_METHOD = 'bookmark'
     )`,
    [userId, positionId, userId, positionId]
  );
}

export async function unsavePosition(userId: string, positionId: string) {
  await executeQuery(
    `DELETE FROM CL_MATCHES WHERE USER_ID = ? AND TARGET_ID = ? AND MATCH_METHOD = 'bookmark'`,
    [userId, positionId]
  );
}

export async function getUserSavedPositions(userId: string) {
  const result = await executeQuery(
    `SELECT p.*, m.CREATED_AT AS SAVED_AT
     FROM CL_MATCHES m
     JOIN CL_POSITIONS p ON m.TARGET_ID = p.ID
     WHERE m.USER_ID = ? AND m.MATCH_METHOD = 'bookmark' AND m.TARGET_TYPE = 'position'
     ORDER BY p.DEADLINE ASC NULLS LAST`,
    [userId]
  );
  return result.rows;
}

// ============================================================
// TRACKER QUERIES (journey-aware application / program board)
// ============================================================

export interface TrackerItemInput {
  userId: string;
  journey: "job" | "academic";
  stage?: string;
  title: string;
  organization?: string;
  location?: string;
  url?: string;
  deadline?: string;
  sourceType?: "job" | "position" | "manual";
  sourceId?: string;
  dedupHash: string;
  notes?: string;
  metadata?: object;
}

/**
 * Insert a tracker item, skipping silently if the same (user + item) already
 * exists — dedup is enforced by DEDUP_HASH. Returns true if a row was added.
 */
export async function addTrackerItem(data: TrackerItemInput): Promise<boolean> {
  try {
    return await insertTrackerItem(data);
  } catch (err) {
    // Self-heal: the CL_TRACKER table is a separate migration that may not have
    // been run in this environment. Create it on the fly, then retry once.
    if (/does not exist|not authorized/i.test((err as Error)?.message || "")) {
      await ensureTrackerTable();
      return await insertTrackerItem(data);
    }
    throw err;
  }
}

const CREATE_TRACKER_TABLE = `CREATE TABLE IF NOT EXISTS CL_TRACKER (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  JOURNEY VARCHAR(20) NOT NULL,
  STAGE VARCHAR(30) NOT NULL DEFAULT 'saved',
  TITLE VARCHAR(512) NOT NULL,
  ORGANIZATION VARCHAR(512),
  LOCATION VARCHAR(256),
  URL VARCHAR(2048),
  DEADLINE DATE,
  SOURCE_TYPE VARCHAR(20),
  SOURCE_ID VARCHAR(36),
  DEDUP_HASH VARCHAR(64),
  NOTES TEXT,
  METADATA VARIANT,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (DEDUP_HASH)
)`;

async function ensureTrackerTable(): Promise<void> {
  await executeQuery(CREATE_TRACKER_TABLE, []);
}

async function insertTrackerItem(data: TrackerItemInput): Promise<boolean> {
  // Dedup check first — the previous INSERT ... SELECT ... WHERE NOT EXISTS
  // relied on a FROM-less SELECT with a WHERE clause, which Snowflake rejects.
  const existing = await executeQuery(
    `SELECT 1 FROM CL_TRACKER WHERE DEDUP_HASH = ? LIMIT 1`,
    [data.dedupHash]
  );
  if (existing.rows.length > 0) return false;

  // PARSE_JSON isn't allowed in a VALUES list, so use INSERT ... SELECT (no FROM needed).
  await executeQuery(
    `INSERT INTO CL_TRACKER
       (USER_ID, JOURNEY, STAGE, TITLE, ORGANIZATION, LOCATION, URL, DEADLINE, SOURCE_TYPE, SOURCE_ID, DEDUP_HASH, NOTES, METADATA)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, PARSE_JSON(?)`,
    [
      data.userId,
      data.journey,
      data.stage || "saved",
      data.title,
      data.organization || null,
      data.location || null,
      data.url || null,
      data.deadline || null,
      data.sourceType || "manual",
      data.sourceId || null,
      data.dedupHash,
      data.notes || null,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return true;
}

export async function getTrackerItems(userId: string, journey?: "job" | "academic") {
  const conditions = journey ? "USER_ID = ? AND JOURNEY = ?" : "USER_ID = ?";
  const binds = journey ? [userId, journey] : [userId];
  const result = await executeQuery(
    `SELECT ID, JOURNEY, STAGE, TITLE, ORGANIZATION, LOCATION, URL, DEADLINE,
            SOURCE_TYPE, SOURCE_ID, NOTES, METADATA, CREATED_AT, UPDATED_AT
     FROM CL_TRACKER
     WHERE ${conditions}
     ORDER BY UPDATED_AT DESC`,
    binds
  );
  return result.rows;
}

export async function updateTrackerItem(
  userId: string,
  itemId: string,
  fields: { stage?: string; notes?: string }
) {
  const sets: string[] = [];
  const binds: (string | null)[] = [];
  if (fields.stage !== undefined) {
    sets.push("STAGE = ?");
    binds.push(fields.stage);
  }
  if (fields.notes !== undefined) {
    sets.push("NOTES = ?");
    binds.push(fields.notes);
  }
  if (sets.length === 0) return;
  sets.push("UPDATED_AT = CURRENT_TIMESTAMP()");
  binds.push(itemId, userId);
  await executeQuery(
    `UPDATE CL_TRACKER SET ${sets.join(", ")} WHERE ID = ? AND USER_ID = ?`,
    binds
  );
}

export async function deleteTrackerItem(userId: string, itemId: string) {
  await executeQuery(
    `DELETE FROM CL_TRACKER WHERE ID = ? AND USER_ID = ?`,
    [itemId, userId]
  );
}

// ============================================================
// CV QUERIES
// ============================================================

export async function insertCv(data: {
  userId: string;
  filename: string;
  rawText: string;
  parsedJson: object;
  stagePath?: string;
}) {
  const result = await executeQuery(
    `INSERT INTO CL_CVS (USER_ID, FILENAME, RAW_TEXT, PARSED_JSON, STAGE_PATH)
     SELECT ?, ?, ?, PARSE_JSON(?), ?`,
    [
      data.userId,
      data.filename,
      data.rawText,
      JSON.stringify(data.parsedJson),
      data.stagePath || null,
    ]
  );
  return result;
}

export async function getUserCvs(userId: string) {
  const result = await executeQuery(
    `SELECT ID, FILENAME, PARSED_JSON, UPLOADED_AT 
     FROM CL_CVS WHERE USER_ID = ? ORDER BY UPLOADED_AT DESC`,
    [userId]
  );
  return result.rows;
}

export async function getCvById(cvId: string, userId?: string) {
  const conditions = userId ? "ID = ? AND USER_ID = ?" : "ID = ?";
  const binds = userId ? [cvId, userId] : [cvId];
  const result = await executeQuery(
    `SELECT * FROM CL_CVS WHERE ${conditions}`,
    binds
  );
  return (result.rows[0] as SnowflakeRow | undefined) || null;
}

// ============================================================
// MATCH QUERIES
// ============================================================

export async function insertMatch(data: {
  userId: string;
  cvId: string;
  targetType: "position" | "job";
  targetId: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
}) {
  await executeQuery(
    `INSERT INTO CL_MATCHES (USER_ID, CV_ID, TARGET_TYPE, TARGET_ID, SCORE, MATCH_METHOD)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM CL_MATCHES 
       WHERE USER_ID = ? AND CV_ID = ? AND TARGET_ID = ?
     )`,
    [
      data.userId,
      data.cvId,
      data.targetType,
      data.targetId,
      data.score,
      data.matchMethod,
      data.userId,
      data.cvId,
      data.targetId,
    ]
  );
}

export async function getUserMatches(userId: string, limit: number = 50) {
  const result = await executeQuery(
    `SELECT m.*, 
       CASE m.TARGET_TYPE 
         WHEN 'job' THEN j.TITLE 
         WHEN 'position' THEN p.TITLE 
       END AS TARGET_TITLE,
       CASE m.TARGET_TYPE 
         WHEN 'job' THEN j.COMPANY 
         WHEN 'position' THEN p.UNIVERSITY 
       END AS TARGET_ORG,
       CASE m.TARGET_TYPE 
         WHEN 'job' THEN j.LOCATION 
         WHEN 'position' THEN p.COUNTRY 
       END AS LOCATION,
       CASE m.TARGET_TYPE 
         WHEN 'job' THEN LEFT(j.DESCRIPTION, 200)
         WHEN 'position' THEN LEFT(p.DESCRIPTION, 200) 
       END AS DESCRIPTION
     FROM CL_MATCHES m
     LEFT JOIN CL_JOBS j ON m.TARGET_TYPE = 'job' AND m.TARGET_ID = j.ID
     LEFT JOIN CL_POSITIONS p ON m.TARGET_TYPE = 'position' AND m.TARGET_ID = p.ID
     WHERE m.USER_ID = ? AND m.MATCH_METHOD != 'bookmark'
     ORDER BY m.SCORE DESC, m.MATCHED_AT DESC
     LIMIT ?`,
    [userId, limit]
  );
  return result.rows;
}

// ============================================================
// DRAFT QUERIES
// ============================================================

export async function insertDraft(data: {
  userId: string;
  type: "sop" | "cover_letter" | "cv" | "email";
  content: string;
  context: object;
}) {
  await executeQuery(
    `INSERT INTO CL_DRAFTS (USER_ID, TYPE, CONTENT, CONTEXT)
     SELECT ?, ?, ?, PARSE_JSON(?)`,
    [data.userId, data.type, data.content, JSON.stringify(data.context)]
  );
}

export async function getUserDrafts(userId: string) {
  const result = await executeQuery(
    `SELECT ID, TYPE, CONTENT, CONTEXT, CREATED_AT 
     FROM CL_DRAFTS WHERE USER_ID = ? ORDER BY CREATED_AT DESC`,
    [userId]
  );
  return result.rows;
}

// ============================================================
// CACHE QUERIES
// ============================================================

export async function getCachedResponse(cacheKey: string) {
  const result = await executeQuery(
    `SELECT RESPONSE FROM CL_AGENT_CACHE 
     WHERE CACHE_KEY = ? 
       AND DATEADD('hour', TTL_HOURS, CREATED_AT) > CURRENT_TIMESTAMP()`,
    [cacheKey]
  );
  return result.rows[0]?.RESPONSE || null;
}

export async function setCachedResponse(
  cacheKey: string,
  response: object,
  ttlHours: number = 24
) {
  await executeQuery(
    `MERGE INTO CL_AGENT_CACHE t
     USING (SELECT ? AS CK) s ON t.CACHE_KEY = s.CK
     WHEN MATCHED THEN UPDATE SET RESPONSE = PARSE_JSON(?), TTL_HOURS = ?, CREATED_AT = CURRENT_TIMESTAMP()
     WHEN NOT MATCHED THEN INSERT (CACHE_KEY, RESPONSE, TTL_HOURS) VALUES (?, PARSE_JSON(?), ?)`,
    [cacheKey, JSON.stringify(response), ttlHours, cacheKey, JSON.stringify(response), ttlHours]
  );
}

// ============================================================
// USAGE QUERIES
// ============================================================

export async function trackUsage(
  userId: string,
  actionType: string,
  cvId?: string
) {
  await executeQuery(
    `INSERT INTO CL_USAGE (USER_ID, ACTION_TYPE, CV_ID) VALUES (?, ?, ?)`,
    [userId, actionType, cvId || null]
  );
}

export async function getUserUsageCount(
  userId: string,
  actionType: string,
  sinceDays: number = 7
): Promise<number> {
  const result = await executeQuery(
    `SELECT COUNT(*) AS CNT FROM CL_USAGE 
     WHERE USER_ID = ? AND ACTION_TYPE = ? 
       AND CREATED_AT > DATEADD('day', ?, CURRENT_TIMESTAMP())`,
    [userId, actionType, -sinceDays]
  );
  return (result.rows[0]?.CNT as number) || 0;
}

// ============================================================
// JOB POST QUERIES
// ============================================================

export async function submitJobPost(data: {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  posterEmail: string;
  salary: string | null;
  jobType: string;
  spamScore: number;
  spamReason: string;
  status: string;
  ip: string;
}) {
  await executeQuery(
    `INSERT INTO CL_JOB_POSTS (TITLE, COMPANY, LOCATION, DESCRIPTION, APPLY_URL, POSTED_BY_EMAIL, SALARY, JOB_TYPE, SPAM_SCORE, SPAM_REASON, STATUS, POSTER_IP)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.company, data.location, data.description, data.applyUrl, data.posterEmail, data.salary, data.jobType, data.spamScore, data.spamReason, data.status, data.ip]
  );
}

export async function getPendingJobPosts() {
  const result = await executeQuery(
    `SELECT * FROM CL_JOB_POSTS WHERE STATUS = 'pending' ORDER BY CREATED_AT DESC`
  );
  return result.rows;
}

// ============================================================
// ISSUE QUERIES
// ============================================================

export async function submitIssue(data: {
  userId?: string;
  category: string;
  description: string;
  attachment?: string | null;
}) {
  await executeQuery(
    `INSERT INTO CL_ISSUES (USER_ID, CATEGORY, DESCRIPTION, ATTACHMENT) VALUES (?, ?, ?, ?)`,
    [data.userId || null, data.category, data.description, data.attachment || null]
  );
}

export async function getUserIssues(userId: string) {
  const result = await executeQuery(
    `SELECT ID, CATEGORY, DESCRIPTION, ATTACHMENT, STATUS, CREATED_AT 
     FROM CL_ISSUES WHERE USER_ID = ? ORDER BY CREATED_AT DESC`,
    [userId]
  );
  return result.rows;
}

// ============================================================
// KEYWORD SEARCH (Fast — 30-second results from pre-built DB)
// ============================================================

export async function keywordSearch(
  table: "CL_POSITIONS" | "CL_JOBS",
  keywords: string[],
  limit: number = 20
) {
  // No keywords → no keyword matches. Previously this returned the newest
  // rows as a fallback, which surfaced irrelevant results (e.g. AI/ML jobs
  // for a bioinformatics CV). Returning empty lets semantic search / the
  // empty-state UI handle it honestly.
  if (!keywords || keywords.length === 0) {
    return [];
  }

  // Build a relevance score instead of ordering by recency:
  //   exact keyword-array membership = 3, title match = 2, description = 1.
  // Rows are ranked by total relevance so the best-matching entries surface
  // first, and rows with zero overlap are excluded entirely.
  const scoreParts: string[] = [];
  const binds: (string | number)[] = [];

  for (const kw of keywords) {
    scoreParts.push(`(CASE WHEN ARRAY_CONTAINS(?::VARIANT, src.KEYWORDS) THEN 3 ELSE 0 END)`);
    binds.push(kw);
  }
  for (const kw of keywords) {
    scoreParts.push(`(CASE WHEN src.TITLE ILIKE ? THEN 2 ELSE 0 END)`);
    binds.push(`%${kw}%`);
  }
  for (const kw of keywords) {
    scoreParts.push(`(CASE WHEN src.DESCRIPTION ILIKE ? THEN 1 ELSE 0 END)`);
    binds.push(`%${kw}%`);
  }

  const sql = `
    SELECT * FROM (
      SELECT src.*, (${scoreParts.join(" + ")}) AS MATCH_SCORE
      FROM ${table} src
    )
    WHERE MATCH_SCORE > 0
    ORDER BY MATCH_SCORE DESC, CREATED_AT DESC
    LIMIT ?
  `;
  binds.push(limit);

  const result = await executeQuery(sql, binds);
  return result.rows;
}

// ============================================================
// USER PROFILE QUERIES
// ============================================================

export async function updateUserProfile(
  userId: string,
  profile: object,
  persona?: "student" | "job_seeker" | "unset"
) {
  if (persona) {
    await executeQuery(
      `UPDATE CL_USERS 
       SET PROFILE_JSON = PARSE_JSON(?), PERSONA = ?, ONBOARDING_COMPLETE = TRUE, UPDATED_AT = CURRENT_TIMESTAMP()
       WHERE ID = ?`,
      [JSON.stringify(profile), persona, userId]
    );
    return;
  }
  await executeQuery(
    `UPDATE CL_USERS 
     SET PROFILE_JSON = PARSE_JSON(?), ONBOARDING_COMPLETE = TRUE, UPDATED_AT = CURRENT_TIMESTAMP()
     WHERE ID = ?`,
    [JSON.stringify(profile), userId]
  );
}

export async function getUserProfile(userId: string) {
  const result = await executeQuery(
    `SELECT PROFILE_JSON, ONBOARDING_COMPLETE FROM CL_USERS WHERE ID = ?`,
    [userId]
  );
  return result.rows[0] || null;
}

// ============================================================
// EVALUATION QUERIES
// ============================================================

export async function insertEvaluation(data: {
  userId: string;
  cvId?: string;
  inputType: "url" | "text";
  inputContent: string;
  targetType: string;
  evaluationJson: object;
  overallScore: number;
  recommendation: string;
}) {
  await executeQuery(
    `INSERT INTO CL_EVALUATIONS (USER_ID, CV_ID, INPUT_TYPE, INPUT_CONTENT, TARGET_TYPE, EVALUATION_JSON, OVERALL_SCORE, RECOMMENDATION)
     VALUES (?, ?, ?, ?, ?, PARSE_JSON(?), ?, ?)`,
    [
      data.userId,
      data.cvId || null,
      data.inputType,
      data.inputContent,
      data.targetType,
      JSON.stringify(data.evaluationJson),
      data.overallScore,
      data.recommendation,
    ]
  );
}

export async function getUserEvaluations(userId: string, limit: number = 20) {
  const result = await executeQuery(
    `SELECT ID, INPUT_TYPE, INPUT_CONTENT, TARGET_TYPE, EVALUATION_JSON, OVERALL_SCORE, RECOMMENDATION, CREATED_AT
     FROM CL_EVALUATIONS WHERE USER_ID = ? ORDER BY CREATED_AT DESC LIMIT ?`,
    [userId, limit]
  );
  return result.rows;
}

export async function deleteOlderCvs(userId: string, keepLimit: number = 3) {
  const cvs = await executeQuery(
    `SELECT ID FROM CL_CVS WHERE USER_ID = ? ORDER BY UPLOADED_AT DESC`,
    [userId]
  );

  if (cvs.rows.length > keepLimit) {
    const idsToDelete = cvs.rows.slice(keepLimit).map((row) => row.ID as string);
    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map(() => "?").join(",");
      await executeQuery(
        `DELETE FROM CL_MATCHES WHERE CV_ID IN (${placeholders})`,
        idsToDelete
      );
      await executeQuery(
        `DELETE FROM CL_CVS WHERE ID IN (${placeholders})`,
        idsToDelete
      );
    }
  }
}
