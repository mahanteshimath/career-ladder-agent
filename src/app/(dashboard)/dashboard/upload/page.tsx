"use client";

import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.success
          ? "CV uploaded and parsed successfully!"
          : data.error || "Upload failed",
      });
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Upload CV</h1>
      <p className="text-sm text-gray-600 mt-1">
        Upload your CV to get matched with jobs and academic positions.
      </p>

      <div className="mt-6 max-w-lg">
        <FileUpload onFileSelect={handleFileSelect} disabled={uploading} />

        {uploading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            Parsing your CV with AI...
          </div>
        )}

        {result && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              result.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
