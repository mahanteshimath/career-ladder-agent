import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/snowflake/queries";
import {
  Upload,
  Monitor,
  Sparkles,
  FileText,
  GraduationCap,
  Briefcase,
  Search,
  CalendarDays,
  Settings,
  CheckCircle2,
  Circle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user;
  const userId = (user as Record<string, unknown>).id as string;
  const tier = (user as Record<string, unknown>).tier as string || "free";
  
  // Fetch user profile
  const profileRow = userId ? await getUserProfile(userId).catch(() => null) : null;
  const profile = profileRow?.PROFILE_JSON as Record<string, unknown> | null;
  const onboardingComplete = profileRow?.ONBOARDING_COMPLETE;

  // Redirect to onboarding if profile not set
  if (!onboardingComplete) {
    redirect("/dashboard/onboarding");
  }

  const goal = (profile?.goal as string) || "job";
  const field = (profile?.field as string) || "";
  const experience = (profile?.experience as string) || "";
  const locations = (profile?.locations as string[]) || [];
  const isAcademic = ["phd", "postdoc", "masters"].includes(goal);

  const goalLabels: Record<string, string> = {
    job: "Job Seeker",
    phd: "PhD Aspirant",
    postdoc: "PostDoc Researcher",
    masters: "Masters Applicant",
    undecided: "Exploring",
  };

  // Getting started checklist items
  const checklist = [
    { label: "Complete your profile", href: "/dashboard/onboarding?edit=true", done: !!onboardingComplete },
    { label: "Upload your first CV", href: "/dashboard/upload", done: false },
    { label: isAcademic ? "Evaluate a position" : "Evaluate a job posting", href: "/dashboard/evaluate", done: false },
    { label: isAcademic ? "Generate an SOP" : "Generate a cover letter", href: "/dashboard/generate", done: false },
  ];

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      {/* Profile Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20" />
        <div className="px-6 pb-5 -mt-8">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/20 border-4 border-card flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold text-primary">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {user.name || "Welcome!"}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <TrendingUp size={12} />
                  {goalLabels[goal] || goal}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                  {tier} plan
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                {field && <span>{field}</span>}
                {experience && <span>· {experience} experience</span>}
                {locations.length > 0 && <span>· {locations.slice(0, 2).join(", ")}</span>}
              </div>
            </div>
            <Link
              href="/dashboard/onboarding?edit=true"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Settings size={14} />
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Evaluate CTA */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Monitor size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground text-lg">
              {isAcademic ? "Evaluate a Program or Position" : "Evaluate a Job Posting"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paste any {isAcademic ? "program/position URL or description" : "job posting URL or description"} — get a structured fit report with actionable insights.
            </p>
            <Link
              href="/dashboard/evaluate"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
            >
              Evaluate Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction
              href="/dashboard/upload"
              icon={Upload}
              label="Upload CV"
              desc="Add or update your resume"
            />
            {isAcademic ? (
              <>
                <QuickAction href="/dashboard/positions" icon={GraduationCap} label="Explore Positions" desc="Find academic openings" />
                <QuickAction href="/dashboard/research" icon={Search} label="AI Research" desc="Discover opportunities" />
                <QuickAction href="/dashboard/deadlines" icon={CalendarDays} label="Deadlines" desc="Track application dates" />
              </>
            ) : (
              <>
                <QuickAction href="/dashboard/matches" icon={Briefcase} label="View Matches" desc="See matched jobs" />
                <QuickAction href="/dashboard/research" icon={Search} label="AI Job Research" desc="Find relevant openings" />
              </>
            )}
            <QuickAction
              href="/dashboard/generate"
              icon={Sparkles}
              label={isAcademic ? "Generate SOP" : "Generate Cover Letter"}
              desc="AI-powered writing"
            />
            <QuickAction href="/dashboard/drafts" icon={FileText} label="My Drafts" desc="View saved documents" />
          </div>
        </div>

        {/* Getting Started Checklist */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground">Getting Started</h2>
          <ul className="mt-4 space-y-3">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 group text-sm"
                >
                  {item.done ? (
                    <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                  )}
                  <span className={item.done
                    ? "text-muted-foreground line-through"
                    : "text-foreground group-hover:text-primary transition-colors"
                  }>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-warning/5 rounded-xl border border-warning/20 p-5 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">💡</span>
        <p className="text-sm text-foreground/80">
          <span className="font-medium">Tip:</span>{" "}
          {isAcademic
            ? "Upload your CV first, then use Evaluate to check how well you match any position or program."
            : "Upload your CV first, then paste any job posting to get an instant fit report with gap analysis."}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted hover:border-muted-foreground/20 transition-all group card-hover"
    >
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
