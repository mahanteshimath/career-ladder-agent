"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type UserGoal = "job" | "masters" | "phd" | "postdoc" | "undecided";
type UserLevel = "fresh_grad" | "1-2yr" | "2-4yr" | "4-6yr" | "6-10yr" | "10+yr";

interface DetectedProfile {
  goal: UserGoal;
  field: string;
  level: UserLevel;
  geoPref?: string[];
  researchInterests?: string[];
}

const GOAL_OPTIONS: { value: UserGoal; label: string; emoji: string; desc: string }[] = [
  { value: "job", label: "Industry Job", emoji: "💼", desc: "Full-time, internship, or contract roles" },
  { value: "masters", label: "Masters Program", emoji: "🎓", desc: "Graduate school applications" },
  { value: "phd", label: "PhD Position", emoji: "🔬", desc: "Doctoral research positions" },
  { value: "postdoc", label: "Postdoc / Research", emoji: "📚", desc: "Post-doctoral or research roles" },
  { value: "undecided", label: "Exploring Options", emoji: "🧭", desc: "Not sure yet — show me everything" },
];

const LEVEL_OPTIONS: { value: UserLevel; label: string }[] = [
  { value: "fresh_grad", label: "Fresh Graduate (< 1 year)" },
  { value: "1-2yr", label: "Early Career (1-2 years)" },
  { value: "2-4yr", label: "Mid-Early (2-4 years)" },
  { value: "4-6yr", label: "Mid Career (4-6 years)" },
  { value: "6-10yr", label: "Senior (6-10 years)" },
  { value: "10+yr", label: "Expert (10+ years)" },
];

const FIELD_OPTIONS = [
  "computer_science", "data_science", "mechanical_engineering", "electrical_engineering",
  "business", "biomedical", "civil_engineering", "physics", "chemistry",
  "economics", "design", "other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const [step, setStep] = useState<"detect" | "confirm">("detect");
  const [detectedProfile, setDetectedProfile] = useState<DetectedProfile | null>(null);
  
  // Form state
  const [goal, setGoal] = useState<UserGoal>("undecided");
  const [field, setField] = useState("computer_science");
  const [customField, setCustomField] = useState("");
  const [level, setLevel] = useState<UserLevel>("fresh_grad");
  const [geoPref, setGeoPref] = useState("");
  const [researchInterests, setResearchInterests] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileLoading, setProfileLoading] = useState(isEditMode);

  // On mount, load existing profile in edit mode or detected profile for new users
  useEffect(() => {
    if (isEditMode) {
      // Fetch existing profile to pre-fill
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const p = data.data;
            setGoal(p.goal || "undecided");
            if (FIELD_OPTIONS.includes(p.field)) {
              setField(p.field);
            } else if (p.field) {
              setField("other");
              setCustomField(p.field);
            }
            setLevel(p.level || "fresh_grad");
            if (p.geoPref?.length) setGeoPref(p.geoPref.join(", "));
            if (p.researchInterests?.length) setResearchInterests(p.researchInterests.join(", "));
          }
        })
        .catch(() => {})
        .finally(() => {
          setProfileLoading(false);
          setStep("confirm");
        });
    } else {
      const stored = sessionStorage.getItem("detectedProfile");
      if (stored) {
        try {
          const profile = JSON.parse(stored) as DetectedProfile;
          setDetectedProfile(profile);
          setGoal(profile.goal);
          setField(profile.field || "computer_science");
          setLevel(profile.level);
          if (profile.geoPref?.length) setGeoPref(profile.geoPref.join(", "));
          if (profile.researchInterests?.length) setResearchInterests(profile.researchInterests.join(", "));
          setStep("confirm");
        } catch { /* ignore parse errors */ }
      } else {
        setStep("confirm");
      }
    }
  }, [isEditMode]);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          field: field === "other" ? customField.trim() : field,
          level,
          geoPref: geoPref ? geoPref.split(",").map((s) => s.trim()).filter(Boolean) : [],
          researchInterests: researchInterests ? researchInterests.split(",").map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.removeItem("detectedProfile");
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error?.message || "Failed to save. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="space-y-4">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-4 w-96 rounded" />
          <div className="skeleton h-40 w-full rounded-xl mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-foreground">
        {isEditMode ? "Edit your profile" : detectedProfile ? "We analyzed your CV" : "Tell us about yourself"}
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        {isEditMode
          ? "Update your preferences to get better recommendations."
          : detectedProfile
          ? "Here's what we detected. Confirm or adjust to personalize your experience."
          : "This helps us find the right opportunities for you."}
      </p>

      {/* AI detection banner */}
      {detectedProfile && step === "confirm" && !isEditMode && (
        <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-success font-medium">
            ✨ AI detected: {detectedProfile.field.replace("_", " ")} • {detectedProfile.level.replace("-", " to ")} experience • Looking for {detectedProfile.goal}
          </p>
        </div>
      )}

      {/* Goal Selection */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">What are you looking for?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGoal(opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                goal === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <h3 className="font-semibold text-foreground text-sm mt-1">{opt.label}</h3>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Field Selection */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">Your primary field</h2>
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full p-3 rounded-lg border border-border bg-card text-sm text-foreground"
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f} value={f}>{f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        {field === "other" && (
          <input
            type="text"
            value={customField}
            onChange={(e) => setCustomField(e.target.value)}
            placeholder="Enter your field (e.g. Robotics, Biotechnology, Environmental Science)"
            className="w-full mt-2 p-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground"
          />
        )}
      </div>

      {/* Level Selection */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">Experience level</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLevel(opt.value)}
              className={`p-3 rounded-lg border text-left text-sm transition-all ${
                level === opt.value
                  ? "border-primary bg-primary/5 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Geography (optional) */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">
          Preferred locations <span className="font-normal text-muted-foreground">(optional)</span>
        </h2>
        <input
          type="text"
          value={geoPref}
          onChange={(e) => setGeoPref(e.target.value)}
          placeholder="e.g. USA, Germany, India"
          className="w-full p-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Research Interests (for academic goals) */}
      {(goal === "phd" || goal === "postdoc" || goal === "masters") && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Research interests <span className="font-normal text-muted-foreground">(comma-separated)</span>
          </h2>
          <input
            type="text"
            value={researchInterests}
            onChange={(e) => setResearchInterests(e.target.value)}
            placeholder="e.g. Machine Learning, NLP, Computer Vision"
            className="w-full p-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
      )}

      {error && (
        <div className="mt-6 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-8 w-full px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? "Saving..." : isEditMode ? "Save Changes" : "Continue to Dashboard →"}
      </button>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {isEditMode ? "Changes will be reflected immediately." : "You can change these preferences anytime from your dashboard."}
      </p>
    </div>
  );
}
