"use client";

import { useEffect, useState } from "react";

interface SavedPosition {
  ID: string;
  TITLE: string;
  UNIVERSITY: string;
  DEPARTMENT?: string;
  TYPE: string;
  COUNTRY: string;
  DEADLINE?: string;
  SOURCE_URL?: string;
}

export default function DeadlinesPage() {
  const [positions, setPositions] = useState<SavedPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSaved() {
      try {
        const res = await fetch("/api/positions/saved");
        const data = await res.json();
        if (data.success) {
          setPositions(data.data || []);
        }
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }
    fetchSaved();
  }, []);

  // Sort by deadline (soonest first), positions without deadline last
  const sorted = [...positions].sort((a, b) => {
    if (!a.DEADLINE && !b.DEADLINE) return 0;
    if (!a.DEADLINE) return 1;
    if (!b.DEADLINE) return -1;
    return new Date(a.DEADLINE).getTime() - new Date(b.DEADLINE).getTime();
  });

  function getUrgencyBadge(deadline?: string) {
    if (!deadline) return { label: "No deadline", color: "bg-gray-100 dark:bg-gray-800 text-gray-500" };
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "Expired", color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400" };
    if (days === 0) return { label: "Today!", color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 animate-pulse" };
    if (days <= 3) return { label: `${days}d left`, color: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" };
    if (days <= 7) return { label: `${days}d left`, color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" };
    if (days <= 30) return { label: `${days}d left`, color: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400" };
    return { label: `${days}d left`, color: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" };
  }

  async function handleUnsave(positionId: string) {
    setPositions((prev) => prev.filter((p) => p.ID !== positionId));
    await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId, action: "unsave" }),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deadline Tracker</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Your saved positions sorted by upcoming deadlines.
      </p>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
          Loading deadlines...
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-4xl">📌</p>
          <p className="text-gray-500 dark:text-gray-400 mt-3">No saved positions yet.</p>
          <a
            href="/dashboard/positions"
            className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Positions
          </a>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {sorted.map((pos) => {
            const urgency = getUrgencyBadge(pos.DEADLINE);
            return (
              <div
                key={pos.ID}
                className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-5 py-4"
              >
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${urgency.color}`}>
                  {urgency.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{pos.TITLE}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {pos.UNIVERSITY}{pos.DEPARTMENT ? ` — ${pos.DEPARTMENT}` : ""} • {pos.COUNTRY}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pos.DEADLINE && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(pos.DEADLINE).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {pos.SOURCE_URL && (
                    <a
                      href={pos.SOURCE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </a>
                  )}
                  <button
                    onClick={() => handleUnsave(pos.ID)}
                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                    title="Remove from deadlines"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
