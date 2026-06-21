"use client";

import { ResearchTab } from "../positions/research-tab";

export default function JobResearchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Job Research</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Discover real, current job openings matching your profile using AI deep web search.
      </p>

      <ResearchTab targetType="job" />
    </div>
  );
}
