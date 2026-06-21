"use client";

import { useEffect, useState } from "react";

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
      <h1 className="text-2xl font-bold text-gray-900">My Drafts</h1>
      <p className="text-sm text-gray-600 mt-1">
        Generated SOPs, cover letters, and other documents.
      </p>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-gray-500">
          <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
          Loading drafts...
        </div>
      ) : drafts.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white border rounded-lg">
          <p className="text-gray-500">No drafts yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Generate an SOP or cover letter from your match results.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-gray-900">
                  {draft.type.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500">{draft.createdAt}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                {draft.content}
              </p>
              <button className="mt-2 text-sm text-blue-600 hover:underline">
                View Full Document
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
