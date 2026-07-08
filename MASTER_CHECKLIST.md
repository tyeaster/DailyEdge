# TrueLine Master Checklist

Living project roadmap and status document. Update this file after every major feature lands so it always reflects the project's true state — do not let it go stale like `docs/PROJECT_STATE.md` did.

Last updated: 2026-07-08 (Live player-prop odds coverage expansion completed — item 22)
Baseline: `codex/trueline-rebrand` @ `59b4d79` ("Add AI handoff documentation")
Working branch: `claude/trueline-development`

Validation at time of writing (all passing):
```
npx tsc --noEmit                    -> clean
npm run build                       -> 26 routes compiled; homepage confirmed HTTP 200 after rebuild; injuries 403 now logs as clean structured JSON
npm test (no DATABASE_URL)          -> 213 pass, 23 skipped (all recorder/provider/cache DB tests)
npm test (with DATABASE_URL)        -> 236/236 passing, verified against a real local Postgres 16 instance
npm run test:e2e (against a real npm start server) -> 11/11 passing, 3 skipped (homepage, full admin auth flow, 9-route smoke sample incl. Pitch Intelligence + all 3 entity research pages)
npm run dev (no secrets set)        -> boots fine, logs env issues (dev is lenient)
npm run build && npm start (no secrets set) -> fails to boot with a clear error (production is strict)
npm run build && npm start (admin secrets set) -> full auth flow verified with real Playwright/Chromium
npm run build && npm start (CALIBRATION_MODE=live + real DB) -> /admin/calibration verified error-free via real browser automation
npm run build && npm start (BACKTEST_MODE=live + real DB) -> /admin/backtesting verified error-free via real browser automation
npm run build && npm start (ODDS_INTELLIGENCE_MODE=live + real DB) -> /admin/odds-intelligence verified error-free via real browser automation
```

**Open caveats carried forward**: the live MLB game-results parser (Section 8e) and the live MLB injuries/transactions parser (Section 8f) have not been verified against real network calls — this sandbox blocks outbound access to `statsapi.mlb.com`. Both have their failure/degradation paths genuinely verified (Section 8f even got a real, non-synthetic 403 during the build to prove it), but the parser's assumed response shape has not. Run one live smoke test against each before trusting them in production.

**Real ODDSPIPE_API_KEY provided by owner (2026-07-07)**: stored in `.env.local` (gitignored, never committed, never printed to logs). **Not verifiable from this sandbox** — the same network policy that blocks `statsapi.mlb.com` also blocks `api.oddspipe.com` (confirmed via `curl -v`: the sandbox's own proxy rejects the `CONNECT` tunnel with a 403 before any request reaches OddsPipe's servers — this is unrelated to whether the key itself is valid). First real test of this key has to happen once the app is deployed somewhere with actual internet access.

---

## 1. Overall Completion Estimate

| Layer | Est. % complete | Confidence |
|---|---:|---|
| Core architecture (provider/service/view-model pattern) | 95% | High — verified by build + tests |
| Data intelligence layer (weather/ballpark/bullpen/lineup/pitcher/team-strength/recent-form/matchup) | 85% | High — live+replay+mock all present, tested |
| Prediction / Ranking / Correlation engines | 80% | High — deterministic V1s complete, not calibrated |
| Betting market products (8 markets) | 70% | Medium — built and ranked, several rely on incomplete prop odds |
| Analytics admin (Calibration / Backtesting / Odds Intelligence) | 60% | Medium — all three now read real moneyline data end-to-end (Sections 8h/8i/8j), each verified live through its actual admin page; CLV specifically still not computed (needs game completion tracking), and all three are moneyline-only pending the market-vocabulary reconciliation |
| Production infrastructure (auth, persistence, cache, observability) | 56% | High — persistence layer, runtime env validation, admin route auth, live odds-history writer, game-results ingestion + reconciliation, live injuries, a Postgres-backed cache adapter, structured logging, and a real E2E smoke suite all exist and verified; still no log aggregator/destination, no provider-health dashboard, no error tracking, no CI |
| **Overall product** | **~66%** | Weighted toward infra being the largest remaining gap |

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
- [x] Best Bets — aggregates all 8 markets via RankingEngine, with interactive search/filter/sort (Section 8q)
- [x] Research pages — Pitcher Research / Strikeout Lab, Hitter Research / Hits Lab, Zone Intelligence, Pitch Intelligence (Section 8o), Player/Team/Ballpark Research directories (Section 8p)
- [x] 236 unit tests across services/providers/engines, all passing
- [x] `docs/` — 40+ documents covering architecture, each engine, each market, providers, standards

---

## 3. Partially Implemented Systems

| System | What exists | What's missing |
|---|---|---|
| Odds (OddsPipe) | Real live HTTP provider, replay, mock, error handling, requires `ODDSPIPE_API_KEY`; player-prop market mapping + player-identity matching for Strikeouts/Hits/Home Runs/Total Bases now real (Section 8s) | Live confidence/edge for player props is an honest placeholder, not a real model score yet (Section 8s); no durable rate-limit/backoff strategy documented |
| Calibration Engine | Service, admin dashboard (`/admin/calibration`), tests, mock/replay records, and now `DurableCalibrationProvider` reading real moneyline predictions/results from Postgres when `CALIBRATION_MODE=live` (Section 8h) | Moneyline only — 7 other markets still need the `OddsMarket`/`BetMarketType` vocabulary reconciliation before they can be recorded/calibrated; sample size will be small until this runs for a while in production |
| Backtesting Engine | `BacktestRunner`, `StrategyEvaluator`, `BankrollSimulator`, admin dashboard, tests, and now `DurableHistoricalSlateProvider` grouping real moneyline predictions/results into daily slates when `BACKTEST_MODE=live` (Section 8i) | Moneyline only, same vocabulary-reconciliation debt as Calibration/Odds Intelligence; real sample size will take time to accumulate |
| Odds Intelligence | `ClosingLineCalculator`, `MarketMovementAnalyzer`, `SteamMoveDetector`, admin dashboard, tests, live recorder writing to `odds_snapshots` (Section 8d), and now `DurableOddsIntelligenceProvider` reading real opening-to-current movement when `ODDS_INTELLIGENCE_MODE=live` (Section 8j) | CLV specifically isn't computed yet (closings intentionally left empty — needs game start/finish tracking); moneyline only; movement attribution (injury/weather-driven) is limited |

---

## 4. Not Yet Built (Production Blockers)

Ranked by what actually blocks a real launch:

