"use client";

import { useEffect, useState } from "react";

interface InterviewQuestion {
  question: string;
  category: string;
  suggestedPoints: string[];
}
interface InterviewPrep {
  questions: InterviewQuestion[];
  tips: string[];
}

const CATEGORY_TONE: Record<string, string> = {
  behavioral: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  technical: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
  motivation: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  research: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  "role-specific": "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
};

export default function InterviewPage() {
  const [journey, setJourney] = useState<"job" | "academic">("job");
  const [targetContext, setTargetContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [drafts, setDrafts] = useState<{ id: string; type: string; createdAt?: string }[]>([]);
  const [draftId, setDraftId] = useState("");

  useEffect(() => {
    fetch("/api/drafts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setDrafts(
            d.data
              .filter((x: { type: string }) => x.type === "sop" || x.type === "cover_letter")
              .map((x: { id: string; type: string; createdAt?: string }) => ({
                id: x.id,
                type: x.type,
                createdAt: x.createdAt,
              }))
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setPrep(null);
    setRevealed(new Set());
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journey, targetContext: targetContext || undefined, draftId: draftId || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setPrep(data.data as InterviewPrep);
      } else {
        setError(data.error?.message || data.error || "Could not generate interview prep.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Interview Prep</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Practice tailored questions with suggested talking points grounded in your CV.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex gap-2 mb-4">
          {(["job", "academic"] as const).map((j) => (
            <button
              key={j}
              onClick={() => setJourney(j)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                journey === j
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {j === "job" ? "Job interview" : "Academic / research"}
            </button>
          ))}
        </div>
        {drafts.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ground in a saved application (optional)
            </label>
            <select
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">— None (use CV + target below) —</option>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.type === "sop" ? "SOP" : "Cover letter"}
                  {d.createdAt ? ` — ${new Date(String(d.createdAt)).toLocaleDateString()}` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Tailors questions to the exact posting and the document you submitted.
            </p>
          </div>
        )}
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Target role or program (optional)
        </label>
        <textarea
          value={targetContext}
          onChange={(e) => setTargetContext(e.target.value)}
          rows={3}
          placeholder={journey === "job" ? "e.g., Senior Data Scientist at a fintech; focus on ML deployment" : "e.g., PhD in NLP at TU Munich with Prof. X on multilingual models"}
          className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Preparing..." : "Generate Questions ✨"}
        </button>
        <p className="text-[11px] text-gray-400 mt-2">Uses your most recent uploaded CV.</p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
          Generating tailored questions — this can take up to a minute...
        </div>
      )}

      {prep && !loading && (
        <div className="mt-6 space-y-4">
          {prep.tips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Preparation tips</h3>
              <ul className="space-y-1.5">
                {prep.tips.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="text-blue-500">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-6">
            {(() => {
              const ORDER = ["research", "behavioral", "technical", "motivation", "role-specific"];
              const LABELS: Record<string, string> = {
                research: "Research",
                behavioral: "Behavioral",
                technical: "Technical",
                motivation: "Motivation",
                "role-specific": "Role-specific",
                other: "Other",
              };
              // Keep each question's original index so the reveal toggle stays stable.
              const groups = new Map<string, { q: InterviewQuestion; i: number }[]>();
              prep.questions.forEach((q, i) => {
                const key = ORDER.includes(q.category) ? q.category : "other";
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push({ q, i });
              });
              const keys = [...ORDER, "other"].filter((k) => groups.has(k));
              return keys.map((key) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{LABELS[key]}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${CATEGORY_TONE[key] || "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                      {groups.get(key)!.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {groups.get(key)!.map(({ q, i }) => (
                      <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          <span className="text-gray-400 mr-2">{i + 1}.</span>{q.question}
                        </p>
                        {q.suggestedPoints.length > 0 && (
                          <>
                            <button
                              onClick={() => toggle(i)}
                              className="mt-2 text-xs text-blue-600 hover:underline"
                            >
                              {revealed.has(i) ? "Hide talking points" : "Show talking points"}
                            </button>
                            {revealed.has(i) && (
                              <ul className="mt-2 space-y-1 pl-1">
                                {q.suggestedPoints.map((p, j) => (
                                  <li key={j} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                    <span className="text-gray-400">•</span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          <p className="text-[11px] text-muted-foreground/70 pt-2 border-t border-border">
            AI-generated for practice. Adapt answers to your authentic experience.
          </p>
        </div>
      )}
    </div>
  );
}
