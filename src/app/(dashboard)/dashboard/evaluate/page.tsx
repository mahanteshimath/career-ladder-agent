"use client";

import { useState } from "react";

interface EvalBlock {
  title: string;
  content: Record<string, unknown>;
}

interface EvalResult {
  overallScore: number;
  recommendation: string;
  blocks: EvalBlock[];
}

const SCORE_COLORS: Record<string, string> = {
  strong_match: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  good_match: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  weak_match: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  skip: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const SCORE_LABELS: Record<string, string> = {
  strong_match: "Strong Match",
  good_match: "Good Match",
  weak_match: "Weak Match",
  skip: "Not Recommended",
};

export default function EvaluatePage() {
  const [inputContent, setInputContent] = useState("");
  const [inputType, setInputType] = useState<"text" | "url">("text");
  const [targetType, setTargetType] = useState<"job" | "masters" | "phd" | "postdoc">("job");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState("");

  async function handleEvaluate() {
    if (!inputContent.trim() || inputContent.trim().length < 20) {
      setError("Please provide at least 20 characters to evaluate.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputContent: inputContent.trim(), inputType, targetType }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data as EvalResult);
      } else {
        setError(data.error?.message || "Evaluation failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Evaluate</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Paste a job posting or program description — get an instant fit report.
      </p>

      {/* Input Form */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Target Type */}
        <div className="flex gap-2 mb-4">
          {(["job", "masters", "phd", "postdoc"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTargetType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                targetType === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {t === "job" ? "Job" : t === "masters" ? "Masters" : t === "phd" ? "PhD" : "Postdoc"}
            </button>
          ))}
        </div>

        {/* Input Type Toggle */}
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="inputType"
              checked={inputType === "text"}
              onChange={() => setInputType("text")}
              className="accent-blue-600"
            />
            Paste text
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="inputType"
              checked={inputType === "url"}
              onChange={() => setInputType("url")}
              className="accent-blue-600"
            />
            Provide URL
          </label>
        </div>

        {/* Input Area */}
        {inputType === "text" ? (
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Paste the full job/program description here..."
            rows={8}
            className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-y"
          />
        ) : (
          <input
            type="url"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="https://example.com/job-posting"
            className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          onClick={handleEvaluate}
          disabled={loading || !inputContent.trim()}
          className="mt-4 w-full px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Analyzing..." : "Evaluate Fit →"}
        </button>

        {loading && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center animate-pulse">
            Running AI analysis — this may take up to 30 seconds...
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
          {/* Overall Score Banner */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Evaluation Result</h2>
              <span className={`mt-1 inline-flex px-3 py-1 rounded-full text-sm font-semibold ${SCORE_COLORS[result.recommendation] || SCORE_COLORS.weak_match}`}>
                {SCORE_LABELS[result.recommendation] || result.recommendation}
              </span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(result.overallScore * 100)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Overall Fit</p>
            </div>
          </div>

          {/* Report Blocks */}
          {result.blocks.map((block, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{block.title}</h3>
              <div className="space-y-2">
                {Object.entries(block.content).map(([key, value]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[140px] capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {Array.isArray(value) ? (
                        <span className="flex flex-wrap gap-1.5">
                          {value.map((v, i) => (
                            <span
                              key={i}
                              className="inline-flex px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs"
                            >
                              {String(v)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action */}
          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); setInputContent(""); }}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Evaluate Another
            </button>
            <a
              href="/dashboard/generate"
              className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Generate Application Docs →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
