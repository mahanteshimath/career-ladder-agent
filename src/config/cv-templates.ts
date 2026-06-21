export interface CvTemplate {
  id: string;
  name: string;
  description: string;
  category: "professional" | "academic" | "creative" | "minimal";
  color: string; // accent color for preview card
}

export const CV_TEMPLATES: CvTemplate[] = [
  {
    id: "professional-classic",
    name: "Professional Classic",
    description: "Traditional single-column layout with serif headers. Best for corporate and finance roles.",
    category: "professional",
    color: "#1e3a5f",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean two-column design with subtle accents. Great for tech and startup roles.",
    category: "minimal",
    color: "#0ea5e9",
  },
  {
    id: "academic-cv",
    name: "Academic CV",
    description: "Publication-focused layout with sections for research, teaching, and grants.",
    category: "academic",
    color: "#7c3aed",
  },
  {
    id: "creative-bold",
    name: "Creative Bold",
    description: "Color accents with a sidebar for skills. Ideal for design, marketing, and media roles.",
    category: "creative",
    color: "#e11d48",
  },
  {
    id: "ats-optimized",
    name: "ATS-Optimized",
    description: "Plain, scannable format designed to pass Applicant Tracking Systems without issues.",
    category: "professional",
    color: "#059669",
  },
];

export interface CvFormData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedIn?: string;
    portfolio?: string;
  };
  summary: string;
  experience: CvExperienceEntry[];
  education: CvEducationEntry[];
  skills: string[];
  publications?: string[];
  certifications?: string[];
}

export interface CvExperienceEntry {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface CvEducationEntry {
  degree: string;
  institution: string;
  year: string;
  gpa?: string;
}
