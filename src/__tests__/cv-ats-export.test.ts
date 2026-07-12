import { describe, it, expect } from "vitest";
import { cvToAtsText, type AtsCv } from "@/lib/utils/cv-ats-export";

const sample: AtsCv = {
  personalInfo: {
    fullName: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 90000 00000",
    location: "Bengaluru, India",
    linkedIn: "linkedin.com/in/asharao",
  },
  summary: "ML engineer with 4 years building NLP systems.",
  experience: [
    {
      title: "ML Engineer",
      company: "Acme",
      startDate: "2022",
      endDate: "Present",
      highlights: ["Cut latency by 30%", "Shipped 3 models", ""],
    },
  ],
  education: [{ degree: "B.Tech CSE", institution: "IIT", year: "2021", gpa: "8.9" }],
  skills: ["Python", "PyTorch", "NLP"],
};

describe("cvToAtsText", () => {
  it("renders name uppercased and a single-line contact row", () => {
    const text = cvToAtsText(sample);
    expect(text).toContain("ASHA RAO");
    expect(text).toContain("asha@example.com | +91 90000 00000 | Bengaluru, India | linkedin.com/in/asharao");
  });

  it("includes all sections with plain headers", () => {
    const text = cvToAtsText(sample);
    for (const header of ["SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS"]) {
      expect(text).toContain(header);
    }
    expect(text).toContain("ML Engineer - Acme (2022 - Present)");
    expect(text).toContain("- Cut latency by 30%");
    expect(text).toContain("B.Tech CSE - IIT (2021, GPA: 8.9)");
    expect(text).toContain("Python, PyTorch, NLP");
  });

  it("omits empty highlights and sections", () => {
    const text = cvToAtsText(sample);
    // The empty highlight string should not produce a stray "- " line.
    expect(text).not.toMatch(/\n- \n/);

    const minimal = cvToAtsText({ personalInfo: { fullName: "Solo" } });
    expect(minimal.trim()).toBe("SOLO");
    expect(minimal).not.toContain("EXPERIENCE");
  });

  it("contains no tab/table characters (ATS-safe)", () => {
    const text = cvToAtsText(sample);
    expect(text).not.toContain("\t");
  });
});
