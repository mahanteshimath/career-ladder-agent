"use client";

import { useEffect, useState } from "react";
import { FileText, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DraftItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDrafts() {
      try {
        const res = await fetch("/api/drafts");
        const data = await res.json();
        if (data.success) {
          setDrafts(data.data || []);
        }
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }
    loadDrafts();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">My Drafts</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Generated SOPs, cover letters, and other documents.
      </p>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <FileText size={24} className="text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">No drafts yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Generate SOPs, cover letters, or enhanced CVs — they&apos;ll appear here for review and download.
          </p>
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Sparkles size={16} />
            Generate Now
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-card border border-border rounded-lg p-4 card-hover">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-foreground">
                  {draft.type.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">{draft.createdAt}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {draft.content}
              </p>
              <button className="mt-2 text-sm text-primary hover:underline">
                View Full Document
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
