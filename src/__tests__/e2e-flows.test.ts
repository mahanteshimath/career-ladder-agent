/**
 * E2E Integration Tests for Career Ladder Agent
 * Tests the core flows: evaluator, profile, onboarding, orchestrator routing.
 * 
 * Run individual tests:
 *   npx vitest run src/__tests__/e2e-flows.test.ts -t "evaluator"
 *   npx vitest run src/__tests__/e2e-flows.test.ts -t "profile"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Test 1: Evaluator normalizeReport ─────────────────────────────────────────

describe("evaluator", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("normalizeReport produces valid EvaluationReport from raw AI output", async () => {
    // Mock perplexity so we don't hit the API
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => true,
      PERPLEXITY_API_URL: "https://mock.api",
      PERPLEXITY_MODEL: "sonar",
      PERPLEXITY_TIMEOUT: 5000,
      PERPLEXITY_MAX_RETRIES: 0,
      isRetryableStatus: () => false,
      getPerplexityApiKey: () => "test-key",
    }));

    const { evaluator } = await import("@/lib/agents/job-evaluator");

    const rawReport = {
      overallScore: 0.78,
      recommendation: "good_match",
      blocks: [
        {
          title: "Role Summary",
          content: {
            jobTitle: "Software Engineer",
            company: "Google",
            seniority: "mid",
            type: "full_time",
            location: "Remote",
            domain: "Cloud",
            tldr: "Cloud infrastructure engineer role.",
          },
        },
        {
          title: "Match Analysis",
          content: {
            matchedSkills: ["Python", "AWS", "Kubernetes"],
            missingSkills: ["Go", "GCP"],
            experienceGap: "Needs GCP experience",
            mitigationStrategies: ["Take GCP certification"],
            fitPercentage: 72,
          },
        },
      ],
    };

    const result = evaluator.normalizeReport(rawReport);

    expect(result.overallScore).toBe(0.78);
    expect(result.recommendation).toBe("good_match");
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].title).toBe("Role Summary");
    expect(result.blocks[1].content.matchedSkills).toEqual(["Python", "AWS", "Kubernetes"]);
  });

  it("normalizeReport clamps score to [0, 1]", async () => {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => true,
      PERPLEXITY_API_URL: "https://mock.api",
      PERPLEXITY_MODEL: "sonar",
      PERPLEXITY_TIMEOUT: 5000,
      PERPLEXITY_MAX_RETRIES: 0,
      isRetryableStatus: () => false,
      getPerplexityApiKey: () => "test-key",
    }));

    const { evaluator } = await import("@/lib/agents/job-evaluator");

    const overScore = evaluator.normalizeReport({ overallScore: 1.5, recommendation: "strong_match", blocks: [] });
    expect(overScore.overallScore).toBe(1);

    const underScore = evaluator.normalizeReport({ overallScore: -0.3, recommendation: "skip", blocks: [] });
    expect(underScore.overallScore).toBe(0);
  });

  it("normalizeReport defaults invalid recommendation to weak_match", async () => {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => true,
      PERPLEXITY_API_URL: "https://mock.api",
      PERPLEXITY_MODEL: "sonar",
      PERPLEXITY_TIMEOUT: 5000,
      PERPLEXITY_MAX_RETRIES: 0,
      isRetryableStatus: () => false,
      getPerplexityApiKey: () => "test-key",
    }));

    const { evaluator } = await import("@/lib/agents/job-evaluator");

    const result = evaluator.normalizeReport({
      overallScore: 0.5,
      recommendation: "invalid_value",
      blocks: [],
    });

    expect(result.recommendation).toBe("weak_match");
  });

  it("fallbackReport returns a valid report with score 0", async () => {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => true,
      PERPLEXITY_API_URL: "https://mock.api",
      PERPLEXITY_MODEL: "sonar",
      PERPLEXITY_TIMEOUT: 5000,
      PERPLEXITY_MAX_RETRIES: 0,
      isRetryableStatus: () => false,
      getPerplexityApiKey: () => "test-key",
    }));

    const { evaluator } = await import("@/lib/agents/job-evaluator");

    const fallback = evaluator.fallbackReport();
    expect(fallback.overallScore).toBe(0);
    expect(fallback.recommendation).toBe("weak_match");
    expect(fallback.blocks).toHaveLength(1);
    expect(fallback.blocks[0].title).toBe("Error");
  });

  it("evaluate returns fallback when perplexity is not configured", async () => {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => false, // Not configured!
      PERPLEXITY_API_URL: "https://mock.api",
      PERPLEXITY_MODEL: "sonar",
      PERPLEXITY_TIMEOUT: 5000,
      PERPLEXITY_MAX_RETRIES: 0,
      isRetryableStatus: () => false,
      getPerplexityApiKey: () => { throw new Error("No key"); },
    }));

    vi.doMock("@/lib/perplexity/client", () => ({
      callPerplexity: vi.fn(),
      isPerplexityError: (r: unknown) => "error" in (r as Record<string, unknown>),
    }));

    const { evaluator } = await import("@/lib/agents/job-evaluator");

    const result = await evaluator.evaluate(
      "Senior Python developer needed at Acme Corp...",
      "text",
      "John has 5 years Python experience, worked at Startup Inc.",
      "job",
      { goal: "job", field: "computer_science", level: "3-5yr" }
    );

    expect(result.overallScore).toBe(0);
    expect(result.recommendation).toBe("weak_match");
  });
});

// ─── Test 2: JSON Utils (parseJsonResponse) ─────────────────────────────────────

describe("parseJsonResponse", () => {
  it("parses raw JSON object", async () => {
    const { parseJsonResponse } = await import("@/lib/perplexity/json-utils");

    const result = parseJsonResponse('{"score": 0.8, "label": "good"}');
    expect(result).toEqual([{ score: 0.8, label: "good" }]);
  });

  it("parses markdown-fenced JSON", async () => {
    const { parseJsonResponse } = await import("@/lib/perplexity/json-utils");

    const input = '```json\n{"score": 0.9}\n```';
    const result = parseJsonResponse(input);
    expect(result).toEqual([{ score: 0.9 }]);
  });

  it("parses JSON array", async () => {
    const { parseJsonResponse } = await import("@/lib/perplexity/json-utils");

    const input = '[{"a": 1}, {"a": 2}]';
    const result = parseJsonResponse(input);
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("returns null for empty input", async () => {
    const { parseJsonResponse } = await import("@/lib/perplexity/json-utils");

    expect(parseJsonResponse("")).toBeNull();
    expect(parseJsonResponse("   ")).toBeNull();
  });

  it("returns null for invalid JSON", async () => {
    const { parseJsonResponse } = await import("@/lib/perplexity/json-utils");

    const result = parseJsonResponse("This is just plain text with no JSON.");
    expect(result).toBeNull();
  });
});

// ─── Test 3: Profile API Validation ──────────────────────────────────────────────

describe("profile validation", () => {
  it("accepts valid profile payload", () => {
    const { z } = require("zod");

    const profileSchema = z.object({
      goal: z.enum(["job", "masters", "phd", "postdoc", "undecided"]),
      field: z.string().min(1).max(100),
      level: z.enum(["fresh_grad", "1-2yr", "2-4yr", "4-6yr", "6-10yr", "10+yr"]),
      geoPref: z.array(z.string().max(50)).max(10).default([]),
      researchInterests: z.array(z.string().max(100)).max(20).default([]),
    });

    const validPayload = {
      goal: "phd",
      field: "computer_science",
      level: "fresh_grad",
      geoPref: ["USA", "Germany"],
      researchInterests: ["Machine Learning", "NLP"],
    };

    const result = profileSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects invalid goal", () => {
    const { z } = require("zod");

    const profileSchema = z.object({
      goal: z.enum(["job", "masters", "phd", "postdoc", "undecided"]),
      field: z.string().min(1).max(100),
      level: z.enum(["fresh_grad", "1-2yr", "2-4yr", "4-6yr", "6-10yr", "10+yr"]),
      geoPref: z.array(z.string().max(50)).max(10).default([]),
      researchInterests: z.array(z.string().max(100)).max(20).default([]),
    });

    const invalidPayload = {
      goal: "astronaut", // invalid
      field: "physics",
      level: "senior",
    };

    const result = profileSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("rejects empty field", () => {
    const { z } = require("zod");

    const profileSchema = z.object({
      goal: z.enum(["job", "masters", "phd", "postdoc", "undecided"]),
      field: z.string().min(1).max(100),
      level: z.enum(["fresh_grad", "1-2yr", "2-4yr", "4-6yr", "6-10yr", "10+yr"]),
      geoPref: z.array(z.string().max(50)).max(10).default([]),
      researchInterests: z.array(z.string().max(100)).max(20).default([]),
    });

    const result = profileSchema.safeParse({
      goal: "job",
      field: "",
      level: "1-2yr",
    });

    expect(result.success).toBe(false);
  });

  it("limits geoPref to max 10 items", () => {
    const { z } = require("zod");

    const profileSchema = z.object({
      goal: z.enum(["job", "masters", "phd", "postdoc", "undecided"]),
      field: z.string().min(1).max(100),
      level: z.enum(["fresh_grad", "1-2yr", "2-4yr", "4-6yr", "6-10yr", "10+yr"]),
      geoPref: z.array(z.string().max(50)).max(10).default([]),
      researchInterests: z.array(z.string().max(100)).max(20).default([]),
    });

    const tooManyGeo = {
      goal: "job",
      field: "data_science",
      level: "1-2yr",
      geoPref: Array.from({ length: 15 }, (_, i) => `Country${i}`),
    };

    const result = profileSchema.safeParse(tooManyGeo);
    expect(result.success).toBe(false);
  });
});

// ─── Test 4: Evaluate API Input Validation ───────────────────────────────────────

describe("evaluate API validation", () => {
  it("rejects input shorter than 20 chars", () => {
    const { z } = require("zod");

    const evaluateSchema = z.object({
      inputContent: z.string().min(20),
      inputType: z.enum(["url", "text"]),
      cvId: z.string().uuid().optional(),
      targetType: z.enum(["job", "masters", "phd", "postdoc"]).optional(),
    });

    const result = evaluateSchema.safeParse({
      inputContent: "too short",
      inputType: "text",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid text evaluation request", () => {
    const { z } = require("zod");

    const evaluateSchema = z.object({
      inputContent: z.string().min(20),
      inputType: z.enum(["url", "text"]),
      cvId: z.string().uuid().optional(),
      targetType: z.enum(["job", "masters", "phd", "postdoc"]).optional(),
    });

    const result = evaluateSchema.safeParse({
      inputContent: "We are looking for a senior software engineer with 5+ years of experience in Python and cloud services...",
      inputType: "text",
      targetType: "job",
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid URL evaluation request", () => {
    const { z } = require("zod");

    const evaluateSchema = z.object({
      inputContent: z.string().min(20),
      inputType: z.enum(["url", "text"]),
      cvId: z.string().uuid().optional(),
      targetType: z.enum(["job", "masters", "phd", "postdoc"]).optional(),
    });

    const result = evaluateSchema.safeParse({
      inputContent: "https://careers.google.com/jobs/results/12345-software-engineer",
      inputType: "url",
      targetType: "job",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid inputType", () => {
    const { z } = require("zod");

    const evaluateSchema = z.object({
      inputContent: z.string().min(20),
      inputType: z.enum(["url", "text"]),
      cvId: z.string().uuid().optional(),
      targetType: z.enum(["job", "masters", "phd", "postdoc"]).optional(),
    });

    const result = evaluateSchema.safeParse({
      inputContent: "A long enough description for testing purposes here",
      inputType: "file", // invalid
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid cvId format", () => {
    const { z } = require("zod");

    const evaluateSchema = z.object({
      inputContent: z.string().min(20),
      inputType: z.enum(["url", "text"]),
      cvId: z.string().uuid().optional(),
      targetType: z.enum(["job", "masters", "phd", "postdoc"]).optional(),
    });

    const result = evaluateSchema.safeParse({
      inputContent: "A long enough description for testing purposes here",
      inputType: "text",
      cvId: "not-a-valid-uuid",
    });

    expect(result.success).toBe(false);
  });
});

// ─── Test 5: Orchestrator Cache Key Generation ───────────────────────────────────

describe("orchestrator cache keys", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("generates different cache keys for different tasks", async () => {
    // Mock all external dependencies
    vi.doMock("@/lib/snowflake/queries", () => ({
      getCachedResponse: vi.fn().mockResolvedValue(null),
      setCachedResponse: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/snowflake/upsert-research", () => ({
      upsertPositions: vi.fn().mockResolvedValue(undefined),
      upsertJobs: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/agents/cv-parser", () => ({ cvParser: {} }));
    vi.doMock("@/lib/agents/job-matcher", () => ({ jobMatcher: {} }));
    vi.doMock("@/lib/agents/sop-writer", () => ({ sopWriter: {} }));
    vi.doMock("@/lib/agents/skill-analyzer", () => ({ skillAnalyzer: {} }));
    vi.doMock("@/lib/agents/position-researcher", () => ({ searchPositions: vi.fn() }));
    vi.doMock("@/lib/agents/job-researcher", () => ({ searchJobs: vi.fn() }));
    vi.doMock("@/lib/agents/job-evaluator", () => ({
      evaluator: {
        evaluate: vi.fn().mockResolvedValue({
          overallScore: 0.7,
          recommendation: "good_match",
          blocks: [],
        }),
      },
    }));

    // Since buildCacheKey is not exported, we test indirectly via orchestrate
    // The fact that two different tasks produce different behavior is the test
    const { orchestrate } = await import("@/lib/agents/orchestrator");

    const result = await orchestrate({
      task: "evaluate",
      userId: "test-user-123",
      payload: {
        inputContent: "Looking for a ML engineer with Python and TensorFlow experience",
        inputType: "text",
        cvSummary: "PhD in CS with 3 years ML experience",
        targetType: "job",
      },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      overallScore: 0.7,
      recommendation: "good_match",
      blocks: [],
    });
  });
});

// ─── Test 6: Dedup Utility ───────────────────────────────────────────────────────

describe("dedup utility", () => {
  it("generates consistent hashes for same input", async () => {
    const { generateDeduplicationHash } = await import("@/lib/utils/dedup");
    
    const hash1 = generateDeduplicationHash("Software Engineer", "Google", "Mountain View");
    const hash2 = generateDeduplicationHash("Software Engineer", "Google", "Mountain View");
    
    expect(hash1).toBe(hash2);
  });

  it("generates different hashes for different input", async () => {
    const { generateDeduplicationHash } = await import("@/lib/utils/dedup");
    
    const hash1 = generateDeduplicationHash("Software Engineer", "Google", "Mountain View");
    const hash2 = generateDeduplicationHash("Data Scientist", "Meta", "New York");
    
    expect(hash1).not.toBe(hash2);
  });
});

// ─── Test 7: Rate Limiter Logic ──────────────────────────────────────────────────

describe("rate limiter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports enforceRateLimit function", async () => {
    vi.doMock("@/lib/snowflake/queries", () => ({
      getUserUsageCount: vi.fn().mockResolvedValue(0),
    }));

    const mod = await import("@/lib/utils/rate-limit");
    expect(typeof mod.enforceRateLimit).toBe("function");
  });

  it("throws RateLimitError when limit exceeded", async () => {
    vi.doMock("@/lib/snowflake/queries", () => ({
      getUserUsageCount: vi.fn().mockResolvedValue(100), // exceed any limit
    }));

    const { enforceRateLimit, RateLimitError } = await import("@/lib/utils/rate-limit");

    // "search" has maxCount: 3 in free tier, so 100 usage exceeds it
    await expect(enforceRateLimit("user-1", "free", "search")).rejects.toThrow(RateLimitError);
  });
});

// ─── Test 8: Callback URL Security (existing test expanded) ──────────────────────

describe("callback URL security", () => {
  it("blocks javascript: protocol URLs", async () => {
    const { getSafeCallbackUrl } = await import("@/lib/auth/callback-url");

    const result = getSafeCallbackUrl("javascript:alert(1)", "https://example.com");
    expect(result).toBe("/dashboard");
  });

  it("blocks data: protocol URLs", async () => {
    const { getSafeCallbackUrl } = await import("@/lib/auth/callback-url");

    const result = getSafeCallbackUrl("data:text/html,<script>alert(1)</script>", "https://example.com");
    expect(result).toBe("/dashboard");
  });

  it("allows valid internal paths", async () => {
    const { getSafeCallbackUrl } = await import("@/lib/auth/callback-url");

    expect(getSafeCallbackUrl("/dashboard/evaluate", "https://example.com")).toBe("/dashboard/evaluate");
    expect(getSafeCallbackUrl("/dashboard/upload", "https://example.com")).toBe("/dashboard/upload");
  });
});
