"use client";

import { useState } from "react";

interface Scholarship {
  name: string;
  provider: string;
  country: string;
  level: string;
  amount: string;
  eligibility: string;
  deadline: string;
  sourceUrl: string;
}

const LEVELS = ["", "Masters", "PhD", "Postdoc", "Undergraduate"];

export default function ScholarshipsPage() {
  const [level, setLevel] = useState("");
  const [field, setField] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Scholarship[] | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  async function handleSearch() {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("/api/scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: level || undefined, field: field || undefined, country: country || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setResults((data.data.scholarships as Scholarship[]) || []);
        setCitations((data.data.citations as string[]) || []);
      } else {
        setError(data.error?.message || data.error || "Search failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scholarships &amp; Funding</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Discover real, current scholarships matched to your profile via live AI research.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l || "Any level"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Field</label>
            <input
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="e.g., Machine Learning"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Country / Region</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., Germany, Global"
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Searching..." : "Find Scholarships ✨"}
        </button>
        <p className="text-[11px] text-gray-400 mt-2">Uses your most recent uploaded CV to personalize results.</p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
          Researching live scholarships — this can take 30-60 seconds...
        </div>
      )}

      {results && !loading && (
        <div className="mt-6 space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scholarships found. Try broadening your criteria.</p>
          ) : (
            results.map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{s.name}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        {s.amount}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.provider} · {s.country} · {s.level}</p>
                    {s.eligibility && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{s.eligibility}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">⏰ {s.deadline}</span>
                    {s.sourceUrl && (
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        Details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {citations.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Sources</h3>
              <ul className="space-y-1">
                {citations.slice(0, 6).map((c) => (
                  <li key={c}>
                    <a href={c} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                      {c}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/70 pt-2 border-t border-border">
            AI-compiled from public sources. Verify amounts, eligibility, and deadlines on the official site before applying.
          </p>
        </div>
      )}
    </div>
  );
}
