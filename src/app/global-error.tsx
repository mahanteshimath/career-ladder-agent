"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-sm mx-auto">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="mt-6 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
