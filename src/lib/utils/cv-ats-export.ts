/**
 * Convert a structured CV into clean, single-column plain text that any
 * Applicant Tracking System (ATS) can parse reliably — no tables, columns,
 * icons, or styling that commonly breaks automated resume parsers.
 */

export interface AtsCvExperience {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface AtsCvEducation {
  degree: string;
  institution: string;
  year?: string;
  gpa?: string;
}

export interface AtsCv {
  personalInfo: {
    fullName: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
  };
  summary?: string;
  experience?: AtsCvExperience[];
  education?: AtsCvEducation[];
  skills?: string[];
}

/** Render a structured CV to ATS-safe plain text. */
export function cvToAtsText(cv: AtsCv): string {
  const lines: string[] = [];
  const pi = cv.personalInfo || { fullName: "" };

  if (pi.fullName) lines.push(pi.fullName.toUpperCase());

  const contact = [pi.email, pi.phone, pi.location, pi.linkedIn].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);

  if (cv.summary?.trim()) {
    lines.push("", "SUMMARY", cv.summary.trim());
  }

  const experience = (cv.experience || []).filter((e) => e.title || e.company);
  if (experience.length) {
    lines.push("", "EXPERIENCE");
    for (const exp of experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      const header = [exp.title, exp.company].filter(Boolean).join(" - ");
      lines.push(dates ? `${header} (${dates})` : header);
      for (const h of (exp.highlights || []).filter((x) => x && x.trim())) {
        lines.push(`- ${h.trim()}`);
      }
    }
  }

  const education = (cv.education || []).filter((e) => e.degree || e.institution);
  if (education.length) {
    lines.push("", "EDUCATION");
    for (const edu of education) {
      const header = [edu.degree, edu.institution].filter(Boolean).join(" - ");
      const extras = [edu.year, edu.gpa ? `GPA: ${edu.gpa}` : ""].filter(Boolean).join(", ");
      lines.push(extras ? `${header} (${extras})` : header);
    }
  }

  const skills = (cv.skills || []).filter((s) => s && s.trim());
  if (skills.length) {
    lines.push("", "SKILLS", skills.map((s) => s.trim()).join(", "));
  }

  return lines.join("\n").trim() + "\n";
}
