import { executeQuery } from "./client";

/**
 * Generate an embedding vector for text using Snowflake Cortex.
 * Uses e5-base-v2 model for 768-dimension embeddings.
 * Returns null if Cortex is unavailable (trial accounts).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const sanitized = text.slice(0, 8000);
    const result = await executeQuery(
      `SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', ?) AS EMBEDDING`,
      [sanitized]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0].EMBEDDING as number[];
  } catch (err) {
    console.warn("[embeddings] Cortex EMBED unavailable:", (err as Error).message);
    return null;
  }
}

/**
 * Compute cosine similarity between a query embedding and stored embeddings.
 * Returns top-N results sorted by similarity score.
 * Returns empty array if Cortex is unavailable.
 */
export async function semanticSearch(
  table: "CL_POSITIONS" | "CL_JOBS",
  queryText: string,
  limit: number = 20,
  filters?: Record<string, string>
): Promise<{ id: string; score: number; title: string }[]> {
  try {
    let whereClause = "";
    const binds: (string | number)[] = [queryText.slice(0, 8000), limit];

    if (filters) {
      const conditions = Object.entries(filters)
        .map(([key]) => {
          return `${key} = ?`;
        })
        .join(" AND ");
      whereClause = `WHERE ${conditions}`;
      Object.values(filters).forEach((v) => binds.push(v));
    }

    const sql = `
      SELECT 
        ID,
        TITLE,
        VECTOR_COSINE_SIMILARITY(
          EMBEDDING,
          SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', ?)
        ) AS SCORE
      FROM ${table}
      ${whereClause}
      ORDER BY SCORE DESC
      LIMIT ?
    `;

    const result = await executeQuery(sql, binds);
    return result.rows.map((row) => ({
      id: row.ID as string,
      score: row.SCORE as number,
      title: row.TITLE as string,
    }));
  } catch (err) {
    console.warn("[embeddings] Semantic search unavailable, falling back to keyword only:", (err as Error).message);
    return [];
  }
}

/**
 * Generate embedding and store it for a CV record.
 * Gracefully skips if Cortex is unavailable.
 */
export async function embedAndStoreCv(
  cvId: string,
  text: string
): Promise<void> {
  try {
    const sanitized = text.slice(0, 8000);
    await executeQuery(
      `UPDATE CL_CVS 
       SET EMBEDDING = SNOWFLAKE.CORTEX.EMBED_TEXT_768('e5-base-v2', ?)
       WHERE ID = ?`,
      [sanitized, cvId]
    );
  } catch (err) {
    console.warn("[embeddings] CV embedding skipped (Cortex unavailable):", (err as Error).message);
  }
}
