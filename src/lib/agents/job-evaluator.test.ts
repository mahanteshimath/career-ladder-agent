import { describe, it, expect } from "vitest";
import { evaluator } from "@/lib/agents/job-evaluator";

describe("evaluator.normalizeReport eligibility gate", () => {
  it("forces 'skip' when work authorization FAILs, even on a high score", () => {
    const report = evaluator.normalizeReport({
      overallScore: 0.9,
      recommendation: "strong_match",
      blocks: [
        { title: "Eligibility", content: { workAuthorization: "FAIL", evidence: "must be a citizen" } },
      ],
    });
    expect(report.recommendation).toBe("skip");
  });

  it("keeps the recommendation when eligibility PASSes", () => {
    const report = evaluator.normalizeReport({
      overallScore: 0.8,
      recommendation: "strong_match",
      blocks: [{ title: "Eligibility", content: { workAuthorization: "PASS" } }],
    });
    expect(report.recommendation).toBe("strong_match");
  });

  it("normalizes an invalid recommendation to weak_match", () => {
    const report = evaluator.normalizeReport({
      overallScore: 0.5,
      recommendation: "banana",
      blocks: [],
    });
    expect(report.recommendation).toBe("weak_match");
  });
});
