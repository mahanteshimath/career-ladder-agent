// ============================================================
// Core domain types for Career-Ladder-Agent
// ============================================================

export type TierName = "free" | "basic" | "premium";

export type UserGoal = "job" | "masters" | "phd" | "postdoc" | "undecided";
export type UserLevel = "fresh_grad" | "1-2yr" | "2-4yr" | "4-6yr" | "6-10yr" | "10+yr";

export interface UserProfile {
  goal: UserGoal;
  field: string;
  level: UserLevel;
  geoPref?: string[];
  researchInterests?: string[];
  detectedAt: string;
  confirmedByUser: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  tier: TierName;
  profile?: UserProfile;
  onboardingComplete: boolean;
  subscriptionExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Evaluation types (Phase 2 - Structured Reports)
// ============================================================

export interface EvaluationBlock {
  title: string;
  content: Record<string, unknown>;
}

export interface EvaluationResult {
  id?: string;
  userId: string;
  cvId?: string;
  inputType: "url" | "text";
  inputContent: string;
  targetType: UserGoal;
  overallScore: number;
  recommendation: "strong_match" | "good_match" | "weak_match" | "skip";
  blocks: EvaluationBlock[];
  createdAt?: string;
}

export interface Cv {
  id: string;
  userId: string;
  filename: string;
  rawText: string;
  parsedJson: ParsedCvJson;
  embedding?: number[];
  stagePath?: string;
  uploadedAt: string;
}

export interface ParsedCvJson {
  name: string;
  email: string;
  phone?: string;
  summary: string;
  skills: string[];
  experience: CvExperience[];
  education: CvEducation[];
  publications?: string[];
  certifications?: string[];
  keywords: string[];
}

export interface CvExperience {
  title: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface CvEducation {
  degree: string;
  institution: string;
  year: string;
  gpa?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  keywords: string[];
  source: string;
  postedAt: string;
  createdAt: string;
}

export interface Position {
  id: string;
  title: string;
  university: string;
  department: string;
  location: string;
  description: string;
  keywords: string[];
  source: string;
  deadline?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  userId: string;
  cvId: string;
  targetType: "job" | "position";
  targetId: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  matchedAt: string;
}

export interface Draft {
  id: string;
  userId: string;
  type: "sop" | "cover_letter" | "cv" | "email";
  content: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface UsageEntry {
  id: string;
  userId: string;
  actionType: string;
  cvId?: string;
  createdAt: string;
}

// ============================================================
// API request/response types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    cached?: boolean;
    processingTime?: number;
    remaining?: number;
  };
}

export interface MatchSearchRequest {
  cvId: string;
  targetType: "job" | "position";
  keywords?: string[];
  filters?: Record<string, string>;
}

export interface SopGenerateRequest {
  cvId: string;
  positionId?: string;
  positionContext?: string;
  instructions?: string;
}

export interface CoverLetterRequest {
  cvId: string;
  jobId?: string;
  jobDescription?: string;
  instructions?: string;
}

// ============================================================
// Session extension for NextAuth
// ============================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      tier: TierName;
      persona?: "student" | "job_seeker" | "unset";
    };
  }
}
