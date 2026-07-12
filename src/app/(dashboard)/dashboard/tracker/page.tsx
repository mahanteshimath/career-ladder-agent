"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutGrid,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  CalendarDays,
  X,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import {
  JOB_STAGES,
  ACADEMIC_STAGES,
  type TrackerJourney,
  type TrackerStage,
} from "@/config/tracker";

interface TrackerItem {
  ID: string;
  JOURNEY: TrackerJourney;
  STAGE: string;
  TITLE: string;
  ORGANIZATION: string | null;
  LOCATION: string | null;
  URL: string | null;
  DEADLINE: string | null;
  SOURCE_TYPE: string | null;
  NOTES: string | null;
  METADATA: Record<string, unknown> | null;
  CREATED_AT: string;
  UPDATED_AT: string;
}

function stagesFor(journey: TrackerJourney): TrackerStage[] {
  return journey === "academic" ? ACADEMIC_STAGES : JOB_STAGES;
}

interface FunnelStats {
  total: number;
  active: number;
  applied: number;
  interviews: number;
  success: number;
  closed: number;
  successLabel: string;
  interviewRate: number | null;
  successRate: number | null;
}

/** Compute funnel metrics from the current-stage snapshot of visible items. */
function computeStats(items: TrackerItem[], stages: TrackerStage[]): FunnelStats {
  const order = new Map(stages.map((s, i) => [s.id, i]));
  const appliedIdx = order.get("applied") ?? 1;
  const interviewIdx = order.get("interview") ?? 2;
  // The positive terminal stage is the one right before "closed" (offer / admitted).
  const successStage = stages[stages.length - 2];
  const successIdx = successStage ? order.get(successStage.id)! : stages.length - 2;

  let applied = 0;
  let interviews = 0;
  let success = 0;
  let closed = 0;
  for (const it of items) {
    if (it.STAGE === "closed") {
      closed++;
      continue;
    }
    const idx = order.get(it.STAGE);
    if (idx === undefined) continue;
    if (idx >= appliedIdx) applied++;
    if (idx >= interviewIdx) interviews++;
    if (idx >= successIdx) success++;
  }
  return {
    total: items.length,
    active: items.length - closed,
    applied,
    interviews,
    success,
    closed,
    successLabel: successStage?.label ?? "Offers",
    interviewRate: applied > 0 ? Math.round((interviews / applied) * 100) : null,
    successRate: applied > 0 ? Math.round((success / applied) * 100) : null,
  };
}

