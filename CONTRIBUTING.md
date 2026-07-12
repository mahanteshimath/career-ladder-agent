# Contributing to Career Ladder

Thanks for your interest in improving Career Ladder! This guide covers how to set up, make changes, and get them merged.

## Getting started

1. **Fork** the repository and clone your fork.
2. Install dependencies and configure your environment:
   ```bash
   npm install
   cp .env.local.example .env.local   # then fill in the values
   npm run bootstrap                  # one-time Snowflake schema setup
   npm run dev
   ```
3. Create a branch from `main`:
   ```bash
   git checkout -b feat/short-description
   ```

## Development workflow

- Write focused, minimal changes that address a single concern.
- Add or update **tests** for logic changes (we use [Vitest](https://vitest.dev/)).
- Before opening a PR, make sure all checks pass:
  ```bash
  npm test          # unit/integration tests
  npm run lint      # ESLint
  npx tsc --noEmit  # type check
  npm run build     # production build
  ```

## Coding conventions

- **TypeScript strict mode** — no `any` unless unavoidable and justified.
- Use the `@/` import alias for anything under `src/`.
- **Server components by default**; add `"use client"` only when a component needs browser APIs or hooks.
- **All AI calls go through** `src/lib/agents/orchestrator.ts` — never call Perplexity directly from a route.
- **Validate all route input** with Zod schemas.
- **Parameterize every Snowflake query** (no string interpolation) to prevent SQL injection.
- Guard runtime-AI routes with `isPerplexityConfigured()` and return a graceful `503` when a key is missing.
- Never trust the client for payments — verify Razorpay signatures **server-side** before any tier change.

### File naming
- Components: `PascalCase.tsx`
- Libraries/utilities: `kebab-case.ts`
- Routes: `route.ts` inside the folder structure

## Adding features

**A new AI agent**
1. Create `src/lib/agents/<name>.ts`.
2. Add a task + case in `orchestrator.ts` (the cache-key and TTL builders have safe defaults).
3. Add an API route under `src/app/api/` and a page if user-facing.
4. Add a unit test that mocks `@/lib/perplexity/client`.

**A new dashboard page**
1. Create `src/app/(dashboard)/dashboard/<name>/page.tsx`.
2. Add a nav item in `src/components/DashboardNav.tsx` (scope by persona if needed).

## Commit & PR guidelines

- Write clear, imperative commit messages (e.g. `Add scholarship discovery agent`).
- Keep PRs scoped and describe **what** changed and **why**.
- Do not commit secrets. `.env.local` is git-ignored; use `.env.local.example` for new variables.

## Reporting issues

Found a bug or have a feature idea? Open an issue with steps to reproduce (for bugs) or a short problem statement (for features). In-app, users can also file reports from **Dashboard → Report Issue**.

## Security

Please do **not** open public issues for security vulnerabilities. Instead, contact the maintainer privately so the issue can be addressed before disclosure.
