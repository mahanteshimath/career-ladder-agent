"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.docx,.doc,.txt",
  maxSizeMb = 5,
  disabled = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`File too large. Maximum size: ${maxSizeMb}MB`);
        return false;
      }
      const allowedTypes = accept.split(",").map((t) => t.trim());
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(ext)) {
        setError(`Invalid file type. Allowed: ${accept}`);
        return false;
      }
      return true;
    },
    [accept, maxSizeMb]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect, validateFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        id="cv-upload"
      />
      <label
        htmlFor="cv-upload"
        className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">Click to upload</span>{" "}
            or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PDF, DOCX, DOC, TXT (max {maxSizeMb}MB)
          </p>
        </div>
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
