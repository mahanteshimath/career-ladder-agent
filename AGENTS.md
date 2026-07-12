# Career-Ladder-Agent — AI-Powered Career Services Platform

## What is Career-Ladder-Agent

Production-grade AI career services platform built on Next.js 15. It serves **two personas** — job seekers and higher-study applicants — covering CV parsing, job & academic-position matching, fit scoring, document generation (SOP / cover letter / recommendation letter / professor outreach) with a quality self-audit, scholarship discovery, lab insights, interview prep, and an application tracker, behind a 3-tier Razorpay subscription model.

LLM tasks (parsing, generation, live web research) run on **Perplexity** (`sonar-pro`). **Snowflake** provides persistence, vector embeddings for semantic search, and AI response caching.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v5 (Auth.js) with Google + Email |
| Backend | Next.js Route Handlers (serverless on Vercel) |
| Database | Snowflake (app data, vector embeddings, AI cache) |
| AI/LLM | Perplexity (`sonar-pro`) for parsing, generation & live research |
| Embeddings / Search | Snowflake `EMBED_TEXT_768` + vector search |
| Payments | Razorpay (₹ India) |
| File Storage | Snowflake Internal Stage |
| Email | Resend |

## Architecture

```
User → Next.js App Router (Vercel)
         │
         ├── (marketing)/ → Landing, Pricing (public)
         ├── (auth)/      → Login, Register
         ├── (dashboard)/ → Protected pages (CV upload, job match, SOP gen, etc.)
         └── api/         → Route Handlers
                │
                ├── lib/agents/orchestrator.ts → Central AI coordinator
                │     ├── cv-parser.ts / cv-enhancer.ts  → CV parse & enhance (Perplexity)
                │     ├── job-matcher.ts       → Keyword + vector matching
                │     ├── job-evaluator.ts     → Fit/eval report per JD or position
                │     ├── job-researcher.ts    → Live web job search (Perplexity)
                │     ├── position-researcher.ts → Live academic position search
                │     ├── lab-researcher.ts    → Lab/department insights
                │     ├── scholarship-researcher.ts → Live scholarship discovery
                │     ├── sop-writer.ts        → SOP / cover letter / LOR / outreach + self-audit
                │     ├── interview-coach.ts   → Tailored interview questions
                │     ├── skill-analyzer.ts    → Gap analysis
                │     └── spam-checker.ts      → Job-post moderation
                │
                ├── lib/perplexity/client.ts → LLM & live web research
                ├── lib/payments/razorpay.ts → Secure checkout + signature verify
                └── lib/snowflake/client.ts → Connection pool
                      └── Snowflake DB (CL_* tables + vector embeddings)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/snowflake/client.ts` | Snowflake connection pool + session management |
| `src/lib/snowflake/schema.sql` | DDL for all 9 tables + stage |
| `src/lib/agents/orchestrator.ts` | Routes AI tasks, manages caching, guardrails |
| `src/lib/agents/cv-parser.ts` | CV → structured JSON via Cortex |
| `src/lib/agents/job-matcher.ts` | Keyword + semantic matching engine |
| `src/lib/agents/sop-writer.ts` | SOP/cover letter generation |
| `src/lib/perplexity/client.ts` | Perplexity LLM & live-research client |
| `src/lib/payments/razorpay.ts` | Razorpay plans + payment-signature verification |
| `src/lib/utils/fit-score.ts` | Deterministic CV↔opportunity fit scoring |
| `src/lib/auth/config.ts` | NextAuth.js v5 configuration |
| `src/lib/utils/rate-limit.ts` | Tier-based rate limiting |
| `config/keywords.json` | Pre-built keyword taxonomy |
| `config/tiers.ts` | Pricing tier definitions + limits |
| `scripts/bootstrap-snowflake.ts` | Schema creation + initial setup |
| `scripts/seed-jobs-db.ts` | Populate pre-built job/position DB |

## Build & Run

```bash
pnpm install          # Install dependencies
pnpm dev              # Development server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint check
pnpm test             # Run tests (Vitest)
```

## Environment Variables

Required in `.env.local` (see `.env.local.example`):

