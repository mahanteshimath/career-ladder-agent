export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded mt-2" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded mt-2" />
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="flex gap-3 mt-4">
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
