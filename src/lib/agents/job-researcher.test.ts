import { describe, it, expect } from "vitest";
import { isDeadlinePassed } from "@/lib/agents/job-researcher";
import { TRUST_BOUNDARY, GROUNDING_RULE } from "@/lib/agents/safety";

describe("isDeadlinePassed", () => {
  const today = "2026-07-21";

  it("flags a past-dated deadline as expired", () => {
    expect(isDeadlinePassed("2026-07-20", today)).toBe(true);
    expect(isDeadlinePassed("Apply by 2025-01-01", today)).toBe(true);
  });

  it("keeps today's and future deadlines", () => {
    expect(isDeadlinePassed("2026-07-21", today)).toBe(false);
    expect(isDeadlinePassed("2026-12-31", today)).toBe(false);
  });

  it("treats missing or non-date deadlines as not-expired", () => {
    expect(isDeadlinePassed(undefined, today)).toBe(false);
    expect(isDeadlinePassed("", today)).toBe(false);
    expect(isDeadlinePassed("Open until filled", today)).toBe(false);
    expect(isDeadlinePassed("rolling", today)).toBe(false);
  });
});

describe("prompt-safety constants", () => {
  it("trust boundary declares posting text untrusted", () => {
    expect(TRUST_BOUNDARY.toLowerCase()).toContain("untrusted");
    expect(TRUST_BOUNDARY.toLowerCase()).toContain("never");
  });

  it("grounding rule forbids fabrication", () => {
    expect(GROUNDING_RULE.toLowerCase()).toContain("never invent");
  });
});
