"use client";

import { useState } from "react";

interface DocumentAudit {
  specificityScore: number;
  bannedPhrases: string[];
  placeholders: string[];
  withinTargetLength: boolean;
  suggestions: string[];
}

export default function LorPage() {
  const [form, setForm] = useState({
    recommenderName: "",
    recommenderTitle: "",
    relationship: "",
    duration: "",
    targetContext: "",
    strengths: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [audit, setAudit] = useState<DocumentAudit | null>(null);
  const [copied, setCopied] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleGenerate() {
    if (form.targetContext.trim().length < 3) {
      setError("Please enter the target program or role.");
      return;
    }
    setLoading(true);
    setError("");
    setContent("");
    setAudit(null);
    try {
      const res = await fetch("/api/lor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommenderName: form.recommenderName || undefined,
          recommenderTitle: form.recommenderTitle || undefined,
          relationship: form.relationship || undefined,
          duration: form.duration || undefined,
          strengths: form.strengths || undefined,
          targetContext: form.targetContext,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContent(data.data.content);
        setAudit(data.data.audit ?? null);
      } else {
        setError(data.error?.message || data.error || "Could not draft the letter.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Letter of Recommendation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Draft a recommendation letter for a professor or manager to review and sign. Based on your uploaded CV.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Recommender name (optional)" value={form.recommenderName} onChange={(v) => set("recommenderName", v)} placeholder="e.g., Dr. R. Sharma" />
          <Field label="Recommender title (optional)" value={form.recommenderTitle} onChange={(v) => set("recommenderTitle", v)} placeholder="e.g., Professor, IIT Delhi" />
          <Field label="Relationship (optional)" value={form.relationship} onChange={(v) => set("relationship", v)} placeholder="e.g., Thesis advisor, manager" />
          <Field label="Known for (optional)" value={form.duration} onChange={(v) => set("duration", v)} placeholder="e.g., 3 years" />
        </div>
        <TextArea label="Target program or role" value={form.targetContext} onChange={(v) => set("targetContext", v)} placeholder="e.g., PhD in Computer Science at ETH Zurich" />
        <TextArea label="Strengths to emphasize (optional)" value={form.strengths} onChange={(v) => set("strengths", v)} placeholder="e.g., research independence, strong publications, leadership" />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Drafting..." : "Draft Letter ✨"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
          Drafting the letter — this can take up to a minute...
        </div>
      )}

      {content && !loading && (
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Draft Letter</h2>
            <button
              onClick={copy}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 max-h-[55vh] overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200">{content}</div>
          </div>

          {audit && (
            <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quality Self-Audit</span>
                <span className={`text-sm font-bold ${audit.specificityScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : audit.specificityScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {audit.specificityScore}/100
                </span>
              </div>
              {audit.suggestions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {audit.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-gray-400">•</span><span>{s}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ A recommendation must reflect the recommender&apos;s genuine view. Share this draft with your recommender to review, edit, and approve before submission.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
      />
    </div>
  );
}
