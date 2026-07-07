# TrueLine Master Checklist

Living project roadmap and status document. Update this file after every major feature lands so it always reflects the project's true state — do not let it go stale like `docs/PROJECT_STATE.md` did.

Last updated: 2026-07-07 (durable odds-history recorder added, Phase 2 started)
Baseline: `codex/trueline-rebrand` @ `59b4d79` ("Add AI handoff documentation")
Working branch: `claude/trueline-development`

Validation at time of writing (all passing):
```
npx tsc --noEmit                    -> clean
npm run build                       -> 26 routes compiled
npm test (no DATABASE_URL)          -> 166 pass, 5 skipped (persistence + odds-recorder DB tests)
npm test (with DATABASE_URL)        -> 171/171 passing, verified against a real local Postgres 16 instance
npm run dev (no secrets set)        -> boots fine, logs env issues (dev is lenient)
npm run build && npm start (no secrets set) -> fails to boot with a clear error (production is strict)
npm run build && npm start (admin secrets set) -> full auth flow verified with real Playwright/Chromium
```

---

## 1. Overall Completion Estimate

| Layer | Est. % complete | Confidence |
|---|---:|---|
| Core architecture (provider/service/view-model pattern) | 95% | High — verified by build + tests |
| Data intelligence layer (weather/ballpark/bullpen/lineup/pitcher/team-strength/recent-form/matchup) | 85% | High — live+replay+mock all present, tested |
| Prediction / Ranking / Correlation engines | 80% | High — deterministic V1s complete, not calibrated |
| Betting market products (8 markets) | 70% | Medium — built and ranked, several rely on incomplete prop odds |
| Analytics admin (Calibration / Backtesting / Odds Intelligence) | 42% | Medium — scaffolds + tests exist; Odds Intelligence now has a real recorder writing live odds history (Section 8d), but the engine itself doesn't read it yet, and Calibration/Backtesting still have no durable data flowing in |
| Production infrastructure (auth, persistence, cache, observability) | 38% | High — persistence layer (tested against real Postgres), runtime env validation, admin route auth, and now a live odds-history writer all exist and are verified; still no production cache, no observability |
| **Overall product** | **~61%** | Weighted toward infra being the largest remaining gap |

---

## 2. Fully Completed Systems

Verified via code inspection, `tsc`, build output, and passing tests — not just doc claims.

- [x] Feature-first architecture: `app/ → src/features/ → src/services/ → src/providers/`
- [x] Provider pattern (Live / Replay / Mock) applied consistently across 10 data domains
- [x] In-memory cache abstraction (`src/cache/CacheProvider.ts`, `MemoryCache.ts`)
- [x] Live MLB schedule integration with automatic graceful fallback to mock on failure (`src/services/daily-slate/service.ts`) — the most production-grade path in the app today
- [x] Weather intelligence — Open-Meteo live provider, replay, mock, rating engine, roof-awareness
- [x] Ballpark intelligence — MLB venue metadata + Baseball Savant park factors, live/replay/mock
- [x] Bullpen quality — live relief stats + recent workload, live/replay/mock
- [x] Lineup intelligence — confirmed/projected batting order, live/replay/mock
- [x] Pitcher stats — live season pitching stats, live/replay/mock
- [x] Team strength — live offense/pitching team stats, live/replay/mock
- [x] Recent form — live 7/14/30-game rolling windows, live/replay/mock
- [x] Player intelligence — pitcher & batter game logs, rolling summaries, live/replay/mock
- [x] Matchup intelligence — pitch arsenal, zone overlay, Statcast-based, live/replay/mock
- [x] PredictionEngine V1 — deterministic win probability, fair line, edge, EV, confidence
- [x] RankingEngine V1 — cross-market `BetCandidate` ranking, grades, tiers, explanations
- [x] CorrelationEngine V1 — exposure detection, portfolio generation, conflict warnings
- [x] Betting markets (built + ranked + tested, odds coverage varies): Moneyline, Run Line, Team Totals, Game Totals, Home Runs, Total Bases, Hits, Strikeouts
- [x] Best Bets — aggregates all 8 markets via RankingEngine
- [x] Research pages — Pitcher Research / Strikeout Lab, Hitter Research / Hits Lab, Zone Intelligence (strong); Pitch Intelligence (weaker, see below)
- [x] 160 unit tests across services/providers/engines, all passing
- [x] `docs/` — 40+ documents covering architecture, each engine, each market, providers, standards

