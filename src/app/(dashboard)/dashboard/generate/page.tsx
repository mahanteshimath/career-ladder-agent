"use client";

import { useEffect, useState } from "react";

interface CvOption {
  ID: string;
  FILENAME: string;
  UPLOADED_AT: string;
}

type StepId = "select-cv" | "select-type" | "questionnaire" | "generating" | "result";
type DocType = "sop" | "cover_letter";

interface DocumentAudit {
  specificityScore: number;
  bannedPhrases: string[];
  placeholders: string[];
  withinTargetLength: boolean;
  suggestions: string[];
}

interface SopAnswers {
  targetProgram: string;
  university: string;
  whyThisProgram: string;
  researchInterests: string;
  longTermGoals: string;
  additionalDetails: string;
}

interface CoverLetterAnswers {
  jobTitle: string;
  companyName: string;
  whyThisCompany: string;
  keyAchievements: string;
  additionalNotes: string;
}

export default function GeneratePage() {
  const [step, setStep] = useState<StepId>("select-cv");
  const [cvs, setCvs] = useState<CvOption[]>([]);
  const [selectedCv, setSelectedCv] = useState("");
  const [docType, setDocType] = useState<DocType>("sop");
  const [sopAnswers, setSopAnswers] = useState<SopAnswers>({
    targetProgram: "",
    university: "",
    whyThisProgram: "",
    researchInterests: "",
    longTermGoals: "",
    additionalDetails: "",
  });
  const [coverLetterAnswers, setCoverLetterAnswers] = useState<CoverLetterAnswers>({
    jobTitle: "",
    companyName: "",
    whyThisCompany: "",
    keyAchievements: "",
    additionalNotes: "",
  });
  const [result, setResult] = useState("");
  const [audit, setAudit] = useState<DocumentAudit | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCvs() {
      try {
        const res = await fetch("/api/cv/list");
        const data = await res.json();
        if (data.success) setCvs(data.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadCvs();
  }, []);

  function buildTargetContext(): string {
    if (docType === "sop") {
      return [
        `Target Program: ${sopAnswers.targetProgram}`,
        `University: ${sopAnswers.university}`,
        `Why this program: ${sopAnswers.whyThisProgram}`,
        `Research Interests: ${sopAnswers.researchInterests}`,
        `Long-term Goals: ${sopAnswers.longTermGoals}`,
        sopAnswers.additionalDetails
          ? `Additional Details: ${sopAnswers.additionalDetails}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else {
      return [
        `Job Title: ${coverLetterAnswers.jobTitle}`,
        `Company: ${coverLetterAnswers.companyName}`,
        `Why this company: ${coverLetterAnswers.whyThisCompany}`,
        `Key Achievements to Highlight: ${coverLetterAnswers.keyAchievements}`,
        `Additional Notes: ${coverLetterAnswers.additionalNotes}`,
      ].join("\n\n");
    }
  }

  async function handleGenerate() {
    setStep("generating");
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvId: selectedCv,
          type: docType,
          targetContext: buildTargetContext(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data.content);
        setAudit(data.data.audit ?? null);
        setStep("result");
      } else {
        setError(data.error || "Generation failed");
        setStep("questionnaire");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("questionnaire");
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(result);
  }

  function downloadAsText() {
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType === "sop" ? "SOP" : "Cover_Letter"}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── STEP RENDERS ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generate Document</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Create a personalized SOP or Cover Letter powered by AI.
      </p>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mt-6 mb-8">
        {(["select-cv", "select-type", "questionnaire", "result"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s || (step === "generating" && s === "questionnaire")
                ? "bg-blue-600 text-white"
                : i < ["select-cv", "select-type", "questionnaire", "result"].indexOf(step === "generating" ? "questionnaire" : step)
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select CV */}
      {step === "select-cv" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Your CV</h2>
          {cvs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">No CVs uploaded yet.</p>
              <a href="/dashboard/upload" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                Upload a CV first →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {cvs.map((cv) => (
                <label
                  key={cv.ID}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedCv === cv.ID
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="cv"
                    value={cv.ID}
                    checked={selectedCv === cv.ID}
                    onChange={() => setSelectedCv(cv.ID)}
                    className="accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cv.FILENAME}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Uploaded {new Date(cv.UPLOADED_AT).toLocaleDateString()}
                    </p>
                  </div>
                </label>
              ))}
              <button
                onClick={() => setStep("select-type")}
                disabled={!selectedCv}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Type */}
      {step === "select-type" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">What would you like to generate?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setDocType("sop"); setStep("questionnaire"); }}
              className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-left transition-colors"
            >
              <svg className="w-8 h-8 text-blue-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Statement of Purpose</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">For academic programs & research positions</p>
            </button>
            <button
              onClick={() => { setDocType("cover_letter"); setStep("questionnaire"); }}
              className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-left transition-colors"
            >
              <svg className="w-8 h-8 text-blue-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cover Letter</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">For industry jobs & applications</p>
            </button>
          </div>
          <button
            onClick={() => setStep("select-cv")}
            className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Questionnaire */}
      {step === "questionnaire" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {docType === "sop" ? "SOP Details" : "Cover Letter Details"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            The more detail you provide, the better the AI output will be.
          </p>

          {docType === "sop" ? (
            <div className="space-y-4">
              <Field
                label="Target Program / Position"
                placeholder="e.g., PhD in Machine Learning, Research Assistant in NLP"
                value={sopAnswers.targetProgram}
                onChange={(v) => setSopAnswers({ ...sopAnswers, targetProgram: v })}
              />
              <Field
                label="University / Institution"
                placeholder="e.g., ETH Zurich, MIT, IIT Bombay"
                value={sopAnswers.university}
                onChange={(v) => setSopAnswers({ ...sopAnswers, university: v })}
              />
              <TextArea
                label="Why this program/position?"
                placeholder="What attracts you to this specific program? Mention faculty, research areas, resources..."
                value={sopAnswers.whyThisProgram}
                onChange={(v) => setSopAnswers({ ...sopAnswers, whyThisProgram: v })}
              />
              <TextArea
                label="Research Interests"
                placeholder="Describe your research interests and how they align with this program..."
                value={sopAnswers.researchInterests}
                onChange={(v) => setSopAnswers({ ...sopAnswers, researchInterests: v })}
              />
              <TextArea
                label="Long-term Career Goals"
                placeholder="Where do you see yourself in 5-10 years? How does this program help?"
                value={sopAnswers.longTermGoals}
                onChange={(v) => setSopAnswers({ ...sopAnswers, longTermGoals: v })}
              />
              <TextArea
                label="Additional Details (optional)"
                placeholder="Anything relevant we didn't ask: specific professors to mention, publications, personal circumstances, tone preference..."
                value={sopAnswers.additionalDetails}
                onChange={(v) => setSopAnswers({ ...sopAnswers, additionalDetails: v })}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Field
                label="Job Title"
                placeholder="e.g., Senior Software Engineer, Data Scientist"
                value={coverLetterAnswers.jobTitle}
                onChange={(v) => setCoverLetterAnswers({ ...coverLetterAnswers, jobTitle: v })}
              />
              <Field
                label="Company Name"
                placeholder="e.g., Google, 3M, Infosys"
                value={coverLetterAnswers.companyName}
                onChange={(v) => setCoverLetterAnswers({ ...coverLetterAnswers, companyName: v })}
              />
              <TextArea
                label="Why this company?"
                placeholder="What excites you about this company? Culture, projects, mission..."
                value={coverLetterAnswers.whyThisCompany}
                onChange={(v) => setCoverLetterAnswers({ ...coverLetterAnswers, whyThisCompany: v })}
              />
              <TextArea
                label="Key Achievements to Highlight"
                placeholder="List 2-3 specific achievements from your experience that match this role..."
                value={coverLetterAnswers.keyAchievements}
                onChange={(v) => setCoverLetterAnswers({ ...coverLetterAnswers, keyAchievements: v })}
              />
              <TextArea
                label="Additional Notes (optional)"
                placeholder="Any other context: specific skills to mention, tone preference, etc."
                value={coverLetterAnswers.additionalNotes}
                onChange={(v) => setCoverLetterAnswers({ ...coverLetterAnswers, additionalNotes: v })}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Generate with AI ✨
            </button>
            <button
              onClick={() => setStep("select-type")}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3.5: Generating */}
      {step === "generating" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generating your {docType === "sop" ? "SOP" : "Cover Letter"}...</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take 30-60 seconds. AI is crafting your document.</p>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "result" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your {docType === "sop" ? "Statement of Purpose" : "Cover Letter"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={downloadAsText}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Download
              </button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 max-h-[60vh] overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {result}
            </div>
          </div>

          {audit && <QualityPanel audit={audit} />}

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ Please review and verify all information before submitting. AI may occasionally add inaccurate details.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => { setStep("questionnaire"); setResult(""); setAudit(null); }}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Regenerate
            </button>
            <a
              href="/dashboard/drafts"
              className="text-sm text-blue-600 hover:underline"
            >
              View all drafts →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUALITY AUDIT PANEL ────────────────────────────────────────

function QualityPanel({ audit }: { audit: DocumentAudit }) {
  const { specificityScore, bannedPhrases, placeholders, withinTargetLength, suggestions } = audit;
  const tone =
    specificityScore >= 80
      ? { ring: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", label: "Strong" }
      : specificityScore >= 60
        ? { ring: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", label: "Needs polish" }
        : { ring: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", label: "Weak" };

  return (
    <div className={`mt-4 p-4 rounded-lg border ${tone.bg} ${tone.border}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quality Self-Audit</h3>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${tone.ring}`}>{specificityScore}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/100 · {tone.label}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={`px-2 py-1 rounded-md border ${bannedPhrases.length === 0 ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-rose-300 text-rose-700 dark:text-rose-400"}`}>
          {bannedPhrases.length === 0 ? "✓ No generic phrases" : `${bannedPhrases.length} generic phrase${bannedPhrases.length > 1 ? "s" : ""}`}
        </span>
        <span className={`px-2 py-1 rounded-md border ${placeholders.length === 0 ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-rose-300 text-rose-700 dark:text-rose-400"}`}>
          {placeholders.length === 0 ? "✓ No placeholders" : `${placeholders.length} placeholder${placeholders.length > 1 ? "s" : ""}`}
        </span>
        <span className={`px-2 py-1 rounded-md border ${withinTargetLength ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-amber-300 text-amber-700 dark:text-amber-400"}`}>
          {withinTargetLength ? "✓ Ideal length" : "Length off-target"}
        </span>
      </div>

      {suggestions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-2">
              <span className="text-gray-400">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── FORM COMPONENTS ────────────────────────────────────────────

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      />
    </div>
  );
}

function TextArea({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
      />
    </div>
  );
}
