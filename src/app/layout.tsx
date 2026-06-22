import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Career Ladder — AI Career Services",
    template: "%s | Career Ladder",
  },
  description:
    "AI-powered career services: CV matching, SOP generation, skill gap analysis, and academic position discovery. Powered by Snowflake Cortex.",
  keywords: [
    "AI career services",
    "job matching",
    "SOP generator",
    "cover letter AI",
    "CV parser",
    "academic positions",
    "skill gap analysis",
  ],
  authors: [{ name: "Career Ladder" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Career Ladder",
    title: "Career Ladder — AI-Powered Career Matching",
    description:
      "Upload your CV, get instant job matches, personalized SOPs, and skill gap analysis powered by enterprise AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Career Ladder — AI Career Services",
    description:
      "Upload your CV, get instant job matches, personalized SOPs, and skill gap analysis.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          <ThemeProvider>
            <SiteHeader />
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
