"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { Home, Upload, FileEdit, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAuthenticated = status === "authenticated" && session?.user;

  // Hide header entirely on dashboard pages (dashboard has its own nav)
  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <Logo size={32} />
          <span className="text-sm font-semibold text-foreground hidden sm:inline group-hover:text-primary transition-colors">
            Career Ladder
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Authenticated: Dashboard link + User menu */}
              <nav className="hidden md:flex items-center gap-1 mr-2">
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/upload"
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Upload CV
                </Link>
              </nav>
              <ThemeToggle />
              {/* User Avatar Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-border">
                      <span className="text-xs font-semibold text-primary">
                        {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-card border border-border shadow-lg ring-1 ring-black/5 dark:ring-white/5 py-1 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.user.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors"
                    >
                      <Home size={16} strokeWidth={1.5} />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/upload"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors"
                    >
                      <Upload size={16} strokeWidth={1.5} />
                      Upload CV
                    </Link>
                    <Link
                      href="/dashboard/drafts"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors"
                    >
                      <FileEdit size={16} strokeWidth={1.5} />
                      My Drafts
                    </Link>

                    <div className="my-1 border-t border-border" />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut size={16} strokeWidth={1.5} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Guest: Marketing nav */}
              <nav className="hidden md:flex items-center gap-1 mr-2">
                <Link
                  href="/#features"
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/#pricing"
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Pricing
                </Link>
              </nav>
              <ThemeToggle />
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
