"use client";

import type { TierName } from "@/types";

interface MatchResult {
  id: string;
  title: string;
  organization: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  location?: string;
  description?: string;
  sourceUrl?: string;
  live?: boolean;
  verified?: boolean;
}

interface JobCardProps {
  match: MatchResult;
  userTier: TierName;
  onViewDetails?: (id: string) => void;
  onGenerateSop?: (id: string) => void;
  onSave?: () => void;
  saved?: boolean;
  saving?: boolean;
}

export function JobCard({ match, userTier, onViewDetails, onGenerateSop, onSave, saved, saving }: JobCardProps) {
  const scoreColor =
    match.score >= 0.8
      ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
      : match.score >= 0.6
        ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30"
        : "text-muted-foreground bg-muted";

  const methodBadge = {
    keyword: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    semantic: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
    hybrid: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-shadow card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{match.title}</h3>
          <p className="text-sm text-muted-foreground">{match.organization}</p>
          {match.location && (
            <p className="text-xs text-muted-foreground mt-1">{match.location}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          {match.live ? (
            <>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                Live
              </span>
              {match.verified && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300">
                  ✓ Verified link
                </span>
              )}
            </>
          ) : (
            <>
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${scoreColor}`}>
                {Math.round(match.score * 100)}%
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${methodBadge[match.matchMethod]}`}
              >
                {match.matchMethod}
              </span>
            </>
          )}
        </div>
      </div>

      {match.description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {match.description}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onViewDetails?.(match.id)}
          className="text-sm px-3 py-1 border border-border rounded hover:bg-muted transition-colors text-foreground"
        >
          View Details
        </button>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saved || saving}
            className={`text-sm px-3 py-1 rounded border transition-colors disabled:opacity-70 ${
              saved
                ? "border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 cursor-default"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {saved ? "✓ Saved" : saving ? "Saving..." : "Save"}
          </button>
        )}
        {onGenerateSop && (
          <button
            onClick={() => onGenerateSop(match.id)}
            className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary-hover transition-colors"
          >
            Generate SOP
          </button>
        )}
        {match.sourceUrl && (
          <a
            href={match.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1 border border-border rounded hover:bg-muted transition-colors text-foreground ml-auto"
          >
            Apply ↗
          </a>
        )}
      </div>
    </div>
  );
}
