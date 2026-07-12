import { describe, it, expect } from "vitest";
import { computeFitScore, fitBand } from "@/lib/utils/fit-score";

describe("computeFitScore", () => {
  it("returns 0 when inputs are missing", () => {
    expect(computeFitScore([], "some text")).toBe(0);
    expect(computeFitScore(["python"], "")).toBe(0);
    expect(computeFitScore(undefined, "text")).toBe(0);
    expect(computeFitScore(["python"], undefined)).toBe(0);
  });

  it("scores high when many keywords overlap", () => {
    const cv = ["machine learning", "python", "pytorch", "nlp"];
    const text = "PhD in machine learning using python and pytorch for nlp research.";
    const score = computeFitScore(cv, text);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(fitBand(score)).toBe("strong");
  });

  it("scores low when little overlaps", () => {
    const cv = ["accounting", "taxation", "audit", "finance", "ledger"];
    const text = "Postdoc position in quantum photonics and laser physics.";
    const score = computeFitScore(cv, text);
    expect(score).toBeLessThan(40);
    expect(fitBand(score)).toBe("reach");
  });

  it("uses word boundaries to avoid false substring matches", () => {
    // "ai" should NOT match inside "brain" or "chair".
    const score = computeFitScore(["ai"], "The brain chair contained air.");
    expect(score).toBe(0);
  });

  it("deduplicates repeated keywords", () => {
    const cv = ["python", "python", "python", "python"];
    const text = "We use python.";
    // 1 distinct matched keyword, denom floored at 4 => 25.
    expect(computeFitScore(cv, text)).toBe(25);
  });

  it("clamps between 0 and 100", () => {
    const cv = Array.from({ length: 20 }, (_, i) => `kw${i}`);
    const text = cv.join(" ");
    const score = computeFitScore(cv, text);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
