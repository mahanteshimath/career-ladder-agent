# Career-Ladder-Agent — AI-Powered Career Services Platform

## What is Career-Ladder-Agent

Production-grade AI career services startup built on Next.js 15 + Snowflake Cortex. Provides CV-driven job matching, SOP/cover letter generation, CV building, and academic position discovery with a 3-tier subscription model.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v5 (Auth.js) with Google + Email |
| Backend | Next.js Route Handlers (serverless on Vercel) |
| Database | Snowflake (Cortex enabled) |
| AI/LLM | Snowflake Cortex (`COMPLETE`, `EMBED_TEXT_768`) |
| Payments | Razorpay (India) / Stripe |
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
                │     ├── cv-parser.ts        → Cortex COMPLETE() for CV parsing
                │     ├── job-matcher.ts      → Keyword + vector matching
                │     ├── sop-writer.ts       → SOP/Cover letter via Cortex
                │     └── skill-analyzer.ts   → Gap analysis
                │
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

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Email
RESEND_API_KEY=
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
- All AI calls go through `orchestrator.ts` — never call Cortex directly from routes
- Cache every AI response in `CL_AGENT_CACHE` with appropriate TTL
- Use `EMBED_TEXT_768('e5-base-v2', text)` for all embedding generation
- Use `SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', prompt)` for generation tasks
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
| Cortex COMPLETE returns empty | Verify warehouse has Cortex access enabled in account |
| Vector search slow | Ensure `SEARCH OPTIMIZATION` is enabled on embedding columns |
| Auth callback fails locally | Set `NEXTAUTH_URL=http://localhost:3000` exactly |
| Rate limit false positives | Check `CL_USAGE` table for stale entries; TTL cleanup runs at app start |
