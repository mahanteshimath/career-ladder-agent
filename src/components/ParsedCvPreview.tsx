"use client";

import {
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Tag,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export interface ParsedCvData {
  name: string;
  email: string;
  phone?: string;
  summary: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }[];
  publications?: string[];
  certifications?: string[];
  keywords: string[];
}

export interface DetectedProfile {
  goal: string;
  field: string;
  level: string;
  geoPref?: string[];
  researchInterests?: string[];
}

interface ParsedCvPreviewProps {
  data: ParsedCvData;
  profile?: DetectedProfile;
  filename?: string;
}

const goalLabels: Record<string, string> = {
  job: "Job Seeker",
  masters: "Masters Applicant",
  phd: "PhD Applicant",
  postdoc: "Postdoc Researcher",
  undecided: "Exploring Options",
};

const levelLabels: Record<string, string> = {
  fresh_grad: "Fresh Graduate",
  "1-2yr": "1–2 Years Experience",
  "3-5yr": "3–5 Years Experience",
  "5-10yr": "5–10 Years Experience",
  "10+yr": "10+ Years Experience",
};

function Section({
  icon: Icon,
  title,
  count,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <Icon size={16} className="text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">({count})</span>
        )}
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

export function ParsedCvPreview({ data, profile, filename }: ParsedCvPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Header: identity + detected profile */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">
              {(data.name || "?").charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground">{data.name || "Unknown"}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {data.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} /> {data.email}
                </span>
              )}
              {data.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={13} /> {data.phone}
                </span>
              )}
            </div>
            {data.summary && (
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                {data.summary}
              </p>
            )}
          </div>
        </div>

        {/* Detected profile badges */}
        {profile && (
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
              <Target size={12} />
              {goalLabels[profile.goal] || profile.goal}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-foreground">
              {levelLabels[profile.level] || profile.level}
            </span>
            {profile.field && profile.field !== "general" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-foreground">
                {profile.field.replace(/_/g, " ")}
              </span>
            )}
            {profile.geoPref?.map((geo) => (
              <span
                key={geo}
                className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {geo}
              </span>
            ))}
          </div>
        )}

        {filename && (
          <p className="mt-3 text-xs text-muted-foreground">
            Source: {filename}
          </p>
        )}
      </div>

      {/* Skills */}
      {data.skills?.length > 0 && (
        <Section icon={Tag} title="Skills" count={data.skills.length}>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {skill}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {data.experience?.length > 0 && (
        <Section icon={Briefcase} title="Experience" count={data.experience.length}>
          <div className="space-y-3">
            {data.experience.map((exp, i) => (
              <div key={i} className="relative pl-4 border-l-2 border-primary/30">
                <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {exp.company} · {exp.duration}
                </p>
                {exp.highlights?.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {exp.highlights.map((h, j) => (
                      <li key={j} className="text-xs text-foreground/70 flex gap-1.5">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {data.education?.length > 0 && (
        <Section icon={GraduationCap} title="Education" count={data.education.length}>
          <div className="space-y-2">
            {data.education.map((edu, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{edu.degree}</h4>
                  <p className="text-xs text-muted-foreground">
                    {edu.institution} · {edu.year}
                    {edu.gpa && ` · GPA: ${edu.gpa}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <Section icon={Award} title="Certifications" count={data.certifications.length} defaultOpen={false}>
          <ul className="space-y-1">
            {data.certifications.map((cert, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-center gap-2">
                <Award size={12} className="text-primary shrink-0" />
                {cert}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Publications */}
      {data.publications && data.publications.length > 0 && (
        <Section icon={BookOpen} title="Publications" count={data.publications.length} defaultOpen={false}>
          <ul className="space-y-1">
            {data.publications.map((pub, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                <BookOpen size={12} className="text-primary shrink-0 mt-1" />
                <span>{pub}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Keywords (collapsed by default) */}
      {data.keywords?.length > 0 && (
        <Section icon={User} title="Extracted Keywords" count={data.keywords.length} defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {data.keywords.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 text-[11px] rounded bg-muted text-muted-foreground"
              >
                {kw}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
