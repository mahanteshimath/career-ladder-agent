import Link from "next/link";
import { PricingCards } from "@/components/PricingCards";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0zMHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Powered by Snowflake Cortex AI
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
            Your AI Career
            <br />
            <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
              Copilot
            </span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-blue-100/90 max-w-2xl mx-auto leading-relaxed">
            Upload your CV and instantly receive job matches, personalized SOPs,
            cover letters, and skill gap analysis — all powered by enterprise AI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-gray-50 transition-all shadow-xl shadow-indigo-900/30 hover:shadow-2xl hover:-translate-y-0.5"
            >
              Upload Your CV
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center border border-white/30 text-white px-8 py-3.5 rounded-xl font-medium text-base hover:bg-white/10 backdrop-blur-sm transition-all"
            >
              View Plans
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-blue-200/80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Enterprise Security
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Cortex AI Engine
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
              Results in Seconds
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            How It Works
          </h3>
          <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Three simple steps to accelerate your career journey
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: "Upload Your CV",
              desc: "Drop your CV in PDF or DOCX. Our AI extracts and structures your experience, skills, and qualifications in seconds.",
            },
            {
              step: "02",
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ),
              title: "Get Matched",
              desc: "Hybrid keyword + semantic vector search finds the best industry jobs and academic positions tailored to you.",
            },
            {
              step: "03",
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ),
              title: "Generate Documents",
              desc: "Get tailored SOPs, cover letters, and detailed skill gap analysis — ready to submit in minutes, not days.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all"
            >
              <div className="absolute -top-3 left-6 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-md">
                Step {item.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                {item.icon}
              </div>
              <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {item.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10K+", label: "Positions Indexed" },
            { value: "< 5s", label: "Average Match Time" },
            { value: "98%", label: "Parse Accuracy" },
            { value: "24/7", label: "AI Availability" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="text-center mb-14">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Simple, Transparent Pricing
          </h3>
          <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Start free. Upgrade when you need more power.
          </p>
        </div>
        <PricingCards />
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold">
            Ready to land your dream role?
          </h3>
          <p className="mt-3 text-blue-100/90 max-w-lg mx-auto">
            Join thousands of professionals using AI to fast-track their career.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center mt-8 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-white">CL</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Career Ladder</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link href="#" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Support</Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Career Ladder. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
