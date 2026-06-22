import { getCachedResponse, setCachedResponse } from "@/lib/snowflake/queries";
import { cvParser } from "./cv-parser";
import { jobMatcher } from "./job-matcher";
import { sopWriter } from "./sop-writer";
import { skillAnalyzer } from "./skill-analyzer";
import { searchPositions } from "./position-researcher";
import { searchJobs } from "./job-researcher";
import { evaluator } from "./job-evaluator";
import { upsertPositions, upsertJobs } from "@/lib/snowflake/upsert-research";

export type AgentTask =
  | "parse_cv"
  | "match_jobs"
  | "match_positions"
  | "research_positions"
  | "research_jobs"
  | "generate_sop"
  | "generate_cover_letter"
  | "analyze_skills"
  | "evaluate";

interface AgentRequest {
  task: AgentTask;
  userId: string;
  payload: Record<string, unknown>;
  skipCache?: boolean;
}

interface AgentResponse {
  success: boolean;
  data: unknown;
  cached: boolean;
  processingTime: number;
}

/**
 * Central AI orchestrator — all AI calls must go through this.
 * Handles routing, caching, guardrails, and error recovery.
 */
export async function orchestrate(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();

  // Build cache key from task + relevant payload fields
  const cacheKey = buildCacheKey(request);

  // Check cache first (unless explicitly skipped)
  if (!request.skipCache) {
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        processingTime: Date.now() - startTime,
      };
    }
  }

  // Route to appropriate agent
  let result: unknown;
  try {
    switch (request.task) {
      case "parse_cv":
        result = await cvParser.parse(
          request.payload.rawText as string
        );
        break;

      case "match_jobs":
        result = await jobMatcher.matchJobs(
          request.payload.cvText as string,
          request.payload.keywords as string[],
          request.payload.filters as Record<string, string> | undefined
        );
        break;

      case "match_positions":
        result = await jobMatcher.matchPositions(
          request.payload.cvText as string,
          request.payload.keywords as string[],
          request.payload.filters as Record<string, string> | undefined
        );
        break;

      case "research_positions": {
        const posResult = await searchPositions(
          request.payload.cvSummary as string,
          request.payload.positionType as string,
          request.payload.continent as string,
          request.payload.currentDate as string
        );
        if ("error" in posResult) throw new Error(posResult.error);
        // Persist discovered positions to DB (non-blocking)
        upsertPositions(posResult.positions).catch((e) =>
          console.error("Background position upsert failed:", e)
        );
        result = posResult;
        break;
      }

      case "research_jobs": {
        const jobResult = await searchJobs(
          request.payload.cvSummary as string,
          request.payload.customInstructions as string | undefined
        );
        if ("error" in jobResult) throw new Error(jobResult.error);
        // Persist discovered jobs to DB (non-blocking)
        upsertJobs(jobResult.jobs).catch((e) =>
          console.error("Background job upsert failed:", e)
        );
        result = jobResult;
        break;
      }

      case "generate_sop":
        result = await sopWriter.generateSop(
          request.payload.cvSummary as string,
          request.payload.positionContext as string,
          request.payload.userInstructions as string | undefined
        );
        break;

      case "generate_cover_letter":
        result = await sopWriter.generateCoverLetter(
          request.payload.cvSummary as string,
          request.payload.jobDescription as string,
          request.payload.userInstructions as string | undefined
        );
        break;

      case "analyze_skills":
        result = await skillAnalyzer.analyze(
          request.payload.cvParsed as Record<string, unknown>,
          request.payload.jobDescription as string
        );
        break;

      case "evaluate":
        result = await evaluator.evaluate(
          request.payload.inputContent as string,
          request.payload.inputType as "url" | "text",
          request.payload.cvSummary as string,
          request.payload.targetType as string,
          request.payload.userProfile as Record<string, unknown> | undefined
        );
        break;

      default:
        throw new Error(`Unknown agent task: ${request.task}`);
    }
  } catch (error) {
    console.error(`Agent task ${request.task} failed:`, error);
    return {
      success: false,
      data: { error: (error as Error).message },
      cached: false,
      processingTime: Date.now() - startTime,
    };
  }

  // Cache the successful result (skip caching fallback/low-quality results/empty arrays)
  const isFallback = (result as Record<string, unknown>)?.usedFallback === true;
  const isEmptyArray = Array.isArray(result) && result.length === 0;
  if (!isFallback && !isEmptyArray) {
    const ttl = getTtlForTask(request.task);
    await setCachedResponse(cacheKey, result as object, ttl).catch((err) =>
      console.error("Cache write failed:", err)
    );
  }

  return {
    success: true,
    data: result,
    cached: false,
    processingTime: Date.now() - startTime,
  };
}

function buildCacheKey(request: AgentRequest): string {
  const { task, payload } = request;
  // Use a subset of payload fields for cache key depending on task
  switch (task) {
    case "parse_cv":
      return `cv_parse:${hashString((payload.rawText as string).slice(0, 500))}`;
    case "match_jobs":
    case "match_positions":
      return `${task}:${hashString((payload.cvText as string).slice(0, 300))}:${(payload.keywords as string[])?.join(",")}`;
    case "research_positions":
      return `${task}:${hashString((payload.cvSummary as string).slice(0, 300))}:${payload.positionType}:${payload.continent}`;
    case "research_jobs":
      return `${task}:${hashString((payload.cvSummary as string).slice(0, 300))}:${hashString((payload.customInstructions as string || "").slice(0, 200))}`;
    case "generate_sop":
    case "generate_cover_letter":
      return `${task}:${hashString((payload.cvSummary as string).slice(0, 200))}:${hashString((payload.positionContext as string || payload.jobDescription as string || "").slice(0, 200))}`;
    case "analyze_skills":
      return `skills:${hashString(JSON.stringify(payload).slice(0, 400))}`;
    case "evaluate":
      return `evaluate:${hashString((payload.inputContent as string).slice(0, 300))}:${payload.targetType}`;
    default:
      return `${task}:${hashString(JSON.stringify(payload).slice(0, 500))}`;
  }
}

function getTtlForTask(task: AgentTask): number {
  switch (task) {
    case "parse_cv":
      return 168; // 7 days — CV doesn't change
    case "match_jobs":
    case "match_positions":
    case "research_positions":
    case "research_jobs":
      return 6; // 6 hours — job listings change
    case "generate_sop":
    case "generate_cover_letter":
      return 48; // 2 days
    case "analyze_skills":
      return 24; // 1 day
    case "evaluate":
      return 12; // 12 hours — evaluations semi-fresh
    default:
      return 24;
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
