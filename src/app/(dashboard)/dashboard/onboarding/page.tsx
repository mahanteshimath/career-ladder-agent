"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RESEARCH_AREAS = [
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
  "Robotics", "Data Science", "Artificial Intelligence", "Cybersecurity",
  "Cloud Computing", "IoT", "Blockchain", "Quantum Computing",
  "Bioinformatics", "HCI", "Software Engineering", "Networks",
  "Database Systems", "Algorithms", "Distributed Systems", "Signal Processing",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<"student" | "job_seeker" | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleInterest(area: string) {
    setInterests((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleSubmit() {
    if (!persona) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, researchInterests: persona === "student" ? interests : [] }),
      });
      const data = await res.json();
      if (data.success) {
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

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to Career Ladder!</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Tell us about yourself so we can personalize your experience.
      </p>

      {/* Persona Selection */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">I am a...</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setPersona("student")}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              persona === "student"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="text-2xl mb-2">🎓</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Student / Researcher</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Looking for PhD, postdoc, RA positions, or academic opportunities
            </p>
          </button>

          <button
            onClick={() => setPersona("job_seeker")}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              persona === "job_seeker"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="text-2xl mb-2">💼</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Job Seeker / Professional</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Looking for industry jobs, internships, or career transitions
            </p>
          </button>
        </div>
      </div>

      {/* Research Interests (only for students) */}
      {persona === "student" && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Research Interests</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Select areas you&apos;re interested in (helps us find relevant positions)
          </p>
          <div className="flex flex-wrap gap-2">
            {RESEARCH_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => toggleInterest(area)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  interests.includes(area)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
          {interests.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {interests.length} selected
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!persona || loading}
        className="mt-8 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? "Saving..." : "Continue to Dashboard →"}
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        You can change this anytime from your settings.
      </p>
    </div>
  );
}
