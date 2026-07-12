"use client";

import { useState } from "react";
import { CV_TEMPLATES, type CvTemplate, type CvExperienceEntry, type CvEducationEntry } from "@/config/cv-templates";
import { cvToAtsText, type AtsCv } from "@/lib/utils/cv-ats-export";

type Step = "template" | "form" | "building" | "preview";

export default function CvBuilderPage() {
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<CvTemplate | null>(null);
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "", email: "", phone: "", location: "", linkedIn: "", portfolio: "",
  });
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState<CvExperienceEntry[]>([
    { title: "", company: "", location: "", startDate: "", endDate: "", highlights: [""] },
  ]);
  const [education, setEducation] = useState<CvEducationEntry[]>([
    { degree: "", institution: "", year: "", gpa: "" },
  ]);
  const [skills, setSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [cvResult, setCvResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function handleBuild() {
    setStep("building");
    setError("");

    try {
      const res = await fetch("/api/cv/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate!.id,
          personalInfo,
          summary,
          experience: experience.filter((e) => e.title && e.company),
          education: education.filter((e) => e.degree && e.institution),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          enhance: true,
          targetRole: targetRole || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCvResult(data.data.cv);
        setStep("preview");
      } else {
        setError(data.error?.message || data.error || "Build failed");
        setStep("form");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    }
  }

  function addExperience() {
    setExperience([...experience, { title: "", company: "", location: "", startDate: "", endDate: "", highlights: [""] }]);
  }

  function updateExperience(idx: number, field: keyof CvExperienceEntry, value: string | string[]) {
    const updated = [...experience];
    updated[idx] = { ...updated[idx], [field]: value };
    setExperience(updated);
  }

  function addEducation() {
    setEducation([...education, { degree: "", institution: "", year: "", gpa: "" }]);
  }

  function updateEducation(idx: number, field: keyof CvEducationEntry, value: string) {
    const updated = [...education];
    updated[idx] = { ...updated[idx], [field]: value };
    setEducation(updated);
  }

  // ─── TEMPLATE SELECTION ──────────────────────────────────────
  if (step === "template") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CV Builder</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Choose a template, fill in your details, and let AI enhance your CV.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {CV_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => { setSelectedTemplate(tpl); setStep("form"); }}
              className="p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-left transition-all hover:shadow-md"
            >
              <div className="w-full h-2 rounded-full mb-4" style={{ backgroundColor: tpl.color }} />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{tpl.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tpl.description}</p>
              <span className="inline-block mt-3 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
                {tpl.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── FORM ────────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fill Your Details</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Template: <span className="font-medium">{selectedTemplate?.name}</span>
            </p>
          </div>
          <button onClick={() => setStep("template")} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Change template
          </button>
        </div>

        <div className="space-y-6">
          {/* Personal Info */}
          <Section title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={personalInfo.fullName} onChange={(v) => setPersonalInfo({ ...personalInfo, fullName: v })} required />
              <Input label="Email" value={personalInfo.email} onChange={(v) => setPersonalInfo({ ...personalInfo, email: v })} required />
              <Input label="Phone" value={personalInfo.phone} onChange={(v) => setPersonalInfo({ ...personalInfo, phone: v })} required />
              <Input label="Location" value={personalInfo.location} onChange={(v) => setPersonalInfo({ ...personalInfo, location: v })} required />
              <Input label="LinkedIn URL (optional)" value={personalInfo.linkedIn} onChange={(v) => setPersonalInfo({ ...personalInfo, linkedIn: v })} />
              <Input label="Portfolio URL (optional)" value={personalInfo.portfolio} onChange={(v) => setPersonalInfo({ ...personalInfo, portfolio: v })} />
            </div>
          </Section>

          {/* Summary */}
          <Section title="Professional Summary">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief overview of your background and what you bring to employers..."
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </Section>

          {/* Experience */}
          <Section title="Work Experience">
            {experience.map((exp, idx) => (
              <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Job Title" value={exp.title} onChange={(v) => updateExperience(idx, "title", v)} />
                  <Input label="Company" value={exp.company} onChange={(v) => updateExperience(idx, "company", v)} />
                  <Input label="Start Date" value={exp.startDate} onChange={(v) => updateExperience(idx, "startDate", v)} placeholder="Jan 2022" />
                  <Input label="End Date" value={exp.endDate} onChange={(v) => updateExperience(idx, "endDate", v)} placeholder="Present" />
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Key Achievements (one per line)</label>
                  <textarea
                    value={exp.highlights.join("\n")}
                    onChange={(e) => updateExperience(idx, "highlights", e.target.value.split("\n"))}
                    rows={3}
                    placeholder="- Led a team of 5 engineers...&#10;- Increased revenue by 20%..."
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            ))}
            <button onClick={addExperience} className="text-sm text-blue-600 hover:underline">+ Add experience</button>
          </Section>

          {/* Education */}
          <Section title="Education">
            {education.map((edu, idx) => (
              <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Degree" value={edu.degree} onChange={(v) => updateEducation(idx, "degree", v)} placeholder="B.Tech in CS" />
                  <Input label="Institution" value={edu.institution} onChange={(v) => updateEducation(idx, "institution", v)} />
                  <Input label="Year" value={edu.year} onChange={(v) => updateEducation(idx, "year", v)} placeholder="2020 - 2024" />
                  <Input label="GPA (optional)" value={edu.gpa || ""} onChange={(v) => updateEducation(idx, "gpa", v)} placeholder="8.5/10" />
                </div>
              </div>
            ))}
            <button onClick={addEducation} className="text-sm text-blue-600 hover:underline">+ Add education</button>
          </Section>

          {/* Skills */}
          <Section title="Skills">
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Python, React, Machine Learning, Project Management (comma-separated)"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </Section>

          {/* Target Role */}
          <Section title="Target Role (optional — helps AI tailor content)">
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Senior Data Scientist at a tech startup"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </Section>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleBuild}
            disabled={!personalInfo.fullName || !personalInfo.email || !summary}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Build & Enhance CV with AI ✨
          </button>
        </div>
      </div>
    );
  }

  // ─── BUILDING ────────────────────────────────────────────────
  if (step === "building") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-10 h-10 text-blue-600 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Building your CV...</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">AI is enhancing your content. This takes 30-60 seconds.</p>
      </div>
    );
  }

  // ─── PREVIEW ─────────────────────────────────────────────────
  if (step === "preview" && cvResult) {
    const cv = cvResult as {
      personalInfo: { fullName: string; email: string; phone: string; location: string; linkedIn?: string };
      summary: string;
      experience: { title: string; company: string; startDate: string; endDate: string; highlights: string[] }[];
      education: { degree: string; institution: string; year: string; gpa?: string }[];
      skills: string[];
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Enhanced CV</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print / Save as PDF
            </button>
            <button
              onClick={() => {
                const text = cvToAtsText(cv as AtsCv);
                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const safeName = (cv.personalInfo.fullName || "CV").replace(/[^a-z0-9]+/gi, "_");
                a.download = `${safeName}_ATS.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              title="Plain-text, single-column resume that any ATS can parse"
            >
              Download ATS-safe (.txt)
            </button>
            <button
              onClick={() => { setStep("form"); setCvResult(null); }}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              Edit
            </button>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠️ Please verify all information is accurate before submitting. AI may improve wording but should not fabricate details.
          </p>
        </div>

        {/* CV Render (printable) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cv.personalInfo.fullName}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {cv.personalInfo.email} • {cv.personalInfo.phone} • {cv.personalInfo.location}
              {cv.personalInfo.linkedIn && ` • ${cv.personalInfo.linkedIn}`}
            </p>
          </div>

          {cv.summary && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cv.summary}</p>
            </div>
          )}

          {cv.experience?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">Experience</h3>
              {cv.experience.map((exp, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{exp.title} — {exp.company}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{exp.startDate} – {exp.endDate}</p>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {exp.highlights.filter(Boolean).map((h, j) => (
                      <li key={j} className="text-sm text-gray-700 dark:text-gray-300 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {cv.education?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">Education</h3>
              {cv.education.map((edu, i) => (
                <div key={i} className="mb-2 flex justify-between items-baseline">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{edu.degree}</span> — {edu.institution}
                    {edu.gpa && <span className="text-gray-500 dark:text-gray-400 ml-2">({edu.gpa})</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{edu.year}</p>
                </div>
              ))}
            </div>
          )}

          {cv.skills?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {cv.skills.map((skill, i) => (
                  <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── SHARED COMPONENTS ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
    </div>
  );
}