function StatsBar({ stats }: { stats: FunnelStats }) {
  const tiles: { label: string; value: string | number; accent?: string }[] = [
    { label: "Tracked", value: stats.total },
    { label: "Applied", value: stats.applied },
    { label: "Interviews", value: stats.interviews, accent: "text-amber-600 dark:text-amber-400" },
    { label: stats.successLabel, value: stats.success, accent: "text-emerald-600 dark:text-emerald-400" },
  ];
  return (
    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="bg-card border border-border rounded-xl p-3">
          <p className={`text-2xl font-bold ${t.accent ?? "text-foreground"}`}>{t.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t.label}</p>
        </div>
      ))}
      {(stats.interviewRate !== null || stats.successRate !== null) && (
        <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {stats.interviewRate !== null && (
            <span>
              Interview rate:{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.interviewRate}%</span>{" "}
              of applications
            </span>
          )}
          {stats.successRate !== null && (
            <span>
              {stats.successLabel} rate:{" "}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.successRate}%</span>{" "}
              of applications
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackerPage() {
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<TrackerJourney>("job");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tracker");
      const data = await res.json();
      if (data.success) setItems(data.data || []);
    } catch {
      /* empty state handles errors */
    } finally {
      setLoading(false);
    }
  }, []);

  // Pick the default journey from the user's profile goal, then load items.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        const goal = data?.success ? (data.data?.goal as string | undefined) : undefined;
        if (goal === "masters" || goal === "phd" || goal === "postdoc") setJourney("academic");
      } catch {
        /* default to job */
      }
      await load();
    })();
  }, [load]);

  async function moveStage(id: string, stage: string) {
    setItems((prev) => prev.map((it) => (it.ID === id ? { ...it, STAGE: stage } : it)));
    await fetch("/api/tracker", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.ID !== id));
    await fetch(`/api/tracker?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  const stages = stagesFor(journey);
  const visible = items.filter((it) => it.JOURNEY === journey);
  const hasOtherJourney = items.some((it) => it.JOURNEY !== journey);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid size={22} className="text-primary" />
            Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {journey === "academic"
              ? "Track every program from shortlist to admit — all in one board."
              : "Track every application from saved to offer — all in one board."}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          <Plus size={15} />
          Add manually
        </button>
      </div>

      {/* Journey toggle (shown for explorers who track both) */}
      {hasOtherJourney && (
        <div className="mt-4 inline-flex rounded-lg border border-border p-0.5 bg-card">
          <button
            onClick={() => setJourney("job")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              journey === "job" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase size={13} /> Jobs
          </button>
          <button
            onClick={() => setJourney("academic")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              journey === "academic" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap size={13} /> Academic
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
          <Loader2 size={16} className="animate-spin" /> Loading your board...
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <LayoutGrid size={24} className="text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">Your board is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {journey === "academic"
              ? "Save positions from Academic Positions or add one manually to start tracking your applications."
              : "Save jobs from Job Matches or add one manually to start tracking your applications."}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus size={16} /> Add your first item
          </button>
        </div>
      ) : (
        <>
          <StatsBar stats={computeStats(visible, stages)} />
          <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const col = visible.filter((it) => it.STAGE === stage.id);
              return (
                <div key={stage.id} className="flex-shrink-0 w-72">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${stage.accent}`}>
                      {stage.label}
                    </h3>
                    <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {col.length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {col.map((it) => (
                      <TrackerCard
                        key={it.ID}
                        item={it}
                        stages={stages}
                        onMove={(s) => moveStage(it.ID, s)}
                        onDelete={() => remove(it.ID)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showAdd && (
        <AddItemModal
          journey={journey}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            setLoading(true);
            load();
          }}
        />
      )}
    </div>
  );
}

function TrackerCard({
  item,
  stages,
  onMove,
  onDelete,
}: {
  item: TrackerItem;
  stages: TrackerStage[];
  onMove: (stage: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground leading-snug">{item.TITLE}</h4>
        <button
          onClick={onDelete}
          className="p-1 text-muted-foreground hover:text-rose-500 rounded"
          aria-label="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {item.ORGANIZATION && (
        <p className="text-xs text-muted-foreground mt-0.5">{item.ORGANIZATION}</p>
      )}
      {item.LOCATION && (
        <p className="text-[11px] text-muted-foreground/80 mt-0.5">📍 {item.LOCATION}</p>
      )}
      {item.DEADLINE && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
          <CalendarDays size={11} /> {new Date(item.DEADLINE).toLocaleDateString()}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2.5">
        <select
          value={item.STAGE}
          onChange={(e) => onMove(e.target.value)}
          className="flex-1 text-[11px] bg-background border border-border rounded-md py-1 px-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {item.URL && (
          <a
            href={item.URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground hover:text-primary rounded"
            aria-label="Open link"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function AddItemModal({
  journey,
  onClose,
  onAdded,
}: {
  journey: TrackerJourney;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journey,
          title: title.trim(),
          organization: organization.trim() || undefined,
          location: location.trim() || undefined,
          url: url.trim() || undefined,
          deadline: journey === "academic" && deadline ? deadline : undefined,
          sourceType: "manual",
        }),
      });
      const data = await res.json();
      if (data.success) {
        onAdded();
      } else {
        setError(data.error?.message || "Failed to add. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Add {journey === "academic" ? "program" : "job"} manually
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Field label={journey === "academic" ? "Position / program title *" : "Job title *"}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={journey === "academic" ? "PhD in Machine Learning" : "Software Engineer"}
              className="input-base"
            />
          </Field>
          <Field label={journey === "academic" ? "University" : "Company"}>
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder={journey === "academic" ? "ETH Zurich" : "Acme Corp"}
              className="input-base"
            />
          </Field>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bengaluru / Remote"
              className="input-base"
            />
          </Field>
          <Field label="Link (optional)">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input-base"
            />
          </Field>
          {journey === "academic" && (
            <Field label="Deadline (optional)">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-base"
              />
            </Field>
          )}
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Add to board
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