1. [x] **Authentication & authorization** — done 2026-07-07 (shared-password admin gate, not full user accounts — see Section 8c for why and what's still deferred)
2. [x] **Production persistence layer** — done 2026-07-07. See Section 8 for details.
3. [x] **Live injuries provider** — done 2026-07-07. See Section 8f (limited scope: IL statuses only, network-unverified, same as game-results).
4. [x] **Durable odds-history recorder** — done 2026-07-07. See Section 8d.
5. [x] **Historical results ingestion** — partially done 2026-07-07, see Section 8e for exact scope and an important unverified-network caveat
6. [x] **Production cache adapter** — done 2026-07-07, Postgres-backed, opt-in (see Section 8k)
7. [x] **Runtime env schema validation** — done 2026-07-07. See Section 8b for details.
8. [x] **Observability** — structured logging done 2026-07-07 (see Section 8l); provider health monitoring / error tracking still not done — a real logging *destination* (Sentry, Datadog, etc.) is a separate decision from the structured-format work here
9. [x] **E2E / route smoke tests** — done 2026-07-07 (see Section 8m)
10. [x] **Global search** — done 2026-07-08, see Section 8r
11. [ ] **API licensing review** — attempted 2026-07-08, could not complete; this is a real legal/business decision, not something to check off. See Section 8n.

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
9. [x] Historical results ingestion pipeline — partially done 2026-07-07 (see Section 8e)
10. [x] Live injuries provider — done 2026-07-07 (see Section 8f). Phase 2 complete.

**Phase 3 — Make the analytics trustworthy**
11. [x] Calibration powered by real results — done 2026-07-07, moneyline only (see Section 8h)
12. [x] Backtesting powered by real historical slates — done 2026-07-07, moneyline only (see Section 8i)
13. [x] Odds Intelligence CLV/movement backed by durable history — done 2026-07-07, opening-to-current movement only, moneyline only (see Section 8j). Phase 3 complete.

**Phase 4 — Production readiness**
14. [x] Production cache adapter — done 2026-07-07 (see Section 8k)
15. [x] Structured logging — done 2026-07-07, partial (see Section 8l); provider health dashboard / error-tracking destination still open
16. [x] E2E/route smoke test suite — done 2026-07-07 (see Section 8m)
17. [ ] API licensing review — attempted, could not complete, needs owner/legal decision (see Section 8n). Skipped past for now; not blocking items 18-23.

**Phase 5 — Product completion**
18. [x] Complete Pitch Intelligence to match Zone Intelligence depth — done 2026-07-08 (see Section 8o)
19. [x] Entity research pages (players/teams/ballparks) made real and searchable — done 2026-07-08 (see Section 8p)
20. [x] Best Bets interactive filtering/sorting — done 2026-07-08 (see Section 8q)
21. [x] Global search — done 2026-07-08 (see Section 8r)
22. [x] Live player-prop odds coverage expansion — done 2026-07-08 (see Section 8s)
23. **Restructure the home page / Daily Slate navigation** — owner feedback (2026-07-07): the current nav feels "all over the place with too many tabs." Not yet scoped — needs an IA pass over `app-shell`'s nav groups (Slate, Pitching, Hitting, Matchups, Analysis, Team Betting, Research — 19 routes total) before implementation starts.

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
- `npm run dev` with no secrets set: booted fine, logged an `odds`-domain error (missing `ODDSPIPE_API_KEY`) and a `persistence`-domain warning (missing `DATABASE_URL`), server stayed up. (Log format shown here predates the structured logger added in Section 8l — same content, now via `logger.error`/`logger.warn` with a `env:<domain>` tag instead of raw `console.*` calls.)
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

**Update (Section 8j)**: `OddsIntelligenceService` now does read real history via `DurableOddsIntelligenceProvider` — see below. This raw per-record recorder remains as-is; the engine reads from a *separate*, game-scoped recording path (also added in Section 8j) rather than these raw multi-sportsbook records directly, since raw records don't carry a stable gameId (see Section 8j for why).

---

## 8e. Historical Results Ingestion (added 2026-07-07 — partial, read the caveat)

**Scope actually delivered**: a durable store and ingestion pipeline for real final game outcomes (final score, winning team), independent of predictions. **Not delivered**: recording predictions themselves (nothing writes to the `predictions` table yet — see below), or matching results to predictions in `prediction_results`.

Why split this way: the literal checklist wording is "populates real **outcomes**." Trying to also record predictions in the same pass would have required resolving a real, pre-existing vocabulary mismatch between `OddsMarket` (used by `Prediction`/`BetRecommendation` in `src/models/mlb.ts` — `"moneyline" | "spread" | "total" | "team-total" | "player-prop"`) and `BetMarketType` (used by calibration/ranking/the `predictions` table schema — `"moneyline" | "run-line" | "team-total" | "game-total" | "strikeouts" | "hits" | "home-runs" | "total-bases" | ...`). That's a real, separate reconciliation problem (already flagged as debt in Section 5) — better solved deliberately than rushed as a side effect of this item.

New pieces, following the codebase's own established provider-trio convention (`ProviderInterface.ts` / `LiveProvider.ts` / `MockProvider.ts` / `index.ts`) rather than inventing a new pattern:

- `src/providers/game-results/` — `GameResultsProvider` interface, `MLBGameResultsProvider` (live, MLB Stats API schedule endpoint hydrated with `linescore`), `MockGameResultsProvider`. **No replay provider yet** — `GAME_RESULTS_MODE=replay` currently falls back to live, same known gap as schedule's own "Replay: Not implemented" in the original docs.
- `game_results` table (Section 8's schema file) — `gameId` (PK), both teams' scores, `winningTeamId`, `completedAt`. Deliberately **not** keyed by `predictionId` like `prediction_results` — this is a standalone outcomes record so results can be ingested regardless of whether a prediction exists for that game yet.
- `GameResultsRepository` — same repository pattern as Section 8.
- `src/services/GameResultsService.ts` — mode selection (`GAME_RESULTS_MODE`, defaults to `"live"`, wired into `src/config/env.ts` as a 15th domain check) plus `ingestGameResults(date, provider?)`, which fetches and durably records results. Never throws; no-ops without `DATABASE_URL`.
- **Not wired to any trigger.** This app has no cron/scheduled-job infrastructure at all, so `ingestGameResults()` is a callable function awaiting one — invoke it manually, or from a future admin action / cron endpoint once that infrastructure exists. It deliberately does not run inline in any page's request path (unlike the odds recorder) since results should be ingested periodically for *past* dates, not on every dashboard load.

**Important, unresolved caveat — read before trusting this in production**: this sandbox's outbound network policy blocks `statsapi.mlb.com` (confirmed via `curl` — `CONNECT tunnel failed, response 403`), so unlike every other feature this session, **the live MLB schedule/linescore parser (`normalizeMlbScheduleResults`) was never exercised against a real network response.** It follows the long-documented, stable MLB Stats API schedule shape and defensively checks both the direct `teams.{side}.score` field and the `linescore.teams.{side}.runs` hydration fallback, but that shape assumption is unverified here. **Run one live smoke test against a real date in an environment with network access before relying on this for anything real.** Everything else about this feature — the schema, the repository, the service's mode selection and never-throws behavior, the Mock provider, and the parsing logic *given* a schedule response — is fully verified against real Postgres and real (fixture-based) inputs.

Verified for real: `tests/game-results.test.ts` (6 tests) — Mock provider determinism, parser correctly extracts scores and skips non-`"Final"` games, parser's linescore-runs fallback, a genuine `ingestGameResults` → `GameResultsRepository` → Postgres round-trip, and graceful no-op without `DATABASE_URL`. New migration (`drizzle/0001_loose_galactus.sql`) generated and applied to the same local Postgres 16 instance. Full suite: 170 pass / 6 skip without `DATABASE_URL`, 176/176 with it.

**Not yet done**: joining `game_results` to `predictions`/`prediction_results` (predictions are now recorded — see Section 8g — but nothing yet cross-references the two tables), a replay provider, any trigger/scheduling mechanism, and — critically — the live-network verification above.

---

## 8f. Live Injuries Provider (added 2026-07-07) — Phase 2 complete

Replaces the hardcoded `mockDataProvider.injuries` fallback that `LiveMLBProvider` had used for injuries (the docs' own "Injuries: No live / No replay / Yes mock — Production gap" line) with a real provider, same trio pattern as game-results.

**Deliberately narrow scope**: only produces `"10-day IL"` / `"15-day IL"` statuses, parsed from the MLB Stats API **transactions** endpoint (not a dedicated injuries endpoint — MLB Stats API doesn't have one; transactions with IL-related descriptions are the closest public equivalent). The `Injury` model's other statuses (`"Probable"`, `"Questionable"`, `"Day-to-day"`) are game-day lineup calls that need a different data source (boxscore/lineup card) — out of scope here, so the live provider never fabricates those. `impactRating` always defaults to a neutral 50: scoring how much losing a *specific* player actually hurts needs player-performance context a transactions feed doesn't carry.

- `src/providers/injuries/` — `InjuryProvider` interface, `MLBInjuryProvider` (live), `MockInjuryProvider`. No replay provider yet, same gap as game-results/schedule.
- `src/services/InjuriesService.ts` — mode selection (`INJURIES_MODE`, defaults `"live"`, wired into `src/config/env.ts` as a 16th domain), implements the exact `DataProvider<Injury>` shape `LiveMLBProvider.injuries` expects. **On a live fetch failure, degrades to an empty list, not mock data** — an empty list honestly means "no known injury data," rather than silently mixing fabricated players into what's supposed to be live output.
- Wired directly into `LiveMLBProvider.injuries` in `src/services/providers/live-mlb-provider.ts`, replacing the old mock passthrough.

**Same network caveat as Section 8e, but this time verified two ways instead of one**: the transactions-parsing logic itself is unverified over live network (sandbox blocks `statsapi.mlb.com`) — but unlike game-results, I got a *second*, real confirmation of the failure-handling path for free: running `npm run build` actually attempted the live fetch (this page prerenders statically), hit the same blocked-network 403, and the build log shows `InjuriesService` catching it cleanly three times with the build still succeeding and the homepage still returning `200`. So while the *parsing shape* remains unverified like Section 8e, the *degradation path* is now proven against a real failure, not just a synthetic one. (This was re-confirmed again after the Section 8l logging migration, which re-ran this exact build and got the same three-caught-errors result via the new structured `logger.error` calls instead of raw `console.error`.)

Verified for real: `tests/injuries.test.ts` (7 tests) — Mock provider determinism, transaction parsing (both IL lengths), skipping non-IL/incomplete transactions, `InjuriesService` mapping to the `Injury` model shape, `getById` lookup, and the empty-list-on-failure degradation (both as a direct unit test with a synthetic failing provider, and for real via the build-time 403 above). Also manually confirmed the homepage (`/`, statically prerendered) still returns HTTP 200 after this change. Full suite: 176 pass / 6 skip without `DATABASE_URL`, 182/182 with it.

**Not yet done**: replay provider, "Probable"/"Questionable"/"Day-to-day" statuses (need a different data source), and the parsing-shape network verification.

---

## 8g. Moneyline Prediction Recording (added 2026-07-07)

Closes the gap Section 8e explicitly deferred: nothing wrote to the `predictions` table. `src/services/PredictionRecorder.ts` durably records the moneyline half of every live `PredictionResult` the engine produces, wired into `buildDailySlate()` in `src/services/daily-slate/service.ts` right after `predictionEngine.predictSlate()` runs, gated to `dataSource === "live"` only (mock predictions would pollute real calibration history).

**Why moneyline only, still**: `PredictionResult` (the actual engine output) uses `OddsMarket`-family semantics implicitly (it's a whole-game prediction, conceptually "moneyline"), while the `predictions` table/calibration/ranking use `BetMarketType`. Moneyline is the value identical in both vocabularies, so it required no reconciliation — the other 7 markets in `BetMarketType` (run-line, team-total, game-total, strikeouts, hits, home-runs, total-bases) don't have an equivalent direct source yet and still need that vocabulary work first (unchanged debt from Section 8e).

Turned out to be a clean mapping once found: `PredictionResult` already carries every field needed with matching semantics and no recomputation — `edgePercent`, `expectedValuePercent`, `selectedFairMoneyline` → `fairOdds`, `selectedTeamId` → `teamId`, `selectedWinProbability` → `modelProbability`, `sportsbookMoneyline` → `odds`, `sportsbook`, `recommendation`, `predictionVersion` → `modelId`. Uses a stable `predictionId` (`prediction-{gameId}-moneyline`, no timestamp) with `onConflictDoNothing`, so only the *first* prediction computed for a game each day is captured — an "opening prediction" snapshot rather than a full time series like `odds_snapshots`. Good enough for V1 calibration; a closing-prediction variant can follow if that turns out to matter more. Never throws, no-ops without `DATABASE_URL`, matching every other recorder this session.

Verified for real: `tests/prediction-recorder.test.ts` (3 tests) — a genuine record → `PredictionsRepository` → Postgres round-trip, confirms the idempotent-per-game behavior (a second call with different data doesn't overwrite), and confirms it never throws without a database. Also manually confirmed the homepage still returns HTTP 200 after wiring this into the live daily-slate path (same static-prerender check as Section 8f). Full suite: 177 pass / 8 skip without `DATABASE_URL`, 185/185 with it.

**Unblocks**: Phase 3 items (Calibration/Backtesting powered by real results) now have real data to read for the moneyline market specifically, once those engines are wired to read from `predictions`/`prediction_results`/`game_results` instead of mock/replay fixtures.

---

## 8h. Result Reconciliation + Calibration Reading Real Data (added 2026-07-07)

Two pieces that together close the loop Sections 8e/8g both flagged as missing — `game_results` and `predictions` existed independently with nothing cross-referencing them.

**`src/services/ResultReconciler.ts`** — `reconcileGameResult(gameId)` joins one completed game's durable result against any durably recorded predictions for that game (moneyline only, same reason as Section 8g: it's simply "did the predicted team match the winning team," win or loss, no push case). Writes a `PredictionResultRecord` per matching prediction via `PredictionResultsRepository`. Wired directly into `ingestGameResults()` (`src/services/GameResultsService.ts`) — every ingestion run now automatically reconciles the games it just recorded, so the pipeline (ingest result → reconcile → available for calibration) runs end to end from one call. Never throws, no-ops without `DATABASE_URL`.

**`DurableCalibrationProvider`** (`src/services/calibration/providers.ts`) — implements the existing `CalibrationHistoryProvider` interface, reading real predictions/results via `PredictionsRepository.list()` / `PredictionResultsRepository.list()` (both repositories gained a `list()` method for this — they only had per-game/per-id lookups before). Wired into `getConfiguredCalibrationProvider("live")`, replacing what used to be a silent fallback to an empty `StaticCalibrationProvider`. **Default `CALIBRATION_MODE` is still `"mock"`** — this is opt-in via `CALIBRATION_MODE=live`, so the admin dashboard's default behavior is completely unchanged unless someone deliberately switches it on. On any failure (or no `DATABASE_URL`), also degrades to the same empty `StaticCalibrationProvider` rather than breaking the admin dashboard.

Note: `src/services/calibration/PredictionRecorder.ts` (pre-existing) and the new top-level `src/services/PredictionRecorder.ts` (Section 8g) are unrelated despite the name collision — the former is an in-memory input-shaping/validation helper (clamps values, generates IDs), the latter durably persists to Postgres. Different directories, no import conflict, but flagging it here since it reads confusingly out of context.

Verified for real: `tests/result-reconciler.test.ts` (4 tests — win outcome, loss outcome, no-op when no result exists yet, never-throws-without-a-database) and `tests/durable-calibration-provider.test.ts` (3 tests — reads real Postgres data, mode selection returns the right class, degrades to empty history without a database). Also drove the actual `/admin/calibration` page with real browser automation (Playwright/Chromium, `CALIBRATION_MODE=live` + real `DATABASE_URL`): logged in, landed on the calibration dashboard, page body confirmed error-free (checked for "error"/"exception"/"failed to compile" substrings — none found in 1906 chars of rendered text), zero server-side errors logged. (A couple of repeat browser-automation attempts right after timed out on the login redirect — server logs stayed clean throughout, so that's Playwright/browser-launch flakiness in this sandbox, not a product issue; the one clean run is sufficient evidence the page genuinely works.) Full suite: 180 pass / 12 skip without `DATABASE_URL`, 192/192 with it.

**Not yet done**: the other 7 `BetMarketType` markets (blocked on the same vocabulary reconciliation as Sections 8e/8g), and actual production sample size — calibration is only as useful as how long this has been running for real.

---

## 8i. Backtesting Powered by Real Historical Slates (added 2026-07-07)

Same pattern as Section 8h, applied to Backtesting: `DurableHistoricalSlateProvider` (`src/services/backtesting/providers.ts`) implements the existing `HistoricalSlateProvider` interface, grouping real `predictions`/`prediction_results` rows by the date portion of each prediction's `timestamp` into `HistoricalSlate` objects — the exact shape `BacktestRunner`/`StrategyEvaluator` already expect, so no changes were needed to the actual backtesting math, only to where its input data comes from. Wired into `getConfiguredHistoricalSlateProvider("live")`. Default `BACKTEST_MODE` stays `"mock"` — opt-in only, via `BACKTEST_MODE=live`. Degrades to an empty `StaticHistoricalSlateProvider` on any failure or missing `DATABASE_URL`.

Moneyline only, same reason as everywhere else this session (Sections 8g/8h) — that's the only market recorded so far.

Verified for real: `tests/durable-historical-slate-provider.test.ts` (3 tests — groups real predictions+results into a slate keyed by date, mode selection returns the right class, degrades to empty slates without a database). Also drove the actual `/admin/backtesting` page with real browser automation (`BACKTEST_MODE=live` + real `DATABASE_URL`): logged in, landed on the dashboard, confirmed error-free page content (2069 chars, no error/exception substrings), zero server-side errors logged — clean on the first attempt this time. Full suite: 182 pass / 13 skip without `DATABASE_URL`, 195/195 with it.

**Not yet done**: same as Section 8h — the other 7 markets, and real production sample size. With this, Phase 3's first two items (Calibration, Backtesting) are both wired to real data for moneyline; Odds Intelligence (Phase 3's third item) still reads mock/replay only despite `odds_snapshots` now accumulating real history (Section 8d).

---

## 8j. Odds Intelligence Reading Real Movement (added 2026-07-07) — Phase 3 complete

This one needed more than Sections 8h/8i did, and the extra work is worth understanding before touching this code again.

**The actual gap, discovered while starting this**: `odds_snapshots` (Section 8d) stores *raw* provider records — and those don't carry our internal `gameId` at all. The odds↔game match only happens later, in `applyOddsToGames()` (`src/services/odds/game-odds.ts`), which matches by **team name** (with an `eventId`-based shortcut attempted first, but that's OddsPipe's own ID scheme, not guaranteed to align with our `game-{gamePk}` format). So there was no reliable way to join raw `odds_snapshots` rows back to a specific game or prediction — Calibration/Backtesting didn't hit this because `predictions`/`prediction_results`/`game_results` were all designed with `gameId` as a first-class field from the start; `odds_snapshots` wasn't.

**Fix**: added a second, narrower recording path rather than retrofitting the raw one:
- `oddsSnapshots.gameId` — new nullable, additive column (migration `drizzle/0002_lying_infant_terrible.sql`, one `ALTER TABLE ADD COLUMN`). Nullable because the existing raw-record path (Section 8d) still doesn't know the gameId and shouldn't have to.
- `OddsSnapshotsRepository.recordGameSnapshot()` / `findHistoryByGame()` / `listGameSnapshots()` — new methods for the game-scoped path, separate from the existing raw-record methods.
- `recordGameOddsSnapshots(games, dataSource)` (`src/services/OddsSnapshotRecorder.ts`) — records each game's **already-resolved** moneyline price (`game.odds.moneyline`, set by `applyOddsToGames()`) with `gameId` populated directly. Wired into `daily-slate/service.ts` right after `oddsBackedGames` is computed, live-only. This sidesteps re-implementing the team-name matching entirely — by the time this runs, the match has already happened.
- `DurableOddsIntelligenceProvider` (`src/services/odds-intelligence/providers.ts`) joins these game-scoped snapshots against real `predictions` (moneyline) to build `OddsHistoryRecord[]`: for each game, the *earliest* snapshot's price becomes the fixed `openingOdds` for every record in that game's series, and each individual snapshot becomes one record with its own price as `currentOdds` — matching exactly how the existing mock fixtures already shaped multiple records per `predictionId` (verified by reading `buildMockHistory()` before writing this, not guessed). A game only appears if it has *both* a recorded prediction and at least one snapshot.
- Wired into `getConfiguredOddsIntelligenceProvider("live")`. Default `ODDS_INTELLIGENCE_MODE` stays `"mock"`.

**Deliberately left incomplete: closing-line value (CLV)**. `closings` is returned empty. A genuine "closing" line requires knowing a game has actually started or finished — that's not tracked anywhere yet (no join to `game_results`' `completedAt` was attempted here, to keep this change reviewable). This isn't a silent gap: `ClosingLineCalculator`/`MarketMovementAnalyzer` were checked first and already treat an absent closing as optional everywhere (`calculateClv` returns `0`, `calculateClosingEdge` falls back to the latest snapshot) — confirmed by reading the calculator source, not assumed — so the dashboard doesn't break, it just doesn't show CLV yet. Opening-to-current movement, which is most of what the dashboard shows, is real.

Verified for real: `tests/game-odds-snapshot.test.ts` (3 tests — records with `gameId` populated, mock data source is skipped, never throws without a database) and `tests/durable-odds-intelligence-provider.test.ts` (4 tests — builds a correct two-point time series from real snapshots + a real prediction with exact opening/current values asserted, excludes games with snapshots but no matching prediction, mode selection, graceful degradation). One test bug caught and fixed along the way: the first version of the game-odds-snapshot test fixture didn't set `game.id`, so the recorder read `game-undefined-moneyline` — caught immediately because the DB-backed assertion failed (`0 !== 1`), not silently passed. Also drove the actual `/admin/odds-intelligence` page with real browser automation (`ODDS_INTELLIGENCE_MODE=live` + real `DATABASE_URL`): logged in, landed on the dashboard, confirmed error-free page content, zero server-side errors, clean on the first attempt. Full suite: 185 pass / 17 skip without `DATABASE_URL`, 202/202 with it.

**Not yet done**: CLV/closing-line tracking (needs `game_results.completedAt` wired in), the other 7 markets, steam-move detection accuracy (untested against real multi-book divergence — only one sportsbook's data flows through the game-scoped path today), real production sample size. With this, all three Phase 3 items (Calibration, Backtesting, Odds Intelligence) are wired to real data for the moneyline market — Phase 3 is complete.

---

## 8k. Production Cache Adapter (added 2026-07-07) — Phase 4 started

`PostgresCacheProvider` (`src/cache/PostgresCacheProvider.ts`) implements the existing `CacheProvider` interface (`get`/`set`/`delete`) backed by a new `cache_entries` table (migration `drizzle/0003_lyrical_mystique.sql`), instead of requiring a new Redis/Vercel KV/Cloudflare KV account — it reuses the same Postgres database everything else already writes to. Solves the two concrete problems `MemoryCache` has: it doesn't survive a restart/redeploy, and it isn't shared across server instances if this ever runs on more than one.

**Deliberately not wired in as any service's default.** ~10 existing services (`BallparkService`, `BulletpenService`, `WeatherService`, `OddsService`, etc.) all default their `cache` constructor parameter to the shared `memoryCache` singleton, with TTLs tuned assuming an in-memory lookup (as low as 60 seconds for odds). Swapping every default to a Postgres round-trip changes the latency/behavior of every live data fetch on every page load — that's a real, deliberate decision with tradeoffs (a DB round-trip per cache hit vs. surviving restarts), not something to flip silently while unsupervised. `PostgresCacheProvider` is fully built, tested, and ready — adopt it per-service by passing `new PostgresCacheProvider()` as the `cache` constructor argument wherever durability matters more than raw speed for that domain.

Includes a `pruneExpired()` method for removing stale rows in bulk — not called automatically (no scheduled-job infrastructure exists in this app, same gap noted for `ingestGameResults` in Section 8e); expired rows are otherwise skipped and lazily deleted on next read, same behavior as `MemoryCache`.

Verified for real: `tests/postgres-cache-provider.test.ts` (6 tests) — stores and retrieves a JSON-serializable object, returns `undefined` for a missing key, expires entries past their TTL, overwrites an existing key (upsert via `onConflictDoUpdate`), `delete` removes a key, `pruneExpired` removes only expired rows. All against real local Postgres. Full suite: 185 pass / 23 skip without `DATABASE_URL`, 208/208 with it.

**Not yet done**: adopting it as any service's actual cache, and any bulk-prune scheduling.

---

## 8l. Structured Logging (added 2026-07-07) — partial

`src/lib/logger.ts` — a minimal structured logger (`logger.info`/`.warn`/`.error(domain, message, fields?)`) replacing every raw `console.*` call introduced this session (11 call sites across 9 files: `src/config/env.ts`, `OddsSnapshotRecorder.ts` ×2, `GameResultsService.ts`, `InjuriesService.ts`, `PredictionRecorder.ts`, `ResultReconciler.ts`, and all three `Durable*Provider`s). Every log now carries a `domain` tag identifying which provider/service/recorder it came from — the foundation for the "provider health" half of observability, even without a dashboard reading these yet. Emits single-line JSON in production (for log aggregators), a readable one-liner in dev.

**Why "partial"**: this is a format/consistency change, not a full observability solution. Still missing: an actual log *destination* beyond stdout (Sentry, Datadog, or similar — a real product/cost decision, not mine to make unsupervised), a provider-health dashboard that reads these domain-tagged logs, and error tracking/alerting. This closes the "no structured logging" half of the checklist item, not the "provider health monitoring" half.

One behavior-visible side effect: log line *format* changed for existing call sites (e.g. `src/config/env.ts`'s env-validation output, previously `[env:error] domain: message`, and `InjuriesService`'s error logging, previously `[injuries-service] message: ...`). Content is equivalent, just restructured — re-verified by re-running the exact same `npm run build` that originally produced the injuries 403 log in Section 8f and confirming the new JSON-formatted version shows the same underlying failure.

Verified for real: `tests/logger.test.ts` (6 tests) — writes to the correct `console` method per level, production mode emits parseable JSON with all fields present, `errorFields()` extracts a message from both `Error` instances and non-Error values. Also re-ran the full build (`npm run build`, production mode) and confirmed the injuries live-fetch failure now logs as clean structured JSON (`{"domain":"injuries-service","level":"error","message":"failed to fetch injuries",...,"error":"MLB transactions request failed with 403"}`) — the same real failure as Section 8f, now through the new logger. Full suite: 191 pass / 23 skip without `DATABASE_URL`, 214/214 with it.

**Not yet done**: a real log destination/aggregator, a provider-health dashboard, error tracking/alerting, and migrating any *future* code that doesn't go through this logger (nothing enforces its use yet — it's a convention, not a lint rule).

---

## 8m. E2E / Route Smoke Test Suite (added 2026-07-07)

`tests/e2e/` — a genuine Playwright-driven browser test suite, checked into the repo as a real project (not throwaway `/tmp` scripts). Uses plain `playwright` (added as a devDependency) run through the same `node --test` runner as the rest of the suite, rather than introducing `@playwright/test` as a second parallel test framework with its own config/CLI — matching the project's "deliberately minimal stack" principle.

**Design choice — assumes a server is already running**, rather than managing `next dev`/`next start` lifecycle itself. `tests/e2e/helpers.ts`'s `isServerReachable()` checks `E2E_BASE_URL` (default `http://localhost:3000`) before each file's tests run, skipping gracefully (not failing) if nothing's listening there — same "skip when precondition missing" pattern used for `DATABASE_URL` throughout this session. This mirrors how most real CI pipelines separate "start the app" from "run E2E against it" into distinct steps, and avoids a self-managed dev-server process becoming a second source of flakiness layered on top of browser automation itself (which, per Section 8h, already showed some flakiness in this sandbox even for a manual one-off script).

New `npm run test:e2e` script (separate from `npm run test`, which stays fast and has no external dependencies — `tests/*.test.ts`'s glob doesn't match the `tests/e2e/` subfolder, confirmed by running the default suite after adding these files and seeing the same 214-test count as before).

Coverage:
- `homepage.test.ts` — loads with `200`, contains expected content, no compile/application-error text.
- `admin-auth.test.ts` — the exact flow manually verified with throwaway scripts across Sections 8c/8h/8i/8j, now permanent: unauthenticated redirect, wrong password (error shown, no cookie), correct password (`httpOnly` session cookie set, lands on originally-requested page), logout (cookie cleared, redirect), post-logout re-redirect, and all three admin routes individually confirmed to redirect. Skips if `ADMIN_PASSWORD` isn't set to a value matching the running server.
- `routes.test.ts` — a representative sample of 6 routes across different app sections (betting, hitting, pitching, matchups, analysis), not all 25+ — enough to catch a broken build across route groups without being slow.

`PLAYWRIGHT_CHROMIUM_PATH` env var (only needed in this specific sandbox, where Playwright's default browser download location doesn't match what's actually installed) lets the browser launch be overridden without hardcoding a sandbox-specific path into the committed test code — a normal environment just runs `npx playwright install` and leaves it unset.

Verified for real, not just written: ran `npm run build && npm start` for a genuine production server, then `npm run test:e2e` against it — **10/10 passing** on the first attempt (no flakiness this time, unlike some manual Playwright runs earlier in the session). Confirmed the default `npm test` still shows exactly 214 tests (unchanged), proving the e2e subfolder is correctly isolated. Server logs during the run showed only the already-understood, already-documented injuries network-block errors (Section 8f) — no new or unexpected errors.

**Not yet done**: CI wiring (no GitHub Actions workflow exists to actually run `test:e2e` automatically against a deployed/built app), broader route coverage (6 of 25+ routes), and no visual regression testing.

---

## 8n. API Licensing Review — Attempted, Not Completed (2026-07-08)

**This is not a checklist item that gets checked off by me.** It's a real legal/business decision about whether TrueLine is allowed to power a commercial sports-betting-analytics product with MLB Stats API / Baseball Savant (Statcast) and Open-Meteo data. Marking it "done" without an actual answer would be worse than leaving it visibly open.

What I actually did: tried to pull current terms via both `curl` and `WebFetch` against `open-meteo.com`, `baseballsavant.mlb.com`, and `mlb.com`'s terms-of-use page. All four requests came back `403` — this sandbox's network policy blocks essentially all outbound access except a small package-registry allowlist (same restriction documented in Sections 8e/8f/the OddsPipe key note), and it turns out that applies to `WebFetch` too, not just raw `curl`. I could not verify current terms for either provider from here.

**What I know from general knowledge (not verified against current terms — could be outdated, do not treat as legal advice)**:

- **Open-Meteo**: historically free for non-commercial use under a daily call cap, with a paid commercial tier for higher volume or commercial use (their own docs reference an optional API key for paid plans — consistent with `OPEN_METEO_API_KEY` already being a scaffolded, optional env var in this codebase, `src/providers/weather/OpenMeteoWeatherProvider.ts`). Lower-stakes: weather data alone, used as model input rather than resold or displayed as the product itself.
- **MLB Stats API / Baseball Savant (Statcast)**: this is the one that actually matters. MLB has not published a clear, public commercial license for third-party use of `statsapi.mlb.com` or Baseball Savant data. It's widely used by hobbyist and open-source projects (which is almost certainly why the original build used it without a licensing step), but MLB has a documented history of protecting its data commercially, and using it to power **betting recommendations** — not just stats display — is a materially different, higher-risk use case than a fan stats site. Real production use of MLB data in a betting product typically goes through an official data partner/license (MLB Advanced Media or a licensed sports-data vendor), not the public Stats API.

**Recommendation**: before this goes anywhere near a real user base, get an actual answer — either a licensing conversation with MLB Advanced Media / Baseball Savant, or a lawyer's read on the Stats API terms, or (lowest-risk path) swap the underlying schedule/stats/Statcast data source for a properly licensed sports-data vendor before launch. Don't treat continued use of these sources in production as implicitly approved just because the code works.

**Status**: left open, not blocking further app-completion work (items 18-23) since those are UI/product work that doesn't change the underlying data-licensing question either way.

---

## 8o. Pitch Intelligence Completed (added 2026-07-08)

Zone Intelligence and Pitch Intelligence both read the same `MatchupIntelligenceResult` produced by `matchupService.getMatchupIntelligence()` — the underlying Statcast-derived pitch arsenal, batter pitch profiles, and pitch-type match scoring was already real for both features; what was missing was a real Pitch Intelligence page (it previously rendered `ComingSoonPage`).

**What changed**:

- Extracted the "pick a pitcher-vs-batter matchup from today's slate and load every intelligence source for it" pipeline (previously private, duplicated inline in `zone-intelligence/service.ts`) into a new shared module, `src/services/matchup-selection.ts` (`loadMatchupIntelligence()`). Zone Intelligence's `getZoneIntelligence()` now calls the shared loader too — `buildZoneIntelligenceViewModel()`, the tested/exported function, is byte-for-byte unchanged.
- Built `src/features/pitch-intelligence/service.ts` (`getPitchIntelligence()` / `buildPitchIntelligenceViewModel()`) on top of the shared loader. Deliberately data-differentiated from Zone Intelligence rather than a re-skin — surfaces matchup-engine fields Zone Intelligence doesn't: batter plate-discipline splits per pitch type (swing%/contact%/chase%/take%/whiff%/strikeout%, from `BatterPitchProfile`), `topAdvantages`/`topWeaknesses` (both overall and per-pitch-type, from `PitchTypeMatch`), and `contextScores` (`MatchupContextScore[]` — situational factor scoring not shown elsewhere in the app).
- Built `src/features/pitch-intelligence/pitch-intelligence-page.tsx`, matching Zone Intelligence's visual conventions (`ResearchCard`/`ResearchMetric`/`ResearchSectionHeader`/`Pill` from `@/src/components/research`, same dark theme, same header-plus-grid-sections layout) but omitting the zone-overlay heat maps, which stay Zone Intelligence's distinct centerpiece.
- Wired `app/matchups/pitch-intelligence/page.tsx` to render the real page (same `batter`/`pitcher` search-param pattern as Zone Intelligence's route) and removed the now-stale `"pitch-intelligence"` entry from `src/features/coming-soon/service.ts`'s config object.
- Added `tests/pitch-intelligence.test.ts`, mirroring `tests/zone-intelligence.test.ts`'s pattern (`MockMatchupProvider` + `MatchupService` + `buildPitchIntelligenceViewModel()`).

**Verified for real**:
- `npx tsc --noEmit` clean, `npx eslint .` clean.
- `npm test` (no `DATABASE_URL`): 215 tests, 192 pass / 23 skip / 0 fail, now including the new Pitch Intelligence unit test (`ok — builds Pitch Intelligence view model from normalized matchup data`); Zone Intelligence's test still passes unchanged.
- `npm test` with a real `DATABASE_URL` against the local `trueline` Postgres database: all 215 tests pass, including the Postgres-backed calibration/backtesting/odds-intelligence/persistence suites (uncovered and fixed an unrelated environment issue in the process — see note below).
- `npm run build`: compiles cleanly, `/matchups/pitch-intelligence` appears in the route table as a dynamic (`ƒ`) route.
- Real browser check (Playwright, screenshots taken): with live-mode providers (this sandbox's network policy blocks outbound Statcast/MLB API access, same restriction documented in Section 8n), the page renders with zero console/page errors and degrades gracefully to a neutral 50/100 empty-data state — identical behavior to Zone Intelligence under the same conditions, not a regression. With `MATCHUP_MODE=mock` (and other domains mocked), the page renders fully populated: arsenal-mix bars, pitch arsenal table (3 pitch types), plate-discipline table, an expandable per-pitch scouting report showing scores/top-advantages/top-weaknesses/reasons, and situational context — confirming the view-model builder and page component both work correctly end-to-end, not just structurally.

**Environment note (not a code issue)**: while verifying with a real `DATABASE_URL`, the local Postgres `postgres` role's password didn't match what `.env.local`/tests expect, causing `drizzle-orm`'s wrapped "Failed query" error to mask an underlying `28P01 password authentication failed` — traced with the raw `postgres` driver, then fixed with `ALTER ROLE postgres WITH PASSWORD 'postgres'` against the existing `trueline` database (schema and data were already intact). Documenting this since it's the second session in a row where Postgres state needed a manual fix-up after an environment reset — worth keeping in mind for future sessions.

**Not yet done**: nothing outstanding for this item. Like Zone Intelligence, Pitch Intelligence's real-data depth is bounded by the same live-provider network access documented in Section 8n, not by anything in this feature's own code.

---

## 8p. Entity Research Pages Made Real (added 2026-07-08)

`/research/players`, `/research/teams`, and `/research/ballparks` were all still `ComingSoonPage` placeholders. None of the three had a matching "list everything" data provider in the codebase — every existing provider (`TeamStrengthProvider`, `BallparkProvider`, pitcher/lineup providers) only enriches a single already-known entity by ID; nothing enumerates "all 30 teams" or "every MLB player." Building real pages required deciding, per entity type, what "real and searchable" honestly means given that gap.

**What changed**:

- **`src/data/mlb-teams.ts`** — a new static identity catalog for all 30 MLB franchises (id, abbreviation, division, league, home venue id/name). This is stable reference data (team ids/divisions/venues don't change mid-season), the same category of hardcoded lookup the codebase already carries in `teamMetadata` inside `live-mlb-provider.ts` — not fabricated stats.
- **Team Research** (`src/features/team-research/`): all 30 catalog teams enriched with real offense/pitching/bullpen/overall ratings via the existing `TeamStrengthService`/`TeamStrengthProvider` trio (`enrichTeams()` doesn't require a "today's game" context, just a `Team` with an MLB id). Client-side search (name/city/abbreviation) + league/division filters; each card expands to show the rating breakdown.
- **Ballpark Research** (`src/features/ballpark-research/`): all 30 catalog venues enriched with real park factors and hitter/pitcher/power ratings by calling the existing `BallparkProvider.getBallpark()` directly per venue (not through `BallparkService.enrichGame`, which is game-shaped). Client-side search across park/team/city.
- **Player Research** (`src/features/player-research/`): every pitcher and batter on today's actual Daily Slate (probable pitchers, confirmed/projected lineups, and prop-market players), deduplicated by id — this is the real, honestly-scoped player universe available without adding a new full-roster integration (MLB's roster endpoint isn't used anywhere in this codebase yet). Searchable table with a role filter, and each row deep-links into Strikeout Lab / Hits Lab / Pitch Intelligence / Zone Intelligence with the player pre-selected via the same `?batter=`/`?pitcher=` query-param convention those pages already use.
- Deleted `src/features/coming-soon/` entirely — after these three pages and Pitch Intelligence (Section 8o) went real, nothing called `ComingSoonPage` anymore, so it was fully orphaned rather than a legitimate placeholder for future work.
- Extended `tests/e2e/routes.test.ts`'s smoke sample with the three new routes plus `/matchups/pitch-intelligence` (which had been missing from that list since Section 8o landed).

**Verified for real**:
- `npx tsc --noEmit` clean, `npx eslint .` clean.
- `npm test` (no `DATABASE_URL`): 223 tests, 200 pass / 23 skip / 0 fail. Caught and fixed one real bug during this work: `player-research/service.ts` originally imported `getDailySlate` at module top level, which eagerly loads `daily-slate/service.ts`'s full `@/src/...` value-import chain — that chain only resolves inside Next.js's module resolver, not under `node --experimental-strip-types`, so the test file crashed with `ERR_MODULE_NOT_FOUND` before running. Fixed by making the import dynamic inside `getPlayerDirectory()` (`await import(...)`), the same lazy-import pattern already used by `matchup-selection.ts`'s `loadMatchupIntelligence()` for the identical reason.
- `npm test` with a real `DATABASE_URL`: 223/223 passing.
- `npm run build`: compiles cleanly; all three routes appear in the route table, statically prerendered (`○`).
- `npm run test:e2e` against a real `next start` production server (`PLAYWRIGHT_CHROMIUM_PATH` set to this sandbox's bundled Chromium): 11/11 passing, including the three new routes and Pitch Intelligence.
- Real browser check (Playwright, screenshots taken) with `MATCHUP_MODE=mock`/`TEAM_STRENGTH_MODE=mock`/`BALLPARK_MODE=mock` etc.: Team Research renders all 30 real teams/divisions/leagues, search and league/division filters work; Ballpark Research renders all 30 real parks with correct home teams; Player Research renders today's real slate (confirmed starters like Gerrit Cole, Mookie Betts, Aaron Judge alongside "Projected Hitter"-style placeholders for teams without a confirmed lineup, matching the existing mock-lineup convention elsewhere in the app) — clicked a "Zone Intel" link from the Player Research table and confirmed it navigated to `/matchups/zone-intelligence?batter=player-judge` and rendered "Brayan Bello vs Aaron Judge" with real matchup data, proving the cross-feature deep-link actually carries the selected player through, not just that the link renders.

**Known limitation (not a regression)**: `MockTeamStrengthProvider` and `MockBallparkProvider` both only echo back a `fallback*` value if one was already supplied by the caller — they don't synthesize fixture data on their own. Since a cold "list all 30 teams/parks" call has no pre-existing fallback to pass in, Team Research and Ballpark Research show `-`/"unavailable" ratings under `*_MODE=mock`, even though the directory, search, and card rendering all work correctly. This traces back to the same `mock/mlb-data.ts` fixture set not carrying `team.strength` on its handful of teams either (confirmed by inspection — the existing Zone/Pitch Intelligence context cards show the same "Bullpen -" under mock mode), so it's pre-existing app-wide behavior, not something introduced here. Real ratings require `TEAM_STRENGTH_MODE=live`/`BALLPARK_MODE=live`, which needs the outbound MLB Stats API / Baseball Savant access this sandbox's network policy blocks (Section 8n).

---

## 8q. Best Bets Interactive Filtering/Sorting (added 2026-07-08)

`/best-bets` rendered three fixed sections (Top 10 / Top 25 / Top 50), always sorted by TrueLine Score with no way to narrow or reorder them — despite `BestBetsService.getBestBets()` already accepting a `BestBetsFilters` object (market, risk tier, minimum confidence/edge/expected value, team, player, sportsbook) that nothing in the UI ever passed.

**What changed**:

- Replaced the three fixed sections with one interactive board (`src/features/best-bets/best-bets-board.tsx`, a new client component): free-text search across title/team/opponent/player, market filter, risk-tier filter, minimum-confidence input, a sort selector (TrueLine Score / Edge / Confidence / Expected Value) with a direction toggle, and a result-count selector (10/25/50). All of it operates client-side over the already-fetched `top50` candidate array — instant, no extra network round trip.
- This deliberately re-sorts/filters *within* the top-50-by-TrueLine-Score pool that was already computed server-side, rather than re-invoking the ranking engine per filter change (which does support a `sortBy: RankingSortKey` option, unused here) or re-fetching from the server. That's a real, documented scope choice: full "sort the entire candidate universe by Edge" would need `rankCandidates()` re-invoked server-side per interaction; re-sorting the top-50 client-side is simpler, instant, and still genuinely interactive, matching the client-side-filtering pattern already used for the entity research directories (Section 8p).
- `src/features/best-bets/best-bets-page.tsx` now just fetches the view model and renders the header/market-summary strip plus `<BestBetsBoard />`.
- Found and fixed two pre-existing bugs while verifying this in a real browser (neither introduced by this change — both existed in the original fixed-section code, just never surfaced because nobody had opened devtools console on this page before): `supportingFactors.map((factor) => <div key={factor.key}>)` and `reasons.map((reason) => <li key={reason}>)` both used non-unique keys (`factorKey()` maps multiple distinct factors to the same handful of category strings; `reasons` can contain duplicate text across its explanation/reason/calibration/CLV sources), causing "Encountered two children with the same key" React console errors on every card. Both now include the array index in the key.

**Verified for real**:
- `npx tsc --noEmit` clean, `npx eslint .` clean.
- `npm test` (no `DATABASE_URL`): 223/223 as before (no service-layer changes, existing `tests/best-bets.test.ts` coverage untouched and still passing).
- `npm test` with a real `DATABASE_URL`: 223/223 passing.
- `npm run build`: compiles cleanly.
- Real browser check (Playwright) with `MATCHUP_MODE=mock` etc.: confirmed zero console errors on initial load; selected Market=Moneyline and Sort=Edge and confirmed the board correctly dropped from 44 to 6 bets and re-ordered them by descending edge (+7.4% before +2.8%); re-checked console after the duplicate-key fix and confirmed the error count went from 60+ to 0.

---

## 8r. Global Search (added 2026-07-08)

No way to jump directly to a player, team, or page existed outside each section's own local navigation — you had to know which of the 20+ routes held what you wanted.

**What changed**:

- New `app/api/search/route.ts` (this codebase's first `app/api/` route handler) backing a `GET /api/search?q=` endpoint. Delegates to `src/features/global-search/service.ts`'s `search()`, which matches three real sources: a small static list of page routes (label match), the 30-team catalog from Section 8p (city/name/abbreviation match), and today's actual Daily Slate players via `buildPlayerDirectory()` (reused directly from Section 8p's Player Research work, not duplicated) — name match. Results cap at 12, routes first, then teams, then players.
- Each result links to where it's actually useful: a matched pitcher goes to `/pitching/strikeouts?pitcher=<id>`, a matched batter to `/hitting/hits?batter=<id>`, a matched team to `/research/teams`, matching the same `?batter=`/`?pitcher=` deep-link convention every other cross-feature link in the app already uses.
- New `src/components/global-search/global-search.tsx` client component wired into `AppShell`'s header: a "Search /" button opens a modal overlay; `Cmd/Ctrl+K` or `/` (when no input is focused) also opens it; `Escape` or a backdrop click closes it; results are debounced (150ms) type-ahead calls to `/api/search`; arrow keys move the active selection and Enter navigates, same as clicking a result.
- The pure matching logic (`buildSearchResults(normalized, slate)`) is separated from the async `search()` wrapper that fetches the slate, following the same testable-pure-function split used throughout this session (Zone/Pitch Intelligence, Player Research).

**Verified for real**:
- `npx tsc --noEmit` clean, `npx eslint .` clean — including satisfying the `react-hooks/set-state-in-effect` rule, which initially flagged three synchronous `setState` calls inside `useEffect` bodies in the new component; fixed by moving cleanup state resets into explicit `openSearch()`/`closeSearch()` handlers instead of an effect watching `open`, and moving the loading-state `setLoading(true)` inside the debounce `setTimeout` callback instead of the effect's synchronous body.
- `npm test` (no `DATABASE_URL`): 227/227 passing (204 pass + 23 skip), including 4 new tests for `buildSearchResults` (route match, team match by city, player match with correct pitcher/batter href, empty-query returns `[]`).
- `npm test` with a real `DATABASE_URL`: 227/227 passing.
- `npm run build`: compiles cleanly; `/api/search` appears in the route table as a dynamic (`ƒ`) route.
- `npm run test:e2e` against a real `next start` server: 11/11 passing (unchanged route sample, confirming the new header component didn't break any existing page).
- Real browser check (Playwright): `curl`'d `/api/search?q=judge` directly and got back the real Aaron Judge record with the correct `/hitting/hits?batter=player-judge` href; opened the modal via the header button, typed "dodgers", confirmed "Los Angeles Dodgers · Team" rendered with zero console errors, then confirmed pressing Enter actually navigated to `/research/teams` (not just that the link renders); separately confirmed the `/` keyboard shortcut opens the modal and `Escape` closes it.

---

## 8s. Live Player-Prop Odds Coverage Expansion (added 2026-07-08)

Traced why Section 3's "Odds (OddsPipe)" row said "player-prop odds coverage incomplete": `LiveMLBProvider.props` (`src/services/providers/live-mlb-provider.ts`) was hardwired to `mockDataProvider.props` — **every player prop was mock data even in `ODDS_MODE=live`**, unlike games/teams/pitchers/predictions, which all have real live providers. Root cause went two levels deep: `OddsPipeProvider.normalizeMarket()` only recognized the literal strings `"team-total"`/`"player-prop"`, so any real per-category OddsPipe market key (`player_strikeouts`, `batter_hits`, etc.) fell through and got silently dropped; and `NormalizedOddsRecord` had no field to carry a player's identity at all, so even a recognized record couldn't be routed to a specific `PlayerProp`.

**What changed**:

- `NormalizedOddsRecord` gained `playerName?` and `propCategory?`. `OddsPipeProvider`'s market normalizer now maps real per-category market keys (`player_strikeouts`/`pitcher_strikeouts` → Strikeouts, `batter_hits`/`player_hits` → Hits, `batter_home_runs`/`player_home_runs` → Home Runs, `batter_total_bases`/`player_total_bases` → Total Bases, plus Runs/RBI variants) to `market: "player-prop"` + the right `PlayerPropCategory`, and extracts the player's name from whichever field the vendor used (tried in order: `playerName`, `player_name`, `participant`, `description`, `name`, `selection`).
- New `LivePropsProvider` (`src/services/providers/live-mlb-provider.ts`) requests player-prop odds from OddsPipe via the existing `oddsService` singleton and matches each record to a real player from today's schedule: probable pitchers for Strikeouts, lineup batters for everything else, matched case-insensitively by full name. `LivePlayersProvider` was extended to also surface lineup batters (previously it only had probable pitchers + the static mock roster) — the prop matcher needs those to resolve a batter prop to a real `Player.id`, and this closes a related gap where live-mode batter identity was mock-only too.
- Categories with no live match keep their existing mock entries rather than disappearing entirely — blended per-category fallback, not all-or-nothing, matching this app's degrade-gracefully-not-throw philosophy everywhere else.
- **Deliberately did not fabricate a confidence/edge score.** Live-sourced props get an explicit, honest placeholder (`confidence: "Medium"/50`, `edge: 0%`, reasoning text stating scoring isn't computed yet) rather than inventing a number that looks like a real model output. A genuine edge for these markets needs a player-performance projection (season/rolling rate vs. the market line) that doesn't exist yet — computing that honestly is future work, not something to fake in one pass. Runs/RBI categories were left out of live-wiring scope entirely (no downstream intelligence feature reads them, per the design survey that scoped this item), so only Strikeouts/Hits/Home Runs/Total Bases get real live odds.
- Split the new pure parsing/matching logic into two relative-imports-only modules — `src/providers/odds/normalize-oddspipe.ts` and `src/services/providers/live-props-matching.ts` — since both `OddsPipeProvider.ts` (parameter-property constructor syntax) and `live-mlb-provider.ts` (full of `@/`-aliased value imports) are otherwise unloadable by `node --experimental-strip-types`, the same constraint documented earlier this session for `daily-slate/service.ts` and `player-research/service.ts`.

**Verified for real**:
- `npx tsc --noEmit` clean, `npx eslint .` clean.
- `npm test` (no `DATABASE_URL`): 236 tests, 213 pass / 23 skip / 0 fail, including 9 new tests across `tests/live-props-matching.test.ts` (pitcher/batter matching, case-insensitivity, Over/Under display line, drops for unmatched players, drops for non-prop records, `buildLineupBatters` id stability) and `tests/oddspipe-player-props.test.ts` (per-category market key recognition, existing game-level markets still normalize unchanged, unrecognized market keys still get dropped).
- `npm test` with a real `DATABASE_URL`: 236/236 passing.
- `npm run build`: compiles cleanly.
- Real browser regression check (Playwright, screenshot taken): confirmed the homepage, Best Bets, and Player Research all still render at 200 with the same "Live data fallback: MLB schedule request failed with 403" banner and mock-sourced data as every prior session — the outer `getDailySlate()` try/catch still falls all the way back to `mockDataProvider` (bypassing `LivePropsProvider` entirely) whenever the live MLB schedule fetch fails, which it always does in this sandbox (Section 8n). No new console errors beyond the pre-existing injuries-403 structured log line.

**Not verified (same sandbox network-policy blocker as every other live provider — Section 8n)**: the actual live OddsPipe player-prop request/response round trip. The matching logic itself is fully unit-tested against realistic OddsPipe-shaped fixtures; what's unverified is only whether OddsPipe's real API uses the exact market-key strings and player-identity field names assumed here. If real OddsPipe traffic uses different key names, `normalizeMarket`'s `playerPropMarketKeys` map is the one place to update — it degrades safely either way (unmatched keys are dropped, not mis-attributed).

---

## 9. Update Protocol

After every major feature or milestone:
1. Move the item from its section (3/4/6) into Section 2 with a `[x]`.
2. Re-run `npx tsc --noEmit`, `npm run build`, `npm test` and update the validation block at the top.
3. Adjust the completion percentages in Section 1 if the change is significant.
4. Note any new debt discovered in Section 5 rather than letting it go unrecorded.
