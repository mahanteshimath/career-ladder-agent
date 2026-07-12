export type TierName = "free" | "basic" | "premium";

interface ActionLimit {
  maxCount: number;
  periodDays: number;
}

interface TierConfig {
  name: TierName;
  displayName: string;
  price: string;
  priceSubtext: string;
  features: string[];
  limits: Record<string, ActionLimit>;
  maxCvs: number;
  resultsExpireDays: number | null;
}

export const TIER_LIMITS: Record<TierName, TierConfig> = {
  free: {
    name: "free",
    displayName: "Free (Level 1)",
    price: "₹0",
    priceSubtext: "Forever free",
    features: [
      "Common keyword job results only",
      "View-only (no saves)",
      "Basic job search",
    ],
    limits: {
      search: { maxCount: 3, periodDays: 7 },
      cv_upload: { maxCount: 1, periodDays: 30 },
      match: { maxCount: 3, periodDays: 7 },
      research: { maxCount: 0, periodDays: 7 }, // Disabled for free tier
    },
    maxCvs: 1,
    resultsExpireDays: null, // View-only, no saved results
  },
  basic: {
    name: "basic",
    displayName: "Basic (Level 2)",
    price: "₹75",
    priceSubtext: "per week",
    features: [
      "Upload up to 2 CVs",
      "7-day full access",
      "3 searches per CV",
      "Keyword + semantic matching",
      "Results saved for 14 days",
    ],
    limits: {
      search: { maxCount: 6, periodDays: 7 }, // 3 per CV × 2 CVs
      cv_upload: { maxCount: 2, periodDays: 7 },
      match: { maxCount: 10, periodDays: 7 },
      sop_generate: { maxCount: 2, periodDays: 7 },
      research: { maxCount: 3, periodDays: 7 },
    },
    maxCvs: 2,
    resultsExpireDays: 14,
  },
  premium: {
    name: "premium",
    displayName: "Premium (Level 3)",
    price: "₹499",
    priceSubtext: "per month",
    features: [
      "Unlimited CV uploads",
      "Full access: CV/SOP/Cover Letter generation",
      "Saved progress & history",
      "Skill gap analysis",
      "Priority AI processing",
    ],
    limits: {
      search: { maxCount: 100, periodDays: 30 },
      cv_upload: { maxCount: 20, periodDays: 30 },
      match: { maxCount: 200, periodDays: 30 },
      sop_generate: { maxCount: 30, periodDays: 30 },
      cover_letter: { maxCount: 30, periodDays: 30 },
      skill_analysis: { maxCount: 50, periodDays: 30 },
      research: { maxCount: 20, periodDays: 30 },
    },
    maxCvs: 20,
    resultsExpireDays: null, // Never expire
  },
};

export const PRICING_TIERS = Object.values(TIER_LIMITS);

/**
 * Display-only upcoming tier shown on the pricing page as "Coming Soon".
 * Not wired into TIER_LIMITS / rate limiting / auth yet.
 */
export interface DisplayTier {
  name: string;
  displayName: string;
  price: string;
  priceSubtext: string;
  features: string[];
  comingSoon?: boolean;
}

export const UPCOMING_TIERS: DisplayTier[] = [
  {
    name: "mentor",
    displayName: "Pro + Mentor (Level 4)",
    price: "₹899",
    priceSubtext: "per month",
    features: [
      "Everything in Premium",
      "2 personal mentor sessions (30 min each)",
      "Access to 1 live webinar",
      "Human guidance on your applications",
    ],
    comingSoon: true,
  },
];
