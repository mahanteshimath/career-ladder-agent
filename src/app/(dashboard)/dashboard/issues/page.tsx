"use client";

import { useEffect, useState } from "react";

interface Issue {
  ID: string;
  CATEGORY: string;
  DESCRIPTION: string;
  STATUS: string;
  CREATED_AT: string;
}

const categories = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "content", label: "Content Issue" },
  { value: "other", label: "Other" },
];

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      const res = await fetch("/api/issues");
      const data = await res.json();
      if (data.success) {
        setIssues(data.data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.length < 20) {
      setError("Description must be at least 20 characters");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setDescription("");
        setCategory("bug");
        loadIssues();
      } else {
        setError(data.error?.message || "Failed to submit");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report an Issue</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Help us improve by reporting bugs, requesting features, or flagging content issues.
      </p>

      {/* Submit Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail (minimum 20 characters)..."
              rows={5}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description.length}/20 characters minimum
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
            Issue reported successfully! We&apos;ll look into it.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || description.length < 20}
          className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? "Submitting..." : "Submit Issue"}
        </button>
      </form>

      {/* Issues History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Reported Issues</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No issues reported yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.ID}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {issue.CATEGORY}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[issue.STATUS] || statusColors.open}`}>
                      {issue.STATUS.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(issue.CREATED_AT).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {issue.DESCRIPTION}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
