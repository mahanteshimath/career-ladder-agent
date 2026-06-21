"use client";

import { useEffect, useState } from "react";
import { JobCard } from "@/components/JobCard";

interface MatchItem {
  id: string;
  title: string;
  organization: string;
  score: number;
  matchMethod: "keyword" | "semantic" | "hybrid";
  location?: string;
  description?: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch("/api/matches");
        const data = await res.json();
        if (data.success) {
          setMatches(data.data || []);
        }
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Job Matches</h1>
      <p className="text-sm text-gray-600 mt-1">
        Matched results based on your CV analysis.
      </p>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-gray-500">
          <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
          Loading matches...
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white border rounded-lg">
          <p className="text-gray-500">No matches yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload a CV first to get job matches.
          </p>
          <a
            href="/dashboard/upload"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
          >
            Upload CV
          </a>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {matches.map((match) => (
            <JobCard
              key={match.id}
              match={match}
              userTier="basic"
              onViewDetails={(id) => console.log("View", id)}
              onGenerateSop={(id) => console.log("SOP", id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