---

## 3. Partially Implemented Systems

| System | What exists | What's missing |
|---|---|---|
| Odds (OddsPipe) | Real live HTTP provider, replay, mock, error handling, requires `ODDSPIPE_API_KEY` | Player-prop odds coverage incomplete; no durable rate-limit/backoff strategy documented |
| Calibration Engine | Service, admin dashboard (`/admin/calibration`), tests, mock/replay records | `predictions`/`prediction_results` tables now exist (Section 8) but nothing writes to them yet or reads them into this engine; still not authoritative for live recommendations |
| Backtesting Engine | `BacktestRunner`, `StrategyEvaluator`, `BankrollSimulator`, admin dashboard, tests | Historical slates are mock/replay only; persistence tables exist but this engine doesn't consume them yet |
| Odds Intelligence | `ClosingLineCalculator`, `MarketMovementAnalyzer`, `SteamMoveDetector`, admin dashboard, tests, and now a live recorder writing to `odds_snapshots` (Section 8d) | The engine itself still reads mock/replay data, not yet wired to read from `odds_snapshots`; movement attribution (injury/weather-driven) is limited |
| Pitch Intelligence (`/matchups/pitch-intelligence`) | Route exists | Materially less complete than Zone Intelligence — treat as unfinished |
| Entity research (`/research/players`, `/research/teams`, `/research/ballparks`) | Placeholder routes exist | Not yet searchable/functional entity pages |
| Best Bets filtering/sorting | Static ranked board renders | No interactive filters or sort controls yet |

---

## 4. Not Yet Built (Production Blockers)

Ranked by what actually blocks a real launch:

