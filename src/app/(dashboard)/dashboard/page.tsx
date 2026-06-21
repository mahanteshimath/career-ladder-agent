import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user;
  const tier = (user as Record<string, unknown>).tier as string || "free";
  const persona = (user as Record<string, unknown>).persona as string || "job_seeker";

  // Redirect to onboarding if persona not set
  if (!persona || persona === "unset") {
    redirect("/dashboard/onboarding");
  }

  const isStudent = persona === "student";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Welcome back, {user.name || "there"}!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Plan</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1 capitalize">{tier}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CVs Uploaded</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">—</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isStudent ? "Positions Saved" : "Matches Found"}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">—</p>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/dashboard/upload"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Upload CV
          </a>
          {isStudent ? (
            <>
              <a
                href="/dashboard/positions"
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Explore Positions
              </a>
              <a
                href="/dashboard/deadlines"
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Deadlines
              </a>
            </>
          ) : (
            <>
              <a
                href="/dashboard/matches"
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                View Matches
              </a>
              <a
                href="/dashboard/drafts"
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                My Drafts
              </a>
            </>
          )}
          <a
            href="/dashboard/generate"
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Generate SOP
          </a>
        </div>
      </div>

      {isStudent && (
        <div className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recommended For You</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Based on your research interests. Update them in settings.
          </p>
          <div className="mt-4">
            <a
              href="/dashboard/positions"
              className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:underline"
            >
              Browse personalized positions →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
