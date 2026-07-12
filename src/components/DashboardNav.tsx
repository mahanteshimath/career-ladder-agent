"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Home,
  Upload,
  Monitor,
  GraduationCap,
  CalendarDays,
  Star,
  Award,
  ClipboardCheck,
  Sparkles,
  MessageSquare,
  ScrollText,
  FileEdit,
  FileText,
  AlertTriangle,
  LogOut,
  Search,
  Menu,
  X,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { NavPersona } from "@/lib/persona";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  personas?: ("student" | "job_seeker")[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/upload", label: "Upload CV", icon: Upload },
  { href: "/dashboard/evaluate", label: "Evaluate", icon: Monitor },
  { href: "/dashboard/tracker", label: "Tracker", icon: LayoutGrid },
  { href: "/dashboard/positions", label: "Academic Positions", icon: GraduationCap, personas: ["student"] },
  { href: "/dashboard/scholarships", label: "Scholarships", icon: Award, personas: ["student"] },
  { href: "/dashboard/deadlines", label: "Deadlines", icon: CalendarDays, personas: ["student"] },
  { href: "/dashboard/shortlist", label: "University Shortlist", icon: Star, personas: ["student"] },
  { href: "/dashboard/matches", label: "Job Matches", icon: ClipboardCheck, personas: ["job_seeker"] },
  { href: "/dashboard/research", label: "AI Research", icon: Search, personas: ["job_seeker"] },
  { href: "/dashboard/drafts", label: "Drafts", icon: FileEdit },
  { href: "/dashboard/generate", label: "Generate SOP", icon: Sparkles },
  { href: "/dashboard/lor", label: "Recommendation Letter", icon: ScrollText, personas: ["student"] },
  { href: "/dashboard/interview", label: "Interview Prep", icon: MessageSquare },
  { href: "/dashboard/cv-builder", label: "CV Builder", icon: FileText },
  { href: "/dashboard/issues", label: "Report Issue", icon: AlertTriangle },
];

function NavContent({ persona, pathname }: { persona: NavPersona; pathname: string }) {
  const { data: session } = useSession();
  // "explorer" (undecided) users see every journey's items; otherwise filter by persona.
  const filteredItems = navItems.filter(
    (item) => !item.personas || persona === "explorer" || item.personas.includes(persona)
  );

  return (
    <>
      {/* Logo */}
      <div className="mb-6 px-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <Logo size={32} />
          <div>
            <h1 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Career Ladder
            </h1>
            <p className="text-[10px] text-muted-foreground">AI Career Services</p>
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <ul className="space-y-0.5 flex-1 px-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                  ${isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? "text-primary" : ""}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* User section */}
      <div className="mt-auto border-t border-border pt-3 px-2 space-y-1">
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            {session.user.image ? (
              // Avatar URLs come from arbitrary auth providers (Google, etc.);
              // a plain <img> avoids next/image remote-domain configuration.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-8 h-8 rounded-full ring-2 ring-border object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-border">
                <span className="text-xs font-semibold text-primary">
                  {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{session.user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
            </div>
            <ThemeToggle />
          </div>
        )}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut size={18} strokeWidth={1.5} />
          Back to Home
        </Link>
      </div>
    </>
  );
}

export function DashboardNav({ persona = "job_seeker" }: { persona?: NavPersona }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-card border border-border shadow-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <nav
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border p-4 flex flex-col
          transform transition-transform duration-200 ease-in-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
        <NavContent persona={persona} pathname={pathname} />
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex w-64 bg-card border-r border-border min-h-screen p-4 flex-col">
        <NavContent persona={persona} pathname={pathname} />
      </nav>
    </>
  );
}
