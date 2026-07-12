"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { JobCard } from "@/components/JobCard";
import {
  Briefcase,
  Upload,
  ArrowRight,
  Search,
  Loader2,
  FileText,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";

interface MatchItem {
  id: string;
  title: string;
  organization: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  targetType?: "job" | "position";
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

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [cvs, setCvs] = useState<CvItem[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [targetType, setTargetType] = useState<"job" | "position">("job");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [liveJobs, setLiveJobs] = useState<MatchItem[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MatchItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchRes, cvRes] = await Promise.all([
        fetch("/api/matches"),
        fetch("/api/cv/list"),
      ]);
      const matchData = await matchRes.json();
      const cvData = await cvRes.json();

      if (matchData.success) setMatches(matchData.data || []);
      if (cvData.success) {
        const list = cvData.data || [];
        setCvs(list);
      }
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (cvs.length > 0 && !selectedCvId) {
      setSelectedCvId(cvs[0].ID);
    }
  }, [cvs, selectedCvId]);

  const handleGenerate = async () => {
    if (!selectedCvId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: selectedCvId, targetType }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        setError(data.error || "Matching failed. Please try again.");
      }
    } catch {
      setError("Network error during matching.");
    } finally {
      setGenerating(false);
    }
  };

  const findLiveJobs = async () => {
    if (!selectedCvId) return;
    setLiveLoading(true);
    setLiveError(null);
    setLiveJobs([]);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: selectedCvId, targetType }),
      });
      const data = await res.json();
      if (data.success) {
        const raw = (targetType === "job" ? data.data?.jobs : data.data?.positions) || [];
        const items: MatchItem[] = raw.map((j: Record<string, unknown>, i: number) => ({
          id: `live-${targetType}-${i}`,
          title: String(j.title || "Untitled"),
          organization: String(j.company || j.university || ""),
          score: 0,
          matchMethod: "semantic" as const,
          targetType,
          location: (j.location as string) || (j.country as string) || undefined,
          description: (j.description as string) || undefined,
          sourceUrl: (j.sourceUrl as string) || undefined,
          requiredSkills: (j.requiredSkills as string[]) || undefined,
          salaryRange: (j.salaryRange as string) || undefined,
          live: true,
        }));
        setLiveJobs(items);
        if (items.length === 0) {
          setLiveError("No live results found right now. Try again shortly.");
        }
      } else {
        setLiveError(data.error?.message || "Live search is unavailable right now.");
      }
    } catch {
      setLiveError("Network error during live search.");
    } finally {
      setLiveLoading(false);
    }
  };

  const openDetail = (id: string) => {
    const item = [...matches, ...liveJobs].find((m) => m.id === id);
    if (item) setDetailItem(item);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Job Matches</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Matched results based on your CV analysis.
      </p>

      {/* Loading skeleton */}
      {loading && (
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
                <div className="skeleton h-8 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mt-6 p-3 rounded-lg text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* State: No CVs uploaded */}
      {!loading && cvs.length === 0 && (
        <div className="mt-8 text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Briefcase size={24} className="text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">No CVs uploaded yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Upload your CV first and we&apos;ll match you with relevant job openings
            based on your skills and experience.
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

      {/* State: CVs exist — show generate controls + matches */}
      {!loading && cvs.length > 0 && (() => {
        // Only show matches for the currently selected type so academic
        // positions and industry jobs are never mixed together.
        const visibleMatches = matches.filter(
          (m) => !m.targetType || m.targetType === targetType
        );
        return (
        <>
          {/* Generate matches panel */}
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Search size={15} className="text-primary" />
              Generate Matches
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* CV selector */}
              <div className="flex-1">
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
              </div>

              {/* Target type */}
              <div className="sm:w-44">
                <label className="text-xs text-muted-foreground mb-1 block">Match Against</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as "job" | "position")}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="job">Industry Jobs</option>
                  <option value="position">Academic Positions</option>
                </select>
              </div>

              {/* Generate button */}
              <div className="sm:self-end">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedCvId}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Matching...
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      Find Matches
                    </>
                  )}
                </button>
              </div>

              {/* Live web search button */}
              <div className="sm:self-end">
                <button
                  onClick={findLiveJobs}
                  disabled={liveLoading || !selectedCvId}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 border border-primary text-primary text-sm font-medium rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {liveLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Searching web...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Find Live {targetType === "job" ? "Jobs" : "Positions"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {generating && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Searching {targetType === "job" ? "jobs" : "academic positions"} for matches — this may take a moment...
              </div>
            )}
          </div>

          {/* Match results */}
          {visibleMatches.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {visibleMatches.length}{" "}
                  {targetType === "job" ? "Industry" : "Academic"} Match
                  {visibleMatches.length !== 1 ? "es" : ""} Found
                </h3>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={12} />
                  Refresh
                </button>
              </div>
              <div className="grid gap-4">
                {visibleMatches.map((match) => (
                  <JobCard
                    key={match.id}
                    match={match}
                    userTier="premium"
                    onViewDetails={openDetail}
                    onGenerateSop={() => router.push("/dashboard/generate")}
                  />
                ))}
              </div>
            </div>
          ) : (
            !generating && (
              <div className="mt-6 text-center py-10 bg-card border border-border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Search size={18} className="text-muted-foreground" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  No matches generated yet
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Select a CV above and click &quot;Find Matches&quot; to discover relevant
                  opportunities.
                </p>
              </div>
            )
          )}

          {/* Live web results */}
          {(liveLoading || liveError || liveJobs.length > 0) && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Live Results {liveJobs.length > 0 ? `(${liveJobs.length})` : ""}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  fresh from the web
                </span>
              </div>
              {liveLoading && (
                <div className="text-xs text-muted-foreground flex items-center gap-2 py-4">
                  <Loader2 size={14} className="animate-spin" />
                  Searching the live web for {targetType === "job" ? "jobs" : "positions"} matching your CV — this can take up to a minute...
                </div>
              )}
              {liveError && !liveLoading && (
                <div className="p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {liveError}
                </div>
              )}
              {liveJobs.length > 0 && !liveLoading && (
                <div className="grid gap-4">
                  {liveJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      match={job}
                      userTier="premium"
                      onViewDetails={openDetail}
                      onGenerateSop={() => router.push("/dashboard/generate")}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
        );
      })()}

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
              {!detailItem.live && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    Match: {Math.round(detailItem.score * 100)}%
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    {detailItem.matchMethod}
                  </span>
                </div>
              )}
              {detailItem.description && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
                  <p className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">{detailItem.description}</p>
                </div>
              )}
              {detailItem.requiredSkills && detailItem.requiredSkills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required Skills</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {detailItem.requiredSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-xs rounded-full bg-muted text-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {detailItem.salaryRange && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salary</h3>
                  <p className="mt-1 text-foreground">{detailItem.salaryRange}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-border">
              <button
                onClick={() => { setDetailItem(null); router.push("/dashboard/generate"); }}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                Generate SOP
              </button>
              {detailItem.sourceUrl && (
                <a
                  href={detailItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                >
                  Apply ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
