"use client";

import { useEffect, useState } from "react";
import { JobCard } from "@/components/JobCard";
import {
  Briefcase,
  Upload,
  ArrowRight,
  Loader2,
  FileText,
  Sparkles,
  MapPin,
  X,
  Check,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

interface JobItem {
  id: string;
  title: string;
  organization: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  location?: string;
  description?: string;
  sourceUrl?: string;
  requiredSkills?: string[];
  salaryRange?: string;
  live?: boolean;
}

interface CvItem {
  ID: string;
  FILENAME: string;
  UPLOADED_AT: string;
}

const MAX_INFO = 500;

export default function MatchesPage() {
  const [cvs, setCvs] = useState<CvItem[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [cvLoading, setCvLoading] = useState(true);
  const [liveJobs, setLiveJobs] = useState<JobItem[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [detailItem, setDetailItem] = useState<JobItem | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cv/list");
        const data = await res.json();
        if (data.success) {
          const list: CvItem[] = data.data || [];
          setCvs(list);
          if (list.length > 0) setSelectedCvId(list[0].ID);
        }
      } catch {
        // ignore — empty state handles no CVs
      } finally {
        setCvLoading(false);
      }
    })();
  }, []);

  const findLiveJobs = async () => {
    if (!selectedCvId) return;
    setLiveLoading(true);
    setLiveError(null);
    setLiveJobs([]);
    setSearched(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvId: selectedCvId,
          targetType: "job",
          customInstructions: extraInfo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const raw: Record<string, unknown>[] = data.data?.jobs || [];
        const items: JobItem[] = raw.map((j, i) => ({
          id: `live-job-${i}`,
          title: String(j.title || "Untitled"),
          organization: String(j.company || ""),
          score: 0,
          matchMethod: "semantic",
          location: (j.location as string) || undefined,
          description: (j.description as string) || undefined,
          sourceUrl: (j.sourceUrl as string) || undefined,
          requiredSkills: (j.requiredSkills as string[]) || undefined,
          salaryRange: (j.salaryRange as string) || undefined,
          live: true,
        }));
        setLiveJobs(items);
        if (items.length === 0) {
          setLiveError(
            "No live jobs found. Try adding your location or broadening your preferences above."
          );
        }
      } else {
        setLiveError(data.error?.message || "Live job search is unavailable right now.");
      }
    } catch {
      setLiveError("Network error during live search. Please try again.");
    } finally {
      setLiveLoading(false);
    }
  };

  const openDetail = (id: string) => {
    const item = liveJobs.find((m) => m.id === id);
    if (item) setDetailItem(item);
  };

  const saveToTracker = async (job: JobItem) => {
    if (savedIds.has(job.id) || savingId) return;
    setSavingId(job.id);
    try {
      const res = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journey: "job",
          title: job.title,
          organization: job.organization || undefined,
          location: job.location || undefined,
          url: job.sourceUrl || undefined,
          sourceType: "job",
          metadata: {
            salaryRange: job.salaryRange,
            requiredSkills: job.requiredSkills,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedIds((prev) => new Set(prev).add(job.id));
      }
    } catch {
      /* silently ignore — user can retry */
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Job Matches</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Find real, currently-open jobs matched to your CV — tailored to your location and preferences.
      </p>

      {/* Loading CVs */}
      {cvLoading && (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                  <div className="skeleton h-3 w-64 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No CVs uploaded */}
      {!cvLoading && cvs.length === 0 && (
        <div className="mt-8 text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Briefcase size={24} className="text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">No CVs uploaded yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Upload your CV first and we&apos;ll find real, open jobs matched to your skills,
            experience, and location.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Upload size={16} />
            Upload CV
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Search panel */}
      {!cvLoading && cvs.length > 0 && (
        <>
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              Find Live Jobs
            </h3>

            {/* CV selector */}
            <label className="text-xs text-muted-foreground mb-1 block">Select CV</label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select
                value={selectedCvId}
                onChange={(e) => setSelectedCvId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {cvs.map((cv) => (
                  <option key={cv.ID} value={cv.ID}>
                    {cv.FILENAME} — {new Date(cv.UPLOADED_AT).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Location & preferences */}
            <div className="mt-4">
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin size={12} />
                Location &amp; preferences{" "}
                <span className="text-muted-foreground/60">(recommended)</span>
              </label>
              <textarea
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value.slice(0, MAX_INFO))}
                rows={3}
                placeholder="e.g., Preferred location (Bengaluru / remote), years of experience, target companies, expected salary, notice period, visa status — or anything relevant that isn't in your CV."
                className="w-full border border-border bg-background rounded-lg py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-muted-foreground/70">
                  Adding your location and preferences helps us find jobs where you actually want to work.
                </p>
                <span className="text-[11px] text-muted-foreground/60">
                  {extraInfo.length}/{MAX_INFO}
                </span>
              </div>
            </div>

            {/* Search button */}
            <button
              onClick={findLiveJobs}
              disabled={liveLoading || !selectedCvId}
              className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {liveLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Searching live jobs...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Find Live Jobs
                </>
              )}
            </button>
          </div>

          {/* Loading */}
          {liveLoading && (
            <div className="mt-6 text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center bg-card border border-border rounded-xl">
              <Loader2 size={16} className="animate-spin" />
              Searching the live web for jobs matching your CV and preferences — this can take up to a minute...
            </div>
          )}

          {/* Error / empty result */}
          {liveError && !liveLoading && (
            <div className="mt-6 p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {liveError}
            </div>
          )}

          {/* Results */}
          {liveJobs.length > 0 && !liveLoading && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {liveJobs.length} Live Job{liveJobs.length !== 1 ? "s" : ""} Found
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  fresh from the web
                </span>
              </div>
              <div className="grid gap-4">
                {liveJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    match={job}
                    userTier="premium"
                    onViewDetails={openDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Before first search */}
          {!searched && !liveLoading && (
            <div className="mt-6 text-center py-10 bg-card border border-border rounded-xl">
              <div className="w-10 h-10 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Sparkles size={18} className="text-muted-foreground" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                Ready to find your next role
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Add your location &amp; preferences above, then click &quot;Find Live Jobs&quot; to
                search real, currently-open positions.
              </p>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">{detailItem.title}</h2>
                <p className="text-sm text-muted-foreground">{detailItem.organization}</p>
                {detailItem.location && (
                  <p className="text-xs text-muted-foreground mt-0.5">📍 {detailItem.location}</p>
                )}
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {detailItem.description && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </h3>
                  <p className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">
                    {detailItem.description}
                  </p>
                </div>
              )}
              {detailItem.requiredSkills && detailItem.requiredSkills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Required Skills
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {detailItem.requiredSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-xs rounded-full bg-muted text-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detailItem.salaryRange && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Salary
                  </h3>
                  <p className="mt-1 text-foreground">{detailItem.salaryRange}</p>
                </div>
              )}
              {!detailItem.description &&
                !detailItem.requiredSkills?.length &&
                !detailItem.salaryRange && (
                  <p className="text-muted-foreground">Open the job posting for full details.</p>
                )}
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-border">
              {detailItem.sourceUrl ? (
                <a
                  href={detailItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Apply ↗
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">No application link provided.</span>
              )}
              <button
                onClick={() => saveToTracker(detailItem)}
                disabled={savedIds.has(detailItem.id) || savingId === detailItem.id}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-default"
              >
                {savingId === detailItem.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : savedIds.has(detailItem.id) ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <LayoutGrid size={14} />
                )}
                {savedIds.has(detailItem.id) ? "Saved to Tracker" : "Save to Tracker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
