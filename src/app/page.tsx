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
  Sparkles,
  Check,
} from "lucide-react";
import { PricingCards } from "@/components/PricingCards";
import { Logo } from "@/components/Logo";

const dotGrid =
  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0)";

const ease = "ease-[cubic-bezier(0.32,0.72,0,1)]";

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
    desc: "See exactly how well your CV matches each job or position — with the precise keywords you're missing and how to close the gap.",
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
    desc: "Export a clean, single-column CV any recruiter system can read.",
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
      {/* ===================== HERO ===================== */}
      <header className="grain relative isolate overflow-hidden bg-[#070b16] text-white">
        {/* mesh orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="float-orb absolute left-1/2 top-[-14%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#3a56d4] opacity-30 blur-[130px]" />
          <div className="float-orb-slow absolute right-[-6%] top-[14%] h-[28rem] w-[28rem] rounded-full bg-[#5a6fd6] opacity-20 blur-[130px]" />
          <div className="absolute bottom-[-16%] left-[-8%] h-[26rem] w-[26rem] rounded-full bg-[#1e2a66] opacity-40 blur-[120px]" />
        </div>
        {/* dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]"
          style={{ backgroundImage: dotGrid, backgroundSize: "48px 48px" }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pt-20 pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
          {/* Left: copy */}
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
              <Sparkles size={13} strokeWidth={1.75} className="text-[#8ea3f7]" />
              One copilot for jobs &amp; higher study
            </span>

            <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem]">
              Your AI career{" "}
              <span className="bg-gradient-to-r from-white via-[#c7d0ff] to-[#8ea3f7] bg-clip-text text-transparent">
                copilot
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
              Upload your CV once. Get matched roles and positions, a precise fit
              score, and tailored SOPs, cover letters, and recommendation letters —
              in minutes.
            </p>

            {/* CTAs — button-in-button */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login?callbackUrl=%2Fdashboard%2Fupload"
                className={`group inline-flex items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-[15px] font-semibold text-[#0a0e1a] shadow-xl shadow-black/30 transition-all duration-500 ${ease} hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer`}
              >
                Upload your CV
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#3a56d4] text-white transition-transform duration-500 ${ease} group-hover:translate-x-0.5 group-hover:-translate-y-px`}
                >
                  <ArrowRight size={16} strokeWidth={2.25} />
                </span>
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-6 py-3 text-[15px] font-medium text-white/90 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 active:scale-[0.98] cursor-pointer"
              >
                View plans
              </Link>
            </div>

            <ul className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-white/60">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon size={15} strokeWidth={1.5} className="text-[#8ea3f7]" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: glass product peek (double-bezel) */}
          <div className="relative lg:pl-4">
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="bezel-hi rounded-[1.5rem] border border-white/10 bg-[#0b1020]/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3a56d4]/20 text-[#8ea3f7]">
                      <Target size={16} strokeWidth={1.75} />
                    </span>
                    <span className="text-sm font-medium text-white/90">Match analysis</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>

                {/* score */}
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <div className="text-5xl font-semibold tracking-tight text-white tabular-nums">
                      92<span className="text-2xl text-white/50">%</span>
                    </div>
                    <div className="mt-1 text-sm text-white/50">Strong fit · Senior ML Engineer</div>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#3a56d4] to-[#8ea3f7]" />
                </div>

                {/* matched keywords */}
                <div className="mt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
                  Matched skills
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["PyTorch", "MLOps", "Distributed Training", "LLMs"].map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/80"
                    >
                      <Check size={12} strokeWidth={2.5} className="text-emerald-300" />
                      {k}
                    </span>
                  ))}
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/60">
                  <span className="font-medium text-white/80">Gap:</span> add &ldquo;Kubernetes&rdquo; and one
                  publication to reach a 97% match.
                </div>
              </div>
            </div>
            {/* floating mini badge */}
            <div className="absolute -left-2 bottom-6 hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-xl sm:block">
              <div className="text-xs text-white/50">SOP drafted</div>
              <div className="text-sm font-semibold text-white">in 8 seconds</div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" aria-hidden />
      </header>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="reveal mb-16 max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From CV to submission in three steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            Move your job search or grad-school application forward without the busywork.
          </p>
        </div>

        <div className="relative grid gap-6 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {steps.map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="reveal group relative rounded-[1.5rem] border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <span className="font-mono text-2xl font-semibold text-foreground/10 tabular-nums transition-colors group-hover:text-primary/30">
                  {step}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FEATURES BENTO ===================== */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="reveal mb-16 max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Capabilities
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl text-balance">
              Everything you need — for jobs and higher study
            </h2>
            <p className="mt-3 text-muted-foreground">
              Whether you&apos;re chasing a role or a research position, Career Ladder covers
              the whole journey.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }, i) => {
              const showcase = i === 0;
              return (
                <div
                  key={title}
                  className={`reveal group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 card-hover ${
                    showcase ? "lg:col-span-2 lg:row-span-2 lg:p-9" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 ${
                      showcase ? "h-14 w-14" : "h-11 w-11"
                    }`}
                  >
                    <Icon size={showcase ? 26 : 20} strokeWidth={1.5} />
                  </div>
                  <h3
                    className={`mt-5 font-semibold text-foreground ${
                      showcase ? "text-2xl tracking-tight" : "text-base"
                    }`}
                  >
                    {title}
                  </h3>
                  <p
                    className={`mt-2 leading-relaxed text-muted-foreground ${
                      showcase ? "text-[15px]" : "text-sm"
                    }`}
                  >
                    {desc}
                  </p>

                  {showcase && (
                    <div className="mt-auto pt-8">
                      <div className="rounded-2xl border border-border bg-muted/40 p-5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">Overall fit</span>
                          <span className="font-semibold text-primary tabular-nums">92%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-accent" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["Keywords", "Skills", "Experience"].map((t) => (
                            <span
                              key={t}
                              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-border px-6 md:grid-cols-4 md:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="reveal px-6 py-12 text-center">
              <div className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-semibold tracking-tight text-transparent tabular-nums sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" className="px-6 py-24">
        <div className="reveal mb-16 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Start free. Upgrade when you need more power.
          </p>
        </div>
        <PricingCards />
      </section>

      {/* ===================== CTA BAND ===================== */}
      <section className="px-6 pb-24">
        <div className="grain relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#070b16] px-6 py-20 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="float-orb absolute left-1/2 top-[-30%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#3a56d4] opacity-30 blur-[120px]" />
            <div className="absolute bottom-[-40%] right-[10%] h-[24rem] w-[24rem] rounded-full bg-[#5a6fd6] opacity-20 blur-[120px]" />
          </div>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            Ready to move your career forward?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            Upload your CV and get matched roles, positions, and tailored documents in minutes.
          </p>
          <Link
            href="/login?callbackUrl=%2Fdashboard%2Fupload"
            className={`group mt-9 inline-flex items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-[15px] font-semibold text-[#0a0e1a] shadow-xl shadow-black/30 transition-all duration-500 ${ease} hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer`}
          >
            Upload your CV
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#3a56d4] text-white transition-transform duration-500 ${ease} group-hover:translate-x-0.5 group-hover:-translate-y-px`}
            >
              <ArrowRight size={16} strokeWidth={2.25} />
            </span>
          </Link>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
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
