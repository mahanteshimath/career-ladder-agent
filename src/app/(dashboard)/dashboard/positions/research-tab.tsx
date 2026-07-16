"use client";

import { useState, useEffect } from "react";
import { resolveApplyLink } from "@/lib/utils/apply-url";

interface CvOption {
  ID: string;
  FILENAME: string;
}

interface ResearchedItem {
  title: string;
  university?: string;
  company?: string;
  country?: string;
  continent?: string;
  location?: string;
  positionType?: string;
  deadline?: string;
  description?: string;
  requirements?: string;
  requiredSkills?: string[];
  professorName?: string;
  sourceUrl?: string;
  experienceLevel?: string;
  salaryRange?: string;
}

const POSITION_TYPES = [
  { value: "PhD", label: "PhD" },
  { value: "Postdoc", label: "Postdoc" },
  { value: "Masters", label: "Masters" },
  { value: "Research Assistant", label: "Research Assistant" },
];

const CONTINENTS = [
  { value: "All", label: "All Regions" },
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "North America", label: "North America" },
  { value: "Australia", label: "Australia/Oceania" },
  { value: "Africa", label: "Africa" },
  { value: "South America", label: "South America" },
];

interface Props {
  targetType: "position" | "job";
  onResultsPersisted?: () => void;
}

export function ResearchTab({ targetType, onResultsPersisted }: Props) {
  const [cvs, setCvs] = useState<CvOption[]>([]);
  const [selectedCv, setSelectedCv] = useState("");
  const [positionType, setPositionType] = useState("PhD");
  const [continent, setContinent] = useState("All");
  const [customInstructions, setCustomInstructions] = useState("");
  const [results, setResults] = useState<ResearchedItem[]>([]);
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{
    available: boolean;
    remaining?: number;
    reason?: string;
  } | null>(null);
  const [meta, setMeta] = useState<{ cached?: boolean; processingTime?: number } | null>(null);

  // Fetch user's CVs
  useEffect(() => {
    async function loadCvs() {
      try {
        const res = await fetch("/api/cv/list");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCvs(data.data);
          if (data.data.length > 0) setSelectedCv(data.data[0].ID);
        }
      } catch {
        // Silently fail
      }
    }
    loadCvs();
  }, []);

  // Check research availability
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/research/status");
        const data = await res.json();
        if (data.success) setStatus(data.data);
      } catch {
        setStatus({ available: false, reason: "Could not check research status." });
      }
    }
    checkStatus();
  }, []);

  async function handleResearch() {
    if (!selectedCv) {
      setError("Please select a CV first.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setCitations([]);
    setMeta(null);

    try {
      const body: Record<string, string> = {
        cvId: selectedCv,
        targetType,
      };
      if (targetType === "position") {
        body.positionType = positionType;
        body.continent = continent;
      }
      if (customInstructions.trim()) {
        body.customInstructions = customInstructions.trim();
      }

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Research failed. Please try again.");
        return;
      }

      const resultData = data.data;
      setMeta(data.meta || null);

      if (targetType === "position" && resultData.positions) {
        setResults(resultData.positions);
      } else if (targetType === "job" && resultData.jobs) {
        setResults(resultData.jobs);
      }

      setCitations(resultData.citations || []);

      // Notify parent that new results were persisted to DB
      if (onResultsPersisted) {
        setTimeout(onResultsPersisted, 2000); // Wait for upsert to complete
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const isPosition = targetType === "position";

  return (
    <div className="mt-6">
      {/* Availability banner */}
      {status && !status.available && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-400">{status.reason}</p>
        </div>
      )}

      {/* Research form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {isPosition ? "🔬 Deep Research: Academic Positions" : "🔬 Deep Research: Job Listings"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Uses AI to search the live web for real, current openings matching your profile.
          {status?.remaining !== undefined && (
            <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
              {status.remaining} research credits remaining
            </span>
          )}
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CV Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Select CV
            </label>
            <select
              value={selectedCv}
              onChange={(e) => setSelectedCv(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
            >
              {cvs.length === 0 && <option value="">No CVs uploaded</option>}
              {cvs.map((cv) => (
                <option key={cv.ID} value={cv.ID}>
                  {cv.FILENAME || "Unnamed CV"}
                </option>
              ))}
            </select>
          </div>

          {/* Position type (academic only) */}
          {isPosition && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Position Type
              </label>
              <select
                value={positionType}
                onChange={(e) => setPositionType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
              >
                {POSITION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Continent (academic only) */}
          {isPosition && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Region
              </label>
              <select
                value={continent}
                onChange={(e) => setContinent(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500"
              >
                {CONTINENTS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom instructions (jobs) */}
          {!isPosition && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Custom Instructions (optional)
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. remote only, in Bangalore, FinTech companies..."
                maxLength={500}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleResearch}
          disabled={loading || !selectedCv || (status !== null && !status.available)}
          className="mt-4 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? "Researching... (up to 90s)" : "🔍 Start AI Research"}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8">
          <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Searching the web for {isPosition ? "academic positions" : "job listings"}...
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Deep research can take 30-90 seconds. Please wait.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Found {results.length} {isPosition ? "positions" : "jobs"}
            </h3>
            {meta && (
              <span className="text-xs text-gray-400">
                {meta.cached ? "From cache" : `${((meta.processingTime || 0) / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {results.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {item.title}
                      </h4>
                      {item.positionType && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 uppercase">
                          {item.positionType}
                        </span>
                      )}
                      {item.experienceLevel && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                          {item.experienceLevel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.university || item.company || ""}
                      {item.location ? ` — ${item.location}` : ""}
                    </p>
                    {item.professorName && (
                      <p className="text-xs text-gray-500 mt-0.5">Prof. {item.professorName}</p>
                    )}
                    {(item.country || item.continent) && (
                      <p className="text-xs text-gray-500 mt-0.5">📍 {item.country || item.continent}</p>
                    )}
                    {item.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.requiredSkills && item.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.requiredSkills.slice(0, 6).map((skill, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.salaryRange && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">💰 {item.salaryRange}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {item.deadline && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">{item.deadline}</span>
                    )}
                    {(() => {
                      const link = resolveApplyLink(item.sourceUrl, item.title, item.university || item.company);
                      return (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {link.isSearch ? (isPosition ? "Search →" : "Search →") : isPosition ? "Apply →" : "View →"}
                        </a>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Citations */}
          {citations.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {citations.slice(0, 8).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px]"
                  >
                    {new URL(url).hostname}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
