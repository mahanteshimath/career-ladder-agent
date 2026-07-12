import Link from "next/link";

export const metadata = { title: "Terms of Service — Career Ladder" };

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: {new Date().getFullYear()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Using the service</h2>
          <p className="mt-2">
            Career Ladder provides AI-assisted career and admissions tools. You are responsible for
            reviewing and verifying all AI-generated content (CVs, SOPs, cover letters,
            recommendation letters, and outreach) before submitting it anywhere.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscriptions &amp; billing</h2>
          <p className="mt-2">
            Paid plans (Basic, Premium) are billed via Razorpay in Indian Rupees. Basic is billed
            weekly and Premium monthly. Access is granted for the plan&apos;s duration after a
            successful, verified payment. Prices are shown on the pricing section and may change with notice.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Acceptable use</h2>
          <p className="mt-2">
            Do not misuse the service, submit fraudulent information, or use generated content to
            misrepresent your qualifications. Recommendation letters must be reviewed and approved by
            the named recommender before use.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No guarantee</h2>
          <p className="mt-2">
            We do not guarantee interviews, admissions, offers, or funding. AI output may contain
            inaccuracies and should always be verified.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </main>
  );
}
