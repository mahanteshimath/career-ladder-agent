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
}

interface JobCardProps {
  match: MatchResult;
  userTier: TierName;
  onViewDetails?: (id: string) => void;
  onGenerateSop?: (id: string) => void;
}

export function JobCard({ match, userTier, onViewDetails, onGenerateSop }: JobCardProps) {
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
          <span className={`text-sm font-bold px-2 py-0.5 rounded ${scoreColor}`}>
            {Math.round(match.score * 100)}%
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${methodBadge[match.matchMethod]}`}
          >
            {match.matchMethod}
          </span>
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
        {/* Tier check disabled for testing */}
        <button
          onClick={() => onGenerateSop?.(match.id)}
          className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary-hover transition-colors"
        >
          Generate SOP
        </button>
      </div>
    </div>
  );
}