```
# Snowflake
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USER=
SNOWFLAKE_PASSWORD=
SNOWFLAKE_ROLE=
SNOWFLAKE_WAREHOUSE=
SNOWFLAKE_DATABASE=CAREER_LADDER
SNOWFLAKE_SCHEMA=PUBLIC

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI (Perplexity — parsing, generation, live research)
PERPLEXITY_API_KEY=
# PERPLEXITY_MODEL=sonar-pro        # optional override
# PERPLEXITY_DAILY_CAP=50           # optional global daily cap

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Email
RESEND_API_KEY=

# Cron protection
CRON_SECRET=
```

## Snowflake Data Model

9 tables prefixed `CL_`:

- `CL_USERS` — User accounts + tier + subscription
- `CL_CVS` — Uploaded CVs with parsed JSON + embeddings
- `CL_POSITIONS` — Academic positions (pre-seeded, vectorized)
- `CL_JOBS` — Industry jobs (pre-seeded + user-posted, vectorized)
- `CL_MATCHES` — User ↔ job/position match history with scores
- `CL_DRAFTS` — Generated SOPs, cover letters, CVs
- `CL_AGENT_CACHE` — AI response cache with TTL
- `CL_JOB_POSTS` — External job posts pending verification
- `CL_ISSUES` — User-reported issues
- `CL_USAGE` — Usage tracking for tier limits

## 3-Tier Pricing Model

| Tier | Access | Limits |
|------|--------|--------|
| Free (Level 1) | Common keyword job results only | View-only, no saves |
| Basic (Level 2) | 2 CVs, 7-day access, 3 searches/CV | ₹50-100/week, results expire after 14 days |
| Premium (Level 3) | Full access: CV/SOP/cover letter, saved progress | Monthly subscription |

## Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier enforced
- Imports use `@/` alias for `src/`
- Server components by default; `"use client"` only when needed
- All Snowflake queries use parameterized bindings (SQL injection prevention)
- API routes validate input with Zod schemas

### File Naming
- Components: PascalCase (`JobCard.tsx`)
- Utilities/libs: kebab-case (`cv-parser.ts`)
- Pages: Next.js convention (`page.tsx`, `layout.tsx`)
- API routes: `route.ts` inside folder structure

### AI Agent Patterns
- All AI calls go through `orchestrator.ts` — never call Perplexity directly from routes
- Cache every AI response in `CL_AGENT_CACHE` with appropriate TTL
- Use `EMBED_TEXT_768('e5-base-v2', text)` (Snowflake) for all embedding generation
- Use `callPerplexity()` (model `sonar-pro`) for parsing, generation, and live web research
- Guard runtime-AI routes with `isPerplexityConfigured()` and degrade to a 503 with a clear message
- Deduplication: hash(title + company + location) before insert

### Security
- Never commit `.env.local` or secrets
- All user uploads sanitized (filename timestamp + hash)
- Rate limiting enforced at middleware level per tier
- CORS restricted to deployment domain
- CSP headers configured in `next.config.ts`

## Common Tasks

### Add a new AI agent
1. Create `src/lib/agents/<name>.ts` implementing the agent interface
2. Add routing logic in `orchestrator.ts`
3. Define cache key pattern and TTL
4. Add API route in `src/app/api/` if user-facing

### Add a new dashboard page
1. Create `src/app/(dashboard)/<name>/page.tsx`
2. Add navigation item in dashboard layout
3. Gate access by tier in the page component
4. Add API route if data fetching needed

### Modify Snowflake schema
1. Update `src/lib/snowflake/schema.sql`
2. Update `scripts/bootstrap-snowflake.ts`
3. Add migration logic (Snowflake has no built-in migrations — use versioned SQL)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Snowflake connection timeout | Check warehouse auto-suspend settings, ensure X-SMALL is running |
| AI features return 503 | Set `PERPLEXITY_API_KEY` (and restart) — routes degrade gracefully without it |
| Perplexity returns empty/invalid JSON | The agent retries with a JSON-repair pass; check the daily cap (`PERPLEXITY_DAILY_CAP`) |
| Subscribe shows "payments not enabled" | Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` |
| Vector search slow | Ensure `SEARCH OPTIMIZATION` is enabled on embedding columns |
| Auth callback fails locally | Set `NEXTAUTH_URL=http://localhost:3000` exactly |
| Rate limit false positives | Check `CL_USAGE` table for stale entries; TTL cleanup runs at app start |
