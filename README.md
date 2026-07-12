<div align="center">

# 🪜 Career Ladder

**One AI copilot for both paths — land your next job _or_ your PhD/Masters.**

CV-driven job & academic-position matching, fit scoring, and AI-generated SOPs, cover letters, recommendation letters, professor outreach, scholarships, and interview prep — built for the Indian market.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest)](https://vitest.dev/)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-000?logo=vercel)](https://vercel.com/)

[Features](#-features) · [Quick start](#-quick-start) · [Architecture](#-architecture) · [Project structure](#-project-structure) · [Testing](#-testing) · [Deployment](#-deployment) · [Contributing](#-contributing)

</div>

---

## ✨ Features

Career Ladder serves **two personas** from a single account — an industry **job seeker** and a **student** pursuing higher study — and covers the whole journey from CV to offer/admission.

### For everyone
- **📄 CV upload & AI parsing** — PDF/DOCX → structured profile (skills, experience, education, keywords).
- **🎯 Fit Score** — deterministic, zero-cost CV-to-opportunity keyword match (0–100) with a **Reach / Match / Safe** grouping.
- **✍️ Document generation with self-audit** — SOPs, cover letters, and recommendation letters, each scored for **specificity** and flagged for generic phrasing and unfilled placeholders.
- **🧱 CV Builder + ATS-safe export** — build an enhanced CV and download a clean, single-column plain-text version any Applicant Tracking System can parse.
- **🗂️ Application & admissions tracker** — Saved → Applied → Interview → Offer/Admitted, with funnel stats.
- **💬 Interview prep** — tailored questions with suggested talking points grounded in your CV.
- **🔎 Skill gap analysis** — see what's missing for a target role or program.

### For job seekers
- **Hybrid job matching** — fast keyword search + semantic vector search.
- **Live AI job research** — discover current openings from the web.

### For higher study
- **Academic position discovery** — live PhD/Postdoc/Masters/RA search + a pre-seeded browsable index.
- **🧪 Lab & department insights** — QS ranking, research output, environment, alumni destinations.
- **✉️ Professor outreach** — personalized cold-email drafts referencing a supervisor's research.
- **🎓 Scholarship & funding discovery** — real, current awards matched to your profile.
- **📅 Deadline tracking** — reminders via scheduled jobs.

### Monetization
- **3-tier subscriptions** (Free / Basic / Premium) via **Razorpay**, with **server-side payment-signature verification** before any tier upgrade.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) · React 19 |
| Styling | Tailwind CSS 4 |
| Auth | [NextAuth.js v5](https://authjs.dev/) — Google OAuth + passwordless Email OTP |
| Database | [Snowflake](https://www.snowflake.com/) — app data, vector embeddings (`EMBED_TEXT_768`), AI cache |
| LLM & research | [Perplexity](https://docs.perplexity.ai/) (`sonar-pro`) for parsing, generation & live web research |
| Payments | [Razorpay](https://razorpay.com/) (₹, India) |
| Email | [Resend](https://resend.com/) |
| Testing | [Vitest](https://vitest.dev/) |
| Hosting | [Vercel](https://vercel.com/) |

> **Note:** LLM tasks (CV parsing, document generation, and live research) run on **Perplexity**. **Snowflake** provides persistence, semantic search via vector embeddings, and response caching.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- A **Snowflake** account (with a warehouse/database you can write to)
- API keys for the services you want to enable (see [Environment variables](#-environment-variables))

### Setup

```bash
# 1. Clone and install
git clone https://github.com/mahanteshimath/career-ladder-agent.git
cd career-ladder-agent
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in Snowflake, NextAuth, Google OAuth, Perplexity, Razorpay, and Resend values

# 3. Bootstrap the Snowflake schema (one-time)
npm run bootstrap

# 4. (Optional) Seed sample jobs/positions
npm run seed

# 5. Start the dev server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `SNOWFLAKE_ACCOUNT` | ✅ | Snowflake account identifier |
| `SNOWFLAKE_USER` / `SNOWFLAKE_PASSWORD` | ✅ | Snowflake credentials |
| `SNOWFLAKE_ROLE` / `SNOWFLAKE_WAREHOUSE` | ✅ | Role & compute warehouse |
| `SNOWFLAKE_DATABASE` / `SNOWFLAKE_SCHEMA` | ✅ | Defaults: `CAREER_LADDER` / `PUBLIC` |
| `NEXTAUTH_SECRET` | ✅ | Session encryption secret |
| `NEXTAUTH_URL` | ✅ | App URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| `PERPLEXITY_API_KEY` | ⚙️ | Enables AI parsing, generation & research |
| `PERPLEXITY_MODEL` | ➖ | Override model (default `sonar-pro`) |
| `PERPLEXITY_DAILY_CAP` | ➖ | Global daily request cap (default `50`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | ⚙️ | Enables paid subscriptions |
| `RESEND_API_KEY` | ⚙️ | Enables OTP & notification emails |
| `CRON_SECRET` | ⚙️ | Protects scheduled cron routes |

✅ required · ⚙️ feature degrades gracefully (returns a clear message) if missing · ➖ optional override

---

## 🏗️ Architecture

```
User ──▶ Next.js App Router (Vercel)
           │
           ├── (auth)/        → Login (Google + Email OTP)
           ├── (dashboard)/   → Protected pages (persona-aware nav)
           ├── privacy / terms / support
           └── api/           → Route Handlers
                  │
                  ├── lib/agents/orchestrator.ts   ← central AI router + cache + guardrails
                  │     ├── cv-parser / cv-enhancer
                  │     ├── job-matcher / job-evaluator / job-researcher
                  │     ├── position-researcher / lab-researcher / scholarship-researcher
                  │     ├── sop-writer (SOP · cover letter · LOR · outreach + self-audit)
                  │     ├── interview-coach · skill-analyzer · spam-checker
                  │     │
                  │     ├── lib/perplexity/*        ← LLM & live web research
                  │     └── lib/payments/razorpay   ← secure checkout + signature verify
                  │
                  └── lib/snowflake/*  → connection pool, queries, embeddings, cache
                        └── Snowflake DB (CL_* tables + vector embeddings)
```

**Request flow**
1. **Upload** → text extraction → Perplexity parsing → structured JSON + Snowflake embedding.
2. **Match** → keyword search (fast) + semantic vector search (refined) → hybrid score.
3. **Generate** → CV summary + target context → Perplexity → document + deterministic quality self-audit.
4. **Subscribe** → Razorpay order → checkout → **server-side HMAC-SHA256 signature verification** → tier upgrade.

All AI calls route through the **orchestrator**, which handles routing, Snowflake-based caching (TTL per task), and error recovery.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/login/            # Sign in (Google + Email OTP)
│   ├── (dashboard)/dashboard/   # upload, matches, positions, scholarships,
│   │                            # generate, lor, interview, tracker, cv-builder,
│   │                            # deadlines, shortlist, drafts, evaluate, issues …
│   ├── privacy / terms / support
│   └── api/                     # cv, matches, generate, lor, interview,
│                                # scholarships, positions/*, subscribe/*, research …
├── components/                  # DashboardNav, PricingCards, JobCard, Logo …
├── config/                      # tiers, cv-templates, keyword taxonomy, tracker stages
├── lib/
│   ├── agents/                  # AI agents (see architecture)
│   ├── auth/                    # NextAuth config + OTP
│   ├── payments/razorpay.ts     # plans, signature verification, expiry
│   ├── perplexity/              # LLM client, config, JSON utils, daily cap
│   ├── snowflake/               # client, queries, embeddings, schema
│   └── utils/                   # fit-score, cv-ats-export, dedup, rate-limit …
├── types/                       # Shared TypeScript types
└── __tests__/                   # Vitest suites
scripts/                         # bootstrap + seed
```

---

## 💳 Pricing Tiers

| Tier | Price | Highlights |
|------|-------|-----------|
| **Free** | ₹0 | Common keyword results, view-only, fit-score preview |
| **Basic** | ₹75 / week | 2 CVs, keyword + semantic matching, 14-day saved results |
| **Premium** | ₹499 / month | Unlimited CVs, full document generation, saved history, priority processing |
| **Pro + Mentor** | ₹899 / month _(coming soon)_ | Everything in Premium + human mentor review |

Subscriptions are processed by Razorpay with server-verified payment signatures.

---

## 🧪 Testing

```bash
npm test          # Run the Vitest suite
npm run lint      # ESLint
npx tsc --noEmit  # Type check
npm run build     # Production build
```

The suite covers document self-audit, fit scoring, ATS export, the research/generation agents (mocked), and **payment signature verification** (valid/forged/missing cases).

---

## 🚢 Deployment

The app deploys to **Vercel**. Configure the environment variables above in **Project → Settings → Environment Variables** (Production), then push to `main` to trigger a deploy.

- Feature keys (`PERPLEXITY_API_KEY`, `RAZORPAY_*`, `RESEND_API_KEY`) can be added incrementally — features degrade gracefully with a clear message until their key is present.
- No runtime migrations are required beyond the one-time `npm run bootstrap`.

---

## 🤝 Contributing

Contributions are welcome! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the workflow, coding conventions, and how to run the checks. In short:

1. Fork & branch from `main`.
2. Make your change with tests where it makes sense.
3. Ensure `npm test`, `npm run lint`, and `npm run build` pass.
4. Open a pull request describing the change.

---

## 📜 License

This project is developed as part of an **IIT MTP academic project** and is currently **proprietary**. If you intend to reuse it, please contact the maintainer to agree on licensing terms.

---

<div align="center">
Built with ❤️ for students and job seekers · Powered by Next.js, Snowflake &amp; Perplexity
</div>
