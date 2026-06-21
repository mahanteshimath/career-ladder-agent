import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-200 dark:text-gray-800">404</p>
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
