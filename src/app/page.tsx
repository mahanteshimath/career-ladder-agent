import Link from "next/link";
import {
  ArrowRight,
  Upload,
  Search,
  PenLine,
  Target,
  FileText,
  Award,
  Mail,
  MessageSquare,
  FileCheck2,
  GraduationCap,
  Zap,
} from "lucide-react";
import { PricingCards } from "@/components/PricingCards";
import { Logo } from "@/components/Logo";

const heroPattern =
  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload your CV",
    desc: "Drop a PDF or DOCX. The AI extracts and structures your experience, skills, and qualifications in seconds.",
  },
  {
    step: "02",
    icon: Search,
    title: "Get matched",
    desc: "Hybrid keyword and semantic vector search surfaces the industry jobs and academic positions that actually fit.",
  },
  {
    step: "03",
    icon: PenLine,
    title: "Generate documents",
    desc: "Produce tailored SOPs, cover letters, and a skill-gap analysis — ready to submit in minutes, not days.",
  },
];

const features = [
  {
    icon: Target,
    title: "Smart fit score",
    desc: "See how well your CV matches each job or position, with the exact keywords you're missing.",
  },
  {
    icon: FileText,
    title: "SOPs, cover & recommendation letters",
    desc: "Generate tailored documents with a built-in quality self-audit that flags generic phrasing.",
  },
  {
    icon: Award,
    title: "Scholarship finder",
    desc: "Discover real, current funding matched to your profile through live AI research.",
  },
  {
    icon: Mail,
    title: "Professor outreach",
    desc: "Draft personalized emails that reference a supervisor's research — and track your pipeline.",
  },
  {
    icon: MessageSquare,
    title: "Interview prep",
    desc: "Practice tailored questions with talking points grounded in your own CV.",
  },
  {
    icon: FileCheck2,
    title: "ATS-safe CV builder",
    desc: "Build an enhanced CV and export a clean, single-column version any recruiter system can read.",
  },
];

const trust = [
  { icon: GraduationCap, label: "Jobs & PhD / Masters" },
  { icon: FileText, label: "Tailored SOPs & letters" },
  { icon: Zap, label: "Results in seconds" },
];

const stats = [
  { value: "10K+", label: "Positions indexed" },
  { value: "<5s", label: "Average match time" },
  { value: "2", label: "Paths, one copilot" },
  { value: "24/7", label: "AI availability" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_50%_-10%,#3a56d4_0%,#2f45ac_45%,#1e2a66_100%)] text-white dark:bg-[radial-gradient(120%_120%_at_50%_-10%,#1e2a66_0%,#131a3f_50%,#0a0e1a_100%)]">
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: heroPattern, backgroundSize: "56px 56px" }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" aria-hidden />

        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
            <Zap size={14} strokeWidth={2} />
            One copilot for jobs and higher study
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl text-balance">
            Your AI career copilot
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/80">
            Upload your CV to get matched roles and positions, a fit score, and
            tailored SOPs, cover letters, and recommendation letters.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login?callbackUrl=%2Fdashboard%2Fupload"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-primary shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 cursor-pointer"
            >
              Upload your CV
              <ArrowRight
                size={18}
                strokeWidth={2.25}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 px-7 py-3.5 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 active:translate-y-px cursor-pointer"
            >
              View plans
            </Link>
          </div>

          <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/75">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon size={16} strokeWidth={1.75} className="text-white/60" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to move your job search or grad-school application forward.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="group relative rounded-2xl border border-border bg-card p-8 card-hover">
              <span className="font-mono text-sm font-semibold text-primary/60 tabular-nums">{step}</span>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Everything you need — for jobs and higher study
            </h2>
            <p className="mt-3 text-muted-foreground">
              Whether you&apos;re chasing a role or a research position, Career Ladder covers the
              whole journey.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card p-7 transition-colors hover:bg-muted/60">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-14 text-center md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Simple, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Start free. Upgrade when you need more power.
          </p>
        </div>
        <PricingCards />
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_140%_at_50%_0%,#3a56d4_0%,#2f45ac_55%,#1e2a66_100%)] dark:bg-[radial-gradient(120%_140%_at_50%_0%,#1e2a66_0%,#131a3f_60%,#0a0e1a_100%)]">
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Ready to move your career forward?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/80">
            Upload your CV and get matched roles, positions, and tailored documents in minutes.
          </p>
          <Link
            href="/login?callbackUrl=%2Fdashboard%2Fupload"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-primary shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Upload your CV
            <ArrowRight
              size={18}
              strokeWidth={2.25}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-semibold text-foreground">Career Ladder</span>
            </div>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
              <Link href="/support" className="transition-colors hover:text-foreground">Support</Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Career Ladder. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
