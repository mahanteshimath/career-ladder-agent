import { executeQuery } from "@/lib/snowflake/client";
import { semanticSearch } from "@/lib/snowflake/embeddings";
import { keywordSearch } from "@/lib/snowflake/queries";

export interface MatchResult {
  id: string;
  title: string;
  organization: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  keywords?: string[];
  description?: string;
  location?: string;
}

/**
 * Job Matcher agent — combines keyword-based fast matching with semantic vector search.
 * Implements the 30-sec fast results + 1-min refined pattern.
 */
export const jobMatcher = {
  /**
   * Match against industry jobs (CL_JOBS table).
   */
  async matchJobs(
    cvText: string,
    keywords: string[],
    filters?: Record<string, string>
  ): Promise<MatchResult[]> {
    // Phase 1: Fast keyword matching (< 30 sec)
    const keywordResults = await keywordSearch("CL_JOBS", keywords, 30);

    // Phase 2: Semantic vector search
    const semanticResults = await semanticSearch("CL_JOBS", cvText, 30, filters);

    // Merge and deduplicate results
    return mergeResults(keywordResults, semanticResults, "job");
  },

  /**
   * Match against academic positions (CL_POSITIONS table).
   */
  async matchPositions(
    cvText: string,
    keywords: string[],
    filters?: Record<string, string>
  ): Promise<MatchResult[]> {
    // Phase 1: Fast keyword matching
    const keywordResults = await keywordSearch("CL_POSITIONS", keywords, 30);

    // Phase 2: Semantic vector search
    const semanticResults = await semanticSearch("CL_POSITIONS", cvText, 30, filters);

    // Merge and deduplicate results
    return mergeResults(keywordResults, semanticResults, "position");
  },

  /**
   * Get detailed info for a specific job/position by ID.
   */
  async getDetails(
    table: "CL_JOBS" | "CL_POSITIONS",
    id: string
  ): Promise<Record<string, unknown> | null> {
    const result = await executeQuery(
      `SELECT * FROM ${table} WHERE ID = ?`,
      [id]
    );
    return result.rows[0] || null;
  },
};

function mergeResults(
  keywordRows: Record<string, unknown>[],
  semanticRows: { id: string; score: number; title: string }[],
  type: "job" | "position"
): MatchResult[] {
  const merged = new Map<string, MatchResult>();

  // Normalize keyword relevance scores (from keywordSearch's MATCH_SCORE)
  // into a 0.35–0.75 confidence band, leaving room for a semantic boost.
  const maxKw = Math.max(
    1,
    ...keywordRows.map((r) => Number(r.MATCH_SCORE) || 0)
  );

  // Add keyword results ranked by relevance
  for (const row of keywordRows) {
    const id = row.ID as string;
    const relevance = (Number(row.MATCH_SCORE) || 0) / maxKw; // 0..1
    merged.set(id, {
      id,
      title: row.TITLE as string,
      organization:
        type === "job"
          ? (row.COMPANY as string) || ""
          : (row.UNIVERSITY as string) || "",
      score: Number((0.35 + relevance * 0.4).toFixed(3)),
      matchMethod: "keyword",
      keywords: row.KEYWORDS as string[],
      description: (row.DESCRIPTION as string)?.slice(0, 200),
      location: row.LOCATION as string,
    });
  }

  // Add/upgrade semantic results
  for (const item of semanticRows) {
    const existing = merged.get(item.id);
    if (existing) {
      // Boost score for items found by both methods
      existing.score = Math.min(1.0, existing.score + item.score * 0.5);
      existing.matchMethod = "hybrid";
    } else {
      merged.set(item.id, {
        id: item.id,
        title: item.title,
        organization: "",
        score: item.score,
        matchMethod: "semantic",
      });
    }
  }

  // Sort by score descending
  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}
