# Career Ladder Agent

AI-powered career services platform — CV matching, SOP generation, skill gap analysis, and academic position discovery.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (serverless on Vercel) |
| Database | Snowflake (CAREER_LADDER database) |
| AI | Snowflake Cortex (`COMPLETE()`, `EMBED_TEXT_768()`) |
| Auth | NextAuth.js v5 (Google OAuth + Email) |
| Payments | Razorpay (₹ India market) |
| Deployment | Vercel |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.local.example .env.local
# Fill in your Snowflake credentials, Google OAuth keys, etc.

# 3. Bootstrap Snowflake schema (one-time)
npx tsx scripts/bootstrap-snowflake.ts

# 4. Seed sample data (optional)
npx tsx scripts/seed-jobs-db.ts

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Landing page, pricing
│   ├── (auth)/             # Login page
│   ├── (dashboard)/        # Protected dashboard pages
│   │   └── dashboard/
│   │       ├── upload/     # CV upload
│   │       ├── matches/    # Job matches
│   │       ├── drafts/     # SOP/Cover letter drafts
│   │       └── skills/     # Skill gap analysis
│   └── api/                # API routes
│       ├── auth/           # NextAuth handlers
│       ├── cv/upload/      # CV upload + parse
│       ├── matches/        # Job matching
│       └── generate/       # SOP/Cover letter generation
├── components/             # React components
├── config/                 # Tier pricing, keyword taxonomy
├── lib/
│   ├── agents/             # AI agent modules
│   │   ├── orchestrator.ts # Central routing + caching
│   │   ├── cv-parser.ts    # CV → structured JSON
│   │   ├── job-matcher.ts  # Keyword + semantic matching
│   │   ├── sop-writer.ts   # SOP/Cover letter generation
│   │   └── skill-analyzer.ts # Gap analysis
│   ├── auth/               # NextAuth configuration
│   ├── snowflake/          # DB client, queries, embeddings
│   └── utils/              # File extraction, dedup, rate-limit
├── types/                  # TypeScript type definitions
scripts/
├── bootstrap-snowflake.ts  # One-time schema setup
└── seed-jobs-db.ts         # Sample data seeding
```

## 3-Tier Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free (Level 1) | ₹0 | Keyword results only, view-only, 3 searches/week |
| Basic (Level 2) | ₹50-100/week | 2 CVs, keyword+semantic matching, 14-day saved results |
| Premium (Level 3) | ₹499/month | Unlimited CVs, SOP/Cover letter gen, skill analysis, saved history |

## Key Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

## Architecture

1. **Upload CV** → PDF/DOCX text extraction → Cortex AI parsing → structured JSON + vector embedding stored in Snowflake
2. **Match** → Keyword search (fast, <30s) + Semantic vector search (refined) → Hybrid score → Results stored
3. **Generate** → CV summary + target context → Cortex COMPLETE() → SOP/Cover letter → Draft saved
4. **Skill Analysis** → CV skills vs job requirements → Gap analysis with recommendations

All AI calls route through the **orchestrator** which handles caching (Snowflake-based), rate limiting (tier-gated), and error recovery.

## Environment Variables

See `.env.local.example` for all required variables.

## License

Private — IIT MTP Project
