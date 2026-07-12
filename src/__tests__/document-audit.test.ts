import { describe, it, expect } from "vitest";
import { auditDocument } from "@/lib/agents/sop-writer";

/** Build a filler string of N words to hit target lengths. */
function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

describe("auditDocument", () => {
  it("flags generic banned phrases", () => {
    const text = `I am writing to express my interest. I am a hardworking team player. ${words(820)}`;
    const audit = auditDocument(text, "sop");
    expect(audit.bannedPhrases).toContain("i am writing to express");
    expect(audit.bannedPhrases).toContain("hardworking");
    expect(audit.bannedPhrases).toContain("team player");
    expect(audit.specificityScore).toBeLessThan(70);
  });

  it("detects unfilled placeholders", () => {
    const text = `Dear [Hiring Manager], I want to join your company. [Position] excites me. ${words(430)}`;
    const audit = auditDocument(text, "cover_letter");
    expect(audit.placeholders.length).toBeGreaterThan(0);
    expect(audit.placeholders.some((p) => p.includes("["))).toBe(true);
    expect(audit.suggestions.join(" ")).toMatch(/placeholder/i);
  });

  it("rewards concrete, specific content with a high score", () => {
    const specific = `At the MIT Media Lab I built a system that cut latency by 42% across 3 datasets, publishing with Professor Jane Smith at Stanford University. ${words(830)}`;
    const audit = auditDocument(specific, "sop");
    expect(audit.bannedPhrases).toHaveLength(0);
    expect(audit.placeholders).toHaveLength(0);
    expect(audit.specificityScore).toBeGreaterThanOrEqual(80);
  });

  it("checks target length per document type", () => {
    const shortSop = auditDocument(words(100), "sop");
    expect(shortSop.withinTargetLength).toBe(false);
    expect(shortSop.suggestions.join(" ")).toMatch(/short/i);

    const goodCover = auditDocument(words(500), "cover_letter");
    expect(goodCover.withinTargetLength).toBe(true);
  });

  it("clamps the score between 0 and 100", () => {
    const awful = `I am writing to express since a young age hardworking team player results-driven detail-oriented self-starter go-getter passionate about your company [Name] [Company] XYZ`;
    const audit = auditDocument(awful, "sop");
    expect(audit.specificityScore).toBeGreaterThanOrEqual(0);
    expect(audit.specificityScore).toBeLessThanOrEqual(100);
  });
});
