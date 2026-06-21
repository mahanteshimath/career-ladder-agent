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
      ? "text-green-600 bg-green-50"
      : match.score >= 0.6
        ? "text-yellow-600 bg-yellow-50"
        : "text-gray-600 bg-gray-50";

  const methodBadge = {
    keyword: "bg-blue-100 text-blue-700",
    semantic: "bg-purple-100 text-purple-700",
    hybrid: "bg-green-100 text-green-700",
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{match.title}</h3>
          <p className="text-sm text-gray-600">{match.organization}</p>
          {match.location && (
            <p className="text-xs text-gray-500 mt-1">{match.location}</p>
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
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
          {match.description}
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onViewDetails?.(match.id)}
          className="text-sm px-3 py-1 border rounded hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>
        {userTier !== "free" && (
          <button
            onClick={() => onGenerateSop?.(match.id)}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Generate SOP
          </button>
        )}
      </div>
    </div>
  );
}
