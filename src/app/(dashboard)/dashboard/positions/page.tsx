"use client";

import { useEffect, useState, useCallback } from "react";
import { ResearchTab } from "./research-tab";

interface Position {
  ID: string;
  TITLE: string;
  UNIVERSITY: string;
  DEPARTMENT: string;
  PROFESSOR?: string;
  TYPE: string;
  CONTINENT: string;
  COUNTRY: string;
  DEADLINE?: string;
  SOURCE_URL?: string;
  DESCRIPTION: string;
}

const POSITION_TYPES = [
  { value: "", label: "All Types" },
  { value: "phd", label: "PhD" },
  { value: "postdoc", label: "Postdoc" },
  { value: "masters", label: "Masters" },
  { value: "research_assistant", label: "Research Assistant" },
];

const CONTINENTS = [
  { value: "", label: "All Regions" },
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "North America", label: "North America" },
  { value: "Australia", label: "Australia/Oceania" },
  { value: "Africa", label: "Africa" },
  { value: "South America", label: "South America" },
];

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"browse" | "research">("browse");

  // Filters
  const [type, setType] = useState("");
  const [continent, setContinent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (continent) params.set("continent", continent);
    if (keyword) params.set("keyword", keyword);
    params.set("limit", "30");

    try {
      const res = await fetch(`/api/positions?${params}`);
      const data = await res.json();
      if (data.success) {
        setPositions(data.data || []);
      }
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, [type, continent, keyword]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setKeyword(searchInput);
  }

  async function toggleSave(positionId: string) {
    const isSaved = savedIds.has(positionId);
    const action = isSaved ? "unsave" : "save";

    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(positionId);
      else next.add(positionId);
      return next;
    });

    await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId, action }),
    });
  }

  function getDeadlineColor(deadline?: string) {
    if (!deadline) return "text-gray-400";
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "text-red-500 line-through";
    if (days < 7) return "text-red-600 font-medium";
    if (days < 30) return "text-amber-600";
    return "text-green-600";
  }

  function formatDeadline(deadline?: string) {
    if (!deadline) return "No deadline";
    const d = new Date(deadline);
    const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "Expired";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `${days} days left`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Academic Positions</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Browse pre-seeded positions or use AI Research to discover new ones.
      </p>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "browse"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Browse Database
        </button>
        <button
          onClick={() => setActiveTab("research")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "research"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          ✨ AI Research
        </button>
      </div>

      {activeTab === "research" ? (
        <ResearchTab targetType="position" onResultsPersisted={fetchPositions} />
      ) : (
      <>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by keyword, title, or university..."
            className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {POSITION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={continent}
          onChange={(e) => setContinent(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg py-2 px-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {CONTINENTS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Active filters */}
      {(type || continent || keyword) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {type && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded text-xs">
              {POSITION_TYPES.find((t) => t.value === type)?.label}
              <button onClick={() => setType("")} className="hover:text-blue-900">×</button>
            </span>
          )}
          {continent && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded text-xs">
              {continent}
              <button onClick={() => setContinent("")} className="hover:text-blue-900">×</button>
            </span>
          )}
          {keyword && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded text-xs">
              &quot;{keyword}&quot;
              <button onClick={() => { setKeyword(""); setSearchInput(""); }} className="hover:text-blue-900">×</button>
            </span>
          )}
          <button onClick={() => { setType(""); setContinent(""); setKeyword(""); setSearchInput(""); }} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
          Loading positions...
        </div>
      ) : positions.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">No positions found matching your filters.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {positions.map((pos) => (
            <div
              key={pos.ID}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{pos.TITLE}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 uppercase">
                      {pos.TYPE?.replace("_", " ") || "Position"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {pos.UNIVERSITY}{pos.DEPARTMENT ? ` — ${pos.DEPARTMENT}` : ""}
                  </p>
                  {pos.PROFESSOR && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Prof. {pos.PROFESSOR}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    📍 {pos.COUNTRY || pos.CONTINENT}
                  </p>
                  {pos.DESCRIPTION && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{pos.DESCRIPTION}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs ${getDeadlineColor(pos.DEADLINE)}`}>
                    {formatDeadline(pos.DEADLINE)}
                  </span>
                  <button
                    onClick={() => toggleSave(pos.ID)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      savedIds.has(pos.ID)
                        ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400"
                    }`}
                  >
                    {savedIds.has(pos.ID) ? "✓ Saved" : "Save"}
                  </button>
                  {pos.SOURCE_URL && (
                    <a
                      href={pos.SOURCE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Apply →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </> /* end browse tab */
      )}
    </div>
  );
}
