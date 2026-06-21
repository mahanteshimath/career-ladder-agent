"use client";

import { useState } from "react";

export default function PostJobPage() {
  const [form, setForm] = useState({
    title: "", company: "", location: "", description: "", applyUrl: "",
    posterEmail: "", salary: "", jobType: "full-time" as string,
    website: "", // honeypot
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/jobs/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage(data.data.message);
        setForm({ title: "", company: "", location: "", description: "", applyUrl: "", posterEmail: "", salary: "", jobType: "full-time", website: "" });
      } else {
        setStatus("error");
        setMessage(data.error?.message || data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Post a Job</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
          Submit a job opening to be listed on Career Ladder. All posts are reviewed before publishing.
        </p>

        {status === "success" ? (
          <div className="mt-8 p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">✓ Submitted</h2>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">{message}</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm text-green-700 dark:text-green-400 underline hover:no-underline"
            >
              Post another job
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <FieldGroup>
              <Label htmlFor="title">Job Title *</Label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Senior Software Engineer"
                required
                className="input-base"
              />
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup>
                <Label htmlFor="company">Company *</Label>
                <input
                  id="company"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Acme Inc."
                  required
                  className="input-base"
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="location">Location *</Label>
                <input
                  id="location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Remote / Mumbai, India"
                  required
                  className="input-base"
                />
              </FieldGroup>
            </div>

            <FieldGroup>
              <Label htmlFor="description">Job Description *</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the role, responsibilities, required qualifications, and what you offer..."
                required
                rows={6}
                className="input-base resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 50 characters</p>
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup>
                <Label htmlFor="jobType">Job Type</Label>
                <select
                  id="jobType"
                  value={form.jobType}
                  onChange={(e) => update("jobType", e.target.value)}
                  className="input-base"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="salary">Salary Range (optional)</Label>
                <input
                  id="salary"
                  value={form.salary}
                  onChange={(e) => update("salary", e.target.value)}
                  placeholder="₹12-18 LPA / $80-120k"
                  className="input-base"
                />
              </FieldGroup>
            </div>

            <FieldGroup>
              <Label htmlFor="applyUrl">Application URL *</Label>
              <input
                id="applyUrl"
                type="url"
                value={form.applyUrl}
                onChange={(e) => update("applyUrl", e.target.value)}
                placeholder="https://company.com/careers/apply"
                required
                className="input-base"
              />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="posterEmail">Your Email *</Label>
              <input
                id="posterEmail"
                type="email"
                value={form.posterEmail}
                onChange={(e) => update("posterEmail", e.target.value)}
                placeholder="hr@company.com"
                required
                className="input-base"
              />
              <p className="text-xs text-gray-500 mt-1">We&apos;ll notify you when the post is approved</p>
            </FieldGroup>

            {/* Honeypot — hidden from real users */}
            <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
              <input
                tabIndex={-1}
                autoComplete="off"
                name="website"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </div>

            {status === "error" && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {status === "submitting" ? "Submitting..." : "Submit Job Post"}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .input-base {
          width: 100%;
          border: 1px solid rgb(209 213 219);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(17 24 39);
          outline: none;
        }
        .input-base:focus {
          box-shadow: 0 0 0 2px rgb(59 130 246 / 0.5);
          border-color: transparent;
        }
        :global(.dark) .input-base {
          background: rgb(17 24 39);
          border-color: rgb(55 65 81);
          color: rgb(243 244 246);
        }
      `}</style>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {children}
    </label>
  );
}
