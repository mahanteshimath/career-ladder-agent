import { executeQuery } from "./client";

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

export async function getCvById(cvId: string) {
  const result = await executeQuery(
    `SELECT * FROM CL_CVS WHERE ID = ?`,
    [cvId]
  );
  return result.rows[0] || null;
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
       END AS TARGET_ORG
     FROM CL_MATCHES m
     LEFT JOIN CL_JOBS j ON m.TARGET_TYPE = 'job' AND m.TARGET_ID = j.ID
     LEFT JOIN CL_POSITIONS p ON m.TARGET_TYPE = 'position' AND m.TARGET_ID = p.ID
     WHERE m.USER_ID = ?
     ORDER BY m.MATCHED_AT DESC
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
}) {
  await executeQuery(
    `INSERT INTO CL_ISSUES (USER_ID, CATEGORY, DESCRIPTION) VALUES (?, ?, ?)`,
    [data.userId || null, data.category, data.description]
  );
}

export async function getUserIssues(userId: string) {
  const result = await executeQuery(
    `SELECT ID, CATEGORY, DESCRIPTION, STATUS, CREATED_AT 
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
  const keywordConditions = keywords
    .map(() => `ARRAY_CONTAINS(?::VARIANT, KEYWORDS)`)
    .join(" OR ");

  const sql = `
    SELECT * FROM ${table}
    WHERE ${keywordConditions}
    ORDER BY CREATED_AT DESC
    LIMIT ?
  `;

  const result = await executeQuery(sql, [...keywords, limit]);
  return result.rows;
}
