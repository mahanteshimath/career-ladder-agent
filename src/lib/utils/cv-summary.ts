/**
 * Build a concise but information-rich CV summary from parsed CV JSON.
 * Used by the evaluator (and reusable elsewhere) to give the AI proper
 * context instead of a 2-3 sentence blurb or a raw JSON dump.
 */
export function buildCvSummary(parsed: Record<string, unknown> | null | undefined): string {
  if (!parsed || typeof parsed !== "object") return "";
  const p = parsed as Record<string, unknown>;
  const parts: string[] = [];

  if (p.name) parts.push(`Name: ${String(p.name)}`);

  const skills = p.skills;
  if (Array.isArray(skills) && skills.length) {
    parts.push(`Skills: ${skills.slice(0, 25).map(String).join(", ")}`);
  }

  const experience = p.experience;
  if (Array.isArray(experience) && experience.length) {
    const exp = experience
      .slice(0, 4)
      .map((e) => {
        const ex = e as Record<string, unknown>;
        return `${ex.title || ""} at ${ex.company || ""} (${ex.duration || ""})`.trim();
      })
      .join("; ");
    parts.push(`Experience: ${exp}`);
  }

  const education = p.education;
  if (Array.isArray(education) && education.length) {
    const edu = education
      .slice(0, 3)
      .map((e) => {
        const ed = e as Record<string, unknown>;
        return `${ed.degree || ""} from ${ed.institution || ""} ${ed.year || ""}`.trim();
      })
      .join("; ");
    parts.push(`Education: ${edu}`);
  }

  const publications = p.publications;
  if (Array.isArray(publications) && publications.length) {
    parts.push(`Publications: ${publications.length} listed`);
  }

  if (p.summary) parts.push(`Summary: ${String(p.summary)}`);

  const keywords = p.keywords;
  if (Array.isArray(keywords) && keywords.length) {
    parts.push(`Keywords: ${keywords.slice(0, 25).map(String).join(", ")}`);
  }

  return parts.join("\n").slice(0, 4000);
}
