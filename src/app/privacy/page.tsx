import Link from "next/link";

export const metadata = { title: "Privacy Policy — Career Ladder" };

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: {new Date().getFullYear()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">What we collect</h2>
          <p className="mt-2">
            We collect the information you provide to use Career Ladder: your name and email
            (via sign-in), the CVs you upload, and the documents and searches you generate.
            Payment is processed by Razorpay; we do not store your card details.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">How we use it</h2>
          <p className="mt-2">
            Your CV and profile are used solely to power your matches, fit scores, and generated
            documents. AI processing is performed to deliver these features. We do not sell your
            personal data.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data retention</h2>
          <p className="mt-2">
            Free and Basic results may expire per your plan. You can request deletion of your
            account and associated data at any time by contacting support.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contact</h2>
          <p className="mt-2">
            Questions about your privacy? Reach us via the{" "}
            <Link href="/support" className="text-blue-600 hover:underline">support page</Link>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </main>
  );
}
