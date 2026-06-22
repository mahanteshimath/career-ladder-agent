"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import {
  ParsedCvPreview,
  type ParsedCvData,
  type DetectedProfile,
} from "@/components/ParsedCvPreview";
import { CheckCircle2, Search, UploadCloud, Loader2, FileText, Trash2, Eye, EyeOff } from "lucide-react";

interface UploadResult {
  id?: string;
  filename: string;
  parsed: ParsedCvData;
  profile?: DetectedProfile;
  usedFallback?: boolean;
  processingTime?: number;
}

interface CvListItem {
  ID: string;
  FILENAME: string;
  PARSED_JSON: ParsedCvData | { cv: ParsedCvData; detectedProfile?: DetectedProfile } | null;
  UPLOADED_AT: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [cvList, setCvList] = useState<CvListItem[]>([]);
  const [loadingCvs, setLoadingCvs] = useState(true);
  const [expandedCvId, setExpandedCvId] = useState<string | null>(null);

  const loadCvList = useCallback(async () => {
    try {
      const res = await fetch("/api/cv/list");
      const data = await res.json();
      if (data.success) {
        setCvList(data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingCvs(false);
    }
  }, []);

  useEffect(() => {
    loadCvList();
  }, [loadCvList]);

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setUploadResult(data.data);
        // Refresh CV list
        loadCvList();
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFindMatches = async (targetType: "job" | "position", cvId?: string) => {
    const id = cvId || uploadResult?.id;
    if (!id) return;
    setTriggering(true);
    setError(null);

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: id, targetType }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard/matches");
      } else {
        setError(data.error || "Matching failed. Try again from the Matches page.");
        setTriggering(false);
      }
    } catch {
      setError("Network error during matching.");
      setTriggering(false);
    }
  };

  const handleReset = () => {
    setUploadResult(null);
    setError(null);
  };

  /** Extract flat ParsedCvData from either format */
  const extractParsedCv = (json: CvListItem["PARSED_JSON"]): ParsedCvData | null => {
    if (!json) return null;
    // New flat format: { name, skills, ... }
    if ("name" in json) return json as ParsedCvData;
    // Legacy nested format: { cv: { name, ... } }
    if ("cv" in json && json.cv) return json.cv as ParsedCvData;
    return null;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Upload CV</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Upload your CV to get matched with jobs and academic positions.
      </p>

      {/* Upload area — hidden after success */}
      {!uploadResult && (
        <div className="mt-6 max-w-lg">
          <FileUpload onFileSelect={handleFileSelect} disabled={uploading} />

          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary">
              <Loader2 size={16} className="animate-spin" />
              Parsing your CV with AI...
            </div>
          )}

          {error && !uploadResult && (
            <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Parsed CV result (just uploaded) */}
      {uploadResult && (
        <div className="mt-6 space-y-5 max-w-2xl">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-sm">
            <CheckCircle2 size={18} className="shrink-0" />
            <div>
              <strong>CV parsed successfully!</strong>
              {uploadResult.processingTime && (
                <span className="ml-1 text-green-600/70 dark:text-green-400/60">
                  ({(uploadResult.processingTime / 1000).toFixed(1)}s)
                </span>
              )}
            </div>
          </div>

          {uploadResult.usedFallback && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
              <span>⚠️</span>
              <span>AI parsing was unavailable — basic extraction used. Some details may be missing.</span>
            </div>
          )}

          <ParsedCvPreview
            data={uploadResult.parsed}
            profile={uploadResult.profile}
            filename={uploadResult.filename}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleFindMatches("job")}
              disabled={triggering || !uploadResult.id}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggering ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {triggering ? "Finding matches..." : "Find Matching Jobs"}
            </button>
            <button
              onClick={() => handleFindMatches("position")}
              disabled={triggering || !uploadResult.id}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-card text-foreground text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggering ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {triggering ? "Finding positions..." : "Find Academic Positions"}
            </button>
          </div>

          <button
            onClick={handleReset}
            disabled={triggering}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <UploadCloud size={14} />
            Upload Another CV
          </button>

          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Previously uploaded CVs */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          Your CVs
          {cvList.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({cvList.length})</span>
          )}
        </h2>

        {loadingCvs ? (
          <div className="mt-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-4 w-48 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : cvList.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No CVs uploaded yet. Upload your first CV above.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {cvList.map((cv, idx) => {
              const parsed = extractParsedCv(cv.PARSED_JSON);
              const isExpanded = expandedCvId === cv.ID;
              const isLatest = idx === 0;

              return (
                <div
                  key={cv.ID}
                  className={`bg-card border rounded-lg overflow-hidden transition-colors ${
                    isLatest ? "border-primary/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {cv.FILENAME}
                        </p>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/10 text-primary shrink-0">
                            LATEST
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cv.UPLOADED_AT).toLocaleDateString()} · {parsed?.name || "—"}
                        {parsed?.skills?.length ? ` · ${parsed.skills.length} skills` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setExpandedCvId(isExpanded ? null : cv.ID)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                        title={isExpanded ? "Collapse" : "View details"}
                      >
                        {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => handleFindMatches("job", cv.ID)}
                        disabled={triggering}
                        className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        Match
                      </button>
                    </div>
                  </div>

                  {isExpanded && parsed && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      <ParsedCvPreview data={parsed} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
