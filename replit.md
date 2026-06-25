# FocusGuard AI

AI-powered productivity tool that reads Google Calendar events, uses Gemini AI to schedule and enforce focus sessions, and blocks distracting sites at the DNS level via an Android VPN companion app.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild lib declarations (run before leaf typechecks after changing a lib)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `GEMINI_API_KEY` — for real AI scoring (falls back to mock values if missing)
- Optional env: `GOOGLE_ACCESS_TOKEN` — for real Google Calendar (falls back to demo events if missing)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 at `/api` path
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + TanStack Query + wouter
- AI: Google Gemini (`@google/generative-ai`)
- Calendar: Google Calendar API (`googleapis`)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI contract
- `lib/db/src/schema/` — Drizzle schema (`sessions.ts`, `settings.ts`)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/gemini.ts` — Gemini AI integration
- `artifacts/api-server/src/lib/calendar.ts` — Google Calendar integration
- `artifacts/focusguard/src/` — React frontend (pages/, components/, hooks/)
- `android/` — Android Kotlin VPN app source files

## Architecture decisions

- Contract-first: OpenAPI spec generates both React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`) via Orval; server uses zod schemas for validation.
- Graceful degradation: backend serves demo calendar events when no Google token is set, and uses rule-based focus scoring when no Gemini key is set — works fully out of the box.
- JSON stored as TEXT: `blockedSites` and `emergencySites` in `focus_sessions` table are TEXT columns holding JSON strings; parsed in route handlers.
- Android API URL: `BuildConfig.API_BASE_URL` — set to `http://10.0.2.2:5000/api` in debug flavor and `https://YOUR_APP.replit.app/api` in release. Update the production URL after deploying.
- Email as user identity: no auth system; email entered at login is the user identifier throughout.

## Product

- **Dashboard** — live focus session status with countdown timer, stat cards (focus minutes, session count, blocks triggered), and upcoming sessions list.
- **Calendar Intelligence** — shows Google Calendar events with Gemini AI focus scores (1–10) and suggested intensity levels; one-click sync to generate sessions.
- **Sessions** — history of all focus sessions with task completion photo upload and AI verification.
- **Settings** — configure blocked/emergency site lists with tag-style input, default session duration.
- **Android Setup** — step-by-step guide and download instructions for the companion VPN app.

## Gotchas

- After changing any `lib/*` package, run `pnpm run typecheck:libs` before checking leaf artifacts — stale declarations cause false "no exported member" TS errors.
- Never run `pnpm dev` at the workspace root; start individual workflows instead.
- API path prefix is `/api` — all routes must be mounted under that prefix (handled by `artifacts/api-server/src/routes/index.ts`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
