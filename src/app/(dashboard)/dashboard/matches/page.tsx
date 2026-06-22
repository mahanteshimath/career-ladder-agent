"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import Link from "next/link";

interface MatchItem {
  id: string;
  title: string;
  organization: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  location?: string;
  description?: string;
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
        if (list.length > 0 && !selectedCvId) {
          setSelectedCvId(list[0].ID);
        }
      }
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [selectedCvId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      {!loading && cvs.length > 0 && (
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
            </div>

            {generating && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Searching {targetType === "job" ? "jobs" : "academic positions"} for matches — this may take a moment...
              </div>
            )}
          </div>

          {/* Match results */}
          {matches.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {matches.length} Match{matches.length !== 1 ? "es" : ""} Found
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
                {matches.map((match) => (
                  <JobCard
                    key={match.id}
                    match={match}
                    userTier="premium"
                    onViewDetails={(id) => console.log("View", id)}
                    onGenerateSop={(id) => console.log("SOP", id)}
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
        </>
      )}
    </div>
  );
}
