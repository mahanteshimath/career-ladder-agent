import { describe, it, expect } from "vitest";
import { pickBetterDraft } from "@/lib/agents/sop-writer";
import type { DocumentAudit } from "@/lib/agents/sop-writer";

function audit(score: number): DocumentAudit {
  return {
    specificityScore: score,
    bannedPhrases: [],
    placeholders: [],
    withinTargetLength: true,
    suggestions: [],
  };
}

describe("pickBetterDraft", () => {
  it("keeps the original when there is no revision", () => {
    const out = pickBetterDraft("ORIGINAL", audit(50), null, "cover_letter");
    expect(out.content).toBe("ORIGINAL");
    expect(out.audit.specificityScore).toBe(50);
  });

  it("accepts the revision when the original scores rock-bottom", () => {
    const out = pickBetterDraft("orig", audit(0), "A revised cover letter draft.", "cover_letter");
    expect(out.content).toBe("A revised cover letter draft.");
  });

  it("keeps the original when the revision is vaguer", () => {
    // A short, cliché-laden revision will score well below a perfect original.
    const revised = "I am a hardworking team player and a perfect candidate.";
    const out = pickBetterDraft("orig", audit(100), revised, "cover_letter");
    expect(out.content).toBe("orig");
  });
});
