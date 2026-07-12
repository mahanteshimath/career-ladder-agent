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

interface LabInsights {
  university: string;
  department: string;
  summary: string;
  qsRanking: string;
  researchOutput: string;
  labEnvironment: string;
  ethicalPractice: string;
  alumniDestinations: string;
  notableFaculty: string[];
  citations: string[];
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
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"browse" | "research">("browse");

  // Filters
  const [type, setType] = useState("");
  const [continent, setContinent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Lab insights modal
  const [labPos, setLabPos] = useState<Position | null>(null);
  const [labData, setLabData] = useState<LabInsights | null>(null);
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState("");

  async function openLabInsights(pos: Position) {
    setLabPos(pos);
    setLabData(null);
    setLabError("");
    setLabLoading(true);
    try {
      const res = await fetch("/api/positions/lab-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university: pos.UNIVERSITY,
          department: pos.DEPARTMENT || "",
          field: pos.TITLE,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLabData(data.data as LabInsights);
      } else {
        setLabError(data.error || "Could not load lab insights.");
      }
    } catch {
      setLabError("Network error while loading lab insights.");
    } finally {
      setLabLoading(false);
    }
  }

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

  async function trackPosition(pos: Position) {
    if (trackedIds.has(pos.ID)) return;
    setTrackedIds((prev) => new Set(prev).add(pos.ID));
    await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journey: "academic",
        title: pos.TITLE,
        organization: pos.UNIVERSITY || undefined,
        location: pos.COUNTRY || pos.CONTINENT || undefined,
        url: pos.SOURCE_URL || undefined,
        deadline: pos.DEADLINE || undefined,
        sourceType: "position",
        sourceId: pos.ID,
        metadata: { professor: pos.PROFESSOR, department: pos.DEPARTMENT, type: pos.TYPE },
      }),
    }).catch(() => {
      // revert on failure so the user can retry
      setTrackedIds((prev) => {
        const next = new Set(prev);
        next.delete(pos.ID);
        return next;
      });
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
      <h1 className="text-2xl font-bold text-foreground">Academic Positions</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Browse pre-seeded positions or use AI Research to discover new ones.
      </p>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-border">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "browse"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Database
        </button>
        <button
          onClick={() => setActiveTab("research")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "research"
              ? "border-secondary text-secondary"
              : "border-transparent text-muted-foreground hover:text-foreground"
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
        <div className="mt-8 flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
          Loading positions...
        </div>
      ) : positions.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">No positions found matching your filters.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filters.</p>
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
                  <button
                    onClick={() => trackPosition(pos)}
                    disabled={trackedIds.has(pos.ID)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      trackedIds.has(pos.ID)
                        ? "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 cursor-default"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400"
                    }`}
                  >
                    {trackedIds.has(pos.ID) ? "✓ Tracking" : "+ Track"}
                  </button>
                  <button
                    onClick={() => openLabInsights(pos)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    ✨ Lab Insights
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

      {labPos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setLabPos(null)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                  Lab Insights — {labPos.UNIVERSITY}
                </h2>
                {labPos.DEPARTMENT && (
                  <p className="text-xs text-muted-foreground truncate">{labPos.DEPARTMENT}</p>
                )}
              </div>
              <button
                onClick={() => setLabPos(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {labLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
                  Researching the lab — this may take up to a minute...
                </div>
              )}

              {labError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  {labError}
                </div>
              )}

              {labData && !labLoading && (
                <div className="space-y-4 text-sm">
                  {([
                    ["Overview", labData.summary],
                    ["QS Ranking", labData.qsRanking],
                    ["Research Output", labData.researchOutput],
                    ["Lab Environment", labData.labEnvironment],
                    ["Ethical Practice", labData.ethicalPractice],
                    ["Alumni Destinations", labData.alumniDestinations],
                  ] as const).map(([label, value]) => (
                    <div key={label}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </h3>
                      <p className="mt-1 text-foreground leading-relaxed">{value}</p>
                    </div>
                  ))}

                  {labData.notableFaculty.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Notable Faculty
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {labData.notableFaculty.map((f) => (
                          <span key={f} className="px-2 py-0.5 text-xs rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {labData.citations.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Sources
                      </h3>
                      <ul className="mt-1 space-y-1">
                        {labData.citations.slice(0, 6).map((c) => (
                          <li key={c}>
                            <a href={c} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                              {c}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground/70 pt-2 border-t border-border">
                    AI-compiled from public sources. Verify important details before applying.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
