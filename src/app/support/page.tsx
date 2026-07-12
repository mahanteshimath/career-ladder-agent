import Link from "next/link";

export const metadata = { title: "Support — Career Ladder" };

export default function SupportPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Support</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-400">
        We&apos;re here to help you get the most out of Career Ladder.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Report an issue</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Found a bug or something not working? Report it from your dashboard and we&apos;ll take a look.
          </p>
          <Link
            href="/dashboard/issues"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
          >
            Go to Report Issue →
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Billing &amp; account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Questions about your subscription, payments, or account? Review the{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, or report an issue.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Frequently asked</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">How do subscriptions work?</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              Basic is billed weekly and Premium monthly via Razorpay. Access activates immediately after a verified payment.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Is my CV data private?</dt>
            <dd className="mt-1 text-gray-600 dark:text-gray-400">
              Yes — it&apos;s used only to power your matches and documents. See our{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </main>
  );
}