1. [x] **Authentication & authorization** — done 2026-07-07 (shared-password admin gate, not full user accounts — see Section 8c for why and what's still deferred)
2. [x] **Production persistence layer** — done 2026-07-07. See Section 8 for details.
3. **Live injuries provider** — mock only, no real feed
4. [x] **Durable odds-history recorder** — done 2026-07-07. See Section 8d.
5. **Historical results ingestion** — nothing populates real outcomes for calibration/backtesting to learn from
6. **Production cache adapter** — in-memory cache only, doesn't survive restarts or scale across instances
7. [x] **Runtime env schema validation** — done 2026-07-07. See Section 8b for details.
8. **Observability** — no structured logging, no provider health monitoring, no error tracking
9. **E2E / route smoke tests** — 160 unit tests exist, zero browser-level tests
10. **Global search** — not implemented anywhere
11. **API licensing review** — Baseball Savant / Statcast CSV and Open-Meteo usage haven't been reviewed for production terms

---

## 5. Cleanup / Debt Not Captured in Existing Docs

Found during independent review — not mentioned in `CLAUDE_HANDOFF.md` or `PROJECT_STATE.md`:

- [x] **Delete `src/components/layout/`** (Navbar/Footer/Sidebar/Container) — removed 2026-07-07. Confirmed zero imports before deletion; `tsc`, lint, build (25 routes), and all 160 tests still pass clean.
- [x] **Delete `src/design-system/`** (colors/spacing/typography/shadows/theme tokens) — removed 2026-07-07 alongside `layout/`. Same verification as above.
- [x] Legacy `/team/*` routes — `/team/moneyline` already redirected to `/betting/moneyline`; `/team/team-total` and `/team/game-total` now redirect to `/betting/team-totals` and `/betting/game-totals` respectively (were rendering a stale "Coming Soon" placeholder even though those markets were fully built). Fixed 2026-07-07. Also removed the now-fully-unused `game-total`, `home-runs`, `moneyline`, `team-total`, and `zone-intelligence` entries from `src/features/coming-soon/service.ts` — those markets/pages are real now, so the placeholder copy was dead data.
- [ ] `docs/PROJECT_STATE.md` is self-acknowledged stale — either refresh it or deprecate it in favor of this file.
- [ ] Duplicate market-card/candidate-normalization patterns across market feature folders — real but low urgency; don't refactor broadly without a specific trigger.
- [ ] PR #5 targets `test-codex-auth`, not `main` — needs a decision on final merge path before this branch's work lands anywhere permanent.

---

## 6. Recommended Build Order (Dependency-Aware)

Work roughly top-to-bottom; items within a phase can interleave.

**Phase 0 — Hygiene (do first, no dependencies, near-zero risk)**
1. [x] Delete dead `layout/` and `design-system/` code — done 2026-07-07
2. [x] Add `.env.example` documenting every provider mode/key currently read from `process.env` — done 2026-07-07 (56 vars across 14 domains, grouped by provider with defaults/fallback chains noted); also fixed `.gitignore`'s `.env*` rule so it doesn't swallow the example file
3. [x] Remove or redirect legacy `/team/*` routes — done 2026-07-07
4. Resolve PR #5 merge-target question (this branch → `main`) — deferred, merge strategy TBD later per owner instruction

**Phase 1 — Foundation for everything else**
5. [x] Production persistence layer — done 2026-07-07 (see Section 8)
6. [x] Runtime env validation + secret-presence checks for live-mode providers — done 2026-07-07 (see Section 8b)
7. [x] Auth + admin route protection — done 2026-07-07 (see Section 8c)

**Phase 2 — Make the data real**
8. [x] Durable odds-history recorder — done 2026-07-07 (see Section 8d)
9. Historical results ingestion pipeline (depends on #5)
10. Live injuries provider

**Phase 3 — Make the analytics trustworthy**
11. Calibration powered by real results (depends on #9)
12. Backtesting powered by real historical slates (depends on #9)
13. Odds Intelligence CLV/movement backed by durable history (depends on #8)

**Phase 4 — Production readiness**
14. Production cache adapter (Redis/Vercel KV/Cloudflare KV) replacing `MemoryCache`
15. Structured logging + provider health observability
16. E2E/route smoke test suite
17. API licensing review (Statcast, Open-Meteo)

**Phase 5 — Product completion**
18. Complete Pitch Intelligence to match Zone Intelligence depth
19. Entity research pages (players/teams/ballparks) made real and searchable
20. Best Bets interactive filtering/sorting
21. Global search
22. Live player-prop odds coverage expansion

---

## 8. Persistence Layer (added 2026-07-07)

Location: `src/persistence/`. Postgres via Drizzle ORM (`drizzle-orm` + `postgres` driver) — chosen over Prisma to match the project's "deliberately minimal stack" principle from `CLAUDE_HANDOFF.md` (no generated client/engine binary, thin and typed).

- `schema.ts` — three tables, each mirroring an existing domain contract field-for-field so consuming engines won't need to reshape data:
  - `predictions` — mirrors `RecordedPrediction` (`src/services/calibration/types.ts`)
  - `prediction_results` — mirrors `PredictionResultRecord` (same file)
  - `odds_snapshots` — mirrors `NormalizedOddsRecord` (`src/providers/odds/OddsProvider.ts`) plus a `capturedAt` timestamp, so the same odds record can have many rows over time (this is what a durable odds-history recorder — Phase 2 item — will write to)
- `client.ts` — lazy singleton Postgres connection via `getDb()`, driven entirely by `DATABASE_URL`. Throws clearly if unset, matching the project's "fail clearly" provider convention.
- `repositories/` — one repository per table (`PredictionsRepository`, `PredictionResultsRepository`, `OddsSnapshotsRepository`) with basic record/find methods. Deliberately **not** wired into the Calibration/Backtesting/Odds Intelligence engines yet — that's Phase 3's job, once each engine's read/write patterns are worked out on top of this foundation.
- Migrations: `drizzle.config.ts` + `drizzle/` (generated SQL). Run `npm run db:generate` after schema changes, `npm run db:migrate` to apply.

Verified for real, not just type-checked: ran migrations against a local Postgres 16 instance, and `tests/persistence.test.ts` round-trips all three repositories through it (163/163 tests pass with `DATABASE_URL` set; the 3 persistence tests skip cleanly via `node:test`'s `skip` option when it's unset, so default `npm test` still needs no database).

**Known gotcha for future work in this directory**: the test suite runs on Node's native `--experimental-strip-types`, which is syntax-stripping only — it does **not** support TypeScript parameter-property shorthand (`constructor(private readonly x = ...)`), even though several existing service classes elsewhere in the codebase use that pattern (they just happen to never be directly instantiated by a test). Any class in `src/persistence/` that a test constructs directly needs an explicit field + constructor body assignment instead. Also: all relative imports need explicit `.ts` extensions (Node's ESM resolver doesn't infer them) — this matches the convention already used everywhere else in `src/`.

**Not yet done, deliberately out of scope for this item**: connecting this to any engine, migrating against a real hosted Postgres (Neon/Supabase/Vercel Postgres — currently only proven against local Postgres).

---

## 8b. Runtime Environment Validation (added 2026-07-07)

Location: `src/config/env.ts` + `instrumentation.ts` (project root).

- `src/config/env.ts` reuses each of the 14 provider domains' own `getXxxMode()` function (exported for this purpose — previously private to their service files, zero behavior change) so mode resolution — including each domain's fallback cascade to sibling domains — is never duplicated. For every domain resolved to `"live"`, it checks for that domain's required secrets. Today that's exactly one: `ODDSPIPE_API_KEY` for odds — confirmed by inspection that it's the only live provider that hard-throws on a missing key (Open-Meteo, MLB Stats API, and Statcast CSV are keyless public endpoints). Also flags `DATABASE_URL` as a warning (not error) since nothing consumes it yet.
- `instrumentation.ts` calls this once via Next's `register()` hook on server boot. Behavior is deliberately asymmetric by environment: **logs all issues but only throws when `NODE_ENV === "production"`** — local dev keeps working out of the box against mock/live-fallback data with zero config (matching the rest of the app's graceful-degradation philosophy), while a real production boot fails fast instead of silently serving a page that 500s on first request.

Verified for real, not just type-checked:
- `npm run dev` with no secrets set: booted fine, logged `[env:error] odds: ODDSPIPE_API_KEY is not set...` and `[env:warning] persistence: DATABASE_URL is not set...`, server stayed up.
- `npm run build` then `npm run start` (production) with no secrets set: logged the same issues, then **failed to boot** with `Error: An error occurred while loading instrumentation hook: Environment validation failed with 1 error(s)` — proving the fail-fast path actually blocks a broken production server rather than just being unreachable code.

**Considered and rejected**: a standalone `npm run env:check` CLI script for CI use, independent of booting Next. Rejected because running it under Node's native `--experimental-strip-types` (the same runner `npm test` uses) requires importing the service files that hold each `getXxxMode()` function, and several of those files (e.g. `OddsService.ts`) use TypeScript parameter-property constructor shorthand — unsupported in strip-only mode (the same gotcha recorded in Section 8). Fixing that would mean refactoring class constructors across ~14 files with no other motivation, which is out of scope here. The `instrumentation.ts` hook already delivers the actual goal (fail fast in production) since it runs inside Next's own bundler, which has no such limitation.

---

## 8c. Auth + Admin Route Protection (added 2026-07-07)

**Scope decision**: shared-password gate for `/admin/*` only, not full user accounts. TrueLine has no subscribers, no public sign-up, and no user model anywhere in the product today — building NextAuth/user-accounts now would be solving a problem that doesn't exist yet. The actual, current risk was narrow: three diagnostic dashboards (`/admin/backtesting`, `/admin/calibration`, `/admin/odds-intelligence`) reachable by anyone on the internet with zero protection. This closes that gap; real user/subscriber accounts are a separate, later product decision (see roadmap item 18, "Subscription/account architecture").

**Framework note**: this Next.js fork renames `middleware.ts` to `proxy.ts` (`export function proxy` + `export const config = { matcher }`), confirmed by reading `node_modules/next/dist/docs/.../proxy.md` before writing this — same file conventions, new name, and it defaults to the Node.js runtime (not Edge) as of this version.

Implementation, two layers of defense-in-depth (the proxy docs explicitly warn not to rely on proxy alone, since a future matcher change could silently remove coverage):

- `proxy.ts` (project root) — matches `/admin/:path*`, checks a signed session cookie, redirects to `/admin/login?from=<path>` if missing/invalid. Runs before any rendering.
- `app/admin/(protected)/layout.tsx` — a route-group layout wrapping the three admin pages (moved into `(protected)/` — the parens exclude it from the URL, so routes are unchanged) that re-checks the same session server-side and `redirect()`s if invalid. Also renders a "Log out" button. `app/admin/login/page.tsx` deliberately sits *outside* this group so the login form itself isn't gated (would otherwise be an infinite redirect loop).
- `src/auth/session.ts` — signed session tokens (`expiresAt.HMAC-SHA256signature`, `AUTH_SECRET`-keyed, 12h TTL, `timingSafeEqual` comparison, `node:crypto` — no new dependency). Considered and rejected Next's experimental `unauthorized()`/`forbidden()` primitives (require enabling `experimental.authInterrupts`) in favor of this plus plain, stable `redirect()` — didn't want an experimental flag underpinning a security feature.
- `src/auth/actions.ts` — `loginAdmin`/`logoutAdmin` Server Actions. Password compared against `ADMIN_PASSWORD`; on match, sets an `httpOnly`, `sameSite: lax` cookie (`secure` in production).
- `ADMIN_PASSWORD` / `AUTH_SECRET` added to `.env.example` and to `src/config/env.ts` as a warning-level check (not boot-blocking): missing either fails **closed** (admin permanently unreachable — logins can never match, sessions can never validate) rather than open, so it's safe to leave unset, just non-functional.

Verified for real with a real browser (Playwright/Chromium against a genuine `npm run build && npm start`), not just type-checked: unauthenticated request → redirected to login with `from` preserved; wrong password → error shown, no cookie; correct password → `httpOnly` session cookie set, redirected to the originally-requested page; reload with session → page loads, shows Log out; click Log out → cookie cleared, redirected to login; subsequent request → redirected to login again. All three admin routes individually confirmed to redirect when unauthenticated.

**Not yet done, deliberately out of scope**: real user accounts, roles/permissions beyond a single shared admin gate, password rotation/hashing (it's one shared plaintext-in-env password, not per-user credentials — acceptable for a single-operator admin gate, not for multi-user auth).

---

## 8d. Durable Odds-History Recorder (added 2026-07-07)

Location: `src/services/OddsSnapshotRecorder.ts`, wired into `src/services/OddsService.ts`.

- `recordOddsSnapshot(response)` is called from `OddsService.getOdds()` right after every cache-miss fetch (so it runs at most once per odds cache TTL window, ~60s — no extra rate-limiting needed, the existing cache already provides it). Only persists when `response.mode === "live"`: mock and replay data is synthetic and would just pollute real market history with fake rows.
- Writes through the `OddsSnapshotsRepository` built in Section 8, so every live odds fetch adds a new row per record to `odds_snapshots` rather than overwriting — that's what lets closing-line-value and steam-move detection reconstruct movement over time later.
- Deliberately a standalone module, not a method on `OddsService` itself: `OddsService`'s constructor uses TypeScript parameter-property shorthand (like several other service classes — the Section 8 gotcha), so keeping the recorder in its own plain-function file kept it directly unit-testable under Node's native test runner without touching `OddsService`'s existing style.
- Never throws: wrapped in try/catch, logs and swallows any persistence error so a database hiccup can never break odds serving to the dashboard. Also no-ops immediately if `DATABASE_URL` isn't set, rather than letting the repository's constructor throw.

Verified for real: `tests/odds-snapshot-recorder.test.ts` (3 tests) confirms non-live responses are never persisted, live responses actually land in `odds_snapshots` via a real Postgres round-trip, and the whole thing resolves cleanly with no `DATABASE_URL` at all. Full suite: 166 pass / 5 skip without `DATABASE_URL`, 171/171 with it pointed at the same local Postgres 16 instance used in Section 8.

**Not yet done, deliberately out of scope**: nothing yet reads from `odds_snapshots` — `OddsIntelligenceService` (`ClosingLineCalculator`, `MarketMovementAnalyzer`, `SteamMoveDetector`) still runs on mock/replay data. Wiring that engine to read real history is the next checklist item (Phase 3: "Odds Intelligence CLV/movement backed by durable history").

---

## 9. Update Protocol

After every major feature or milestone:
1. Move the item from its section (3/4/6) into Section 2 with a `[x]`.
2. Re-run `npx tsc --noEmit`, `npm run build`, `npm test` and update the validation block at the top.
3. Adjust the completion percentages in Section 1 if the change is significant.
4. Note any new debt discovered in Section 5 rather than letting it go unrecorded.
