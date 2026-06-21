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

interface UniversityGroup {
  university: string;
  country: string;
  positions: SavedPosition[];
}

export default function ShortlistPage() {
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

  // Group by university
  const groups: UniversityGroup[] = Object.values(
    positions.reduce((acc, pos) => {
      const key = pos.UNIVERSITY;
      if (!acc[key]) {
        acc[key] = { university: key, country: pos.COUNTRY, positions: [] };
      }
      acc[key].positions.push(pos);
      return acc;
    }, {} as Record<string, UniversityGroup>)
  ).sort((a, b) => b.positions.length - a.positions.length);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">University Shortlist</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Your saved positions grouped by university.
      </p>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
          Loading shortlist...
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-4xl">🎓</p>
          <p className="text-gray-500 dark:text-gray-400 mt-3">No universities shortlisted yet.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Save positions from the Academic Positions page to build your shortlist.
          </p>
          <a
            href="/dashboard/positions"
            className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Positions
          </a>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {groups.length} {groups.length === 1 ? "university" : "universities"} • {positions.length} positions saved
          </p>

          {groups.map((group) => (
            <div
              key={group.university}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{group.university}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">📍 {group.country}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                    {group.positions.length} {group.positions.length === 1 ? "position" : "positions"}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {group.positions.map((pos) => (
                  <div key={pos.ID} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{pos.TITLE}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pos.DEPARTMENT && `${pos.DEPARTMENT} • `}
                        <span className="uppercase text-[10px] font-medium">{pos.TYPE?.replace("_", " ")}</span>
                        {pos.DEADLINE && ` • Due ${new Date(pos.DEADLINE).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    {pos.SOURCE_URL && (
                      <a
                        href={pos.SOURCE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        View →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
