/**
 * Upsert researched positions and jobs into Snowflake.
 * Deduplicates by title + organization. Generates embeddings inline.
 * Non-blocking: failures are logged but don't break user responses.
 */

import { executeQuery } from "./client";

interface PositionUpsert {
  title: string;
  university: string;
  country: string;
  continent: string;
  positionType: string;
  deadline: string;
  description: string;
  requirements: string;
  professorName: string;
  professorEmail: string;
  sourceUrl: string;
}

interface JobUpsert {
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  experienceLevel: string;
  salaryRange: string;
  sourceUrl: string;
}

/**
 * Upsert positions discovered via live research into CL_POSITIONS.
 * Skips duplicates (same title + university already exists).
 * Attempts embedding generation separately (graceful if Cortex unavailable).
 */
export async function upsertPositions(positions: PositionUpsert[]): Promise<number> {
  let inserted = 0;

  for (const pos of positions) {
    if (!pos.title || !pos.university) continue;

    try {
      // Check if already exists
      const existing = await executeQuery(
        `SELECT ID FROM CL_POSITIONS WHERE TITLE = ? AND UNIVERSITY = ? LIMIT 1`,
        [pos.title, pos.university]
      );

      if (existing.rows.length > 0) continue;

      // Insert without embedding first (guaranteed to work)
      const result = await executeQuery(
        `INSERT INTO CL_POSITIONS 
         (TITLE, UNIVERSITY, PROFESSOR, DEPARTMENT, TYPE, CONTINENT, COUNTRY, 
          DEADLINE, SOURCE_URL, DESCRIPTION, KEYWORDS)
         VALUES (?, ?, ?, '', ?, ?, ?, TRY_TO_DATE(?), ?, ?, 
                 ARRAY_CONSTRUCT())`,
        [
          pos.title,
          pos.university,
          pos.professorName || "",
          pos.positionType || "",
          pos.continent || "",
          pos.country || "",
          pos.deadline || "",
          pos.sourceUrl || "",
          pos.description || "",
        ]
      );

      // Attempt to add embedding (non-critical)
      try {
        const embedText = [pos.title, pos.description, pos.requirements]
          .filter(Boolean)
          .join("\n")
          .slice(0, 8000);
        await executeQuery(
          `UPDATE CL_POSITIONS SET EMBEDDING = SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', ?)
           WHERE TITLE = ? AND UNIVERSITY = ?`,
          [embedText, pos.title, pos.university]
        );
      } catch {
        // Embedding unavailable on trial — position still saved without it
      }

      inserted++;
    } catch (err) {
      console.error(`[upsert-research] Position insert failed: ${pos.title}`, err);
    }
  }

  return inserted;
}

/**
 * Upsert jobs discovered via live research into CL_JOBS.
 * Skips duplicates (same title + company already exists).
 */
export async function upsertJobs(jobs: JobUpsert[]): Promise<number> {
  let inserted = 0;

  for (const job of jobs) {
    if (!job.title || !job.company) continue;

    try {
      // Check if already exists
      const existing = await executeQuery(
        `SELECT ID FROM CL_JOBS WHERE TITLE = ? AND COMPANY = ? LIMIT 1`,
        [job.title, job.company]
      );

      if (existing.rows.length > 0) continue;

      const skills = Array.isArray(job.requiredSkills)
        ? job.requiredSkills.join(", ")
        : "";

      // Insert without embedding first (guaranteed to work)
      await executeQuery(
        `INSERT INTO CL_JOBS 
         (TITLE, COMPANY, LOCATION, DESCRIPTION, KEYWORDS, 
          SALARY_RANGE, SOURCE)
         VALUES (?, ?, ?, ?, ARRAY_CONSTRUCT(?), ?, ?)`,
        [
          job.title,
          job.company,
          job.location || "",
          job.description || "",
          skills,
          job.salaryRange || "",
          job.sourceUrl || "",
        ]
      );

      // Attempt to add embedding (non-critical)
      try {
        const embedText = [job.title, job.description, `Required skills: ${skills}`]
          .filter(Boolean)
          .join("\n")
          .slice(0, 8000);
        await executeQuery(
          `UPDATE CL_JOBS SET EMBEDDING = SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', ?)
           WHERE TITLE = ? AND COMPANY = ?`,
          [embedText, job.title, job.company]
        );
      } catch {
        // Embedding unavailable on trial — job still saved without it
      }

      inserted++;
    } catch (err) {
      console.error(`[upsert-research] Job insert failed: ${job.title}`, err);
    }
  }

  return inserted;
}
