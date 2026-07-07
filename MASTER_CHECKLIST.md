# TrueLine Master Checklist

Living project roadmap and status document. Update this file after every major feature lands so it always reflects the project's true state — do not let it go stale like `docs/PROJECT_STATE.md` did.

Last updated: 2026-07-07 (Claude, ownership transition)
Baseline: `codex/trueline-rebrand` @ `59b4d79` ("Add AI handoff documentation")
Working branch: `claude/trueline-development`

Validation at time of writing (all passing):
```
npx tsc --noEmit   -> clean
npm run build      -> 25 routes compiled
npm test           -> 160/160 passing
```

---

## 1. Overall Completion Estimate

| Layer | Est. % complete | Confidence |
|---|---:|---|
| Core architecture (provider/service/view-model pattern) | 95% | High — verified by build + tests |
| Data intelligence layer (weather/ballpark/bullpen/lineup/pitcher/team-strength/recent-form/matchup) | 85% | High — live+replay+mock all present, tested |
| Prediction / Ranking / Correlation engines | 80% | High — deterministic V1s complete, not calibrated |
| Betting market products (8 markets) | 70% | Medium — built and ranked, several rely on incomplete prop odds |
| Analytics admin (Calibration / Backtesting / Odds Intelligence) | 40% | Medium — scaffolds + tests exist, no durable data behind them |
| Production infrastructure (auth, persistence, cache, observability) | 5% | High — essentially none of this exists |
| **Overall product** | **~55%** | Weighted toward infra being the largest remaining gap |

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
| Calibration Engine | Service, admin dashboard (`/admin/calibration`), tests, mock/replay records | No production prediction/result database; not authoritative for live recommendations |
| Backtesting Engine | `BacktestRunner`, `StrategyEvaluator`, `BankrollSimulator`, admin dashboard, tests | Historical slates are mock/replay only; not backed by real ingested history |
| Odds Intelligence | `ClosingLineCalculator`, `MarketMovementAnalyzer`, `SteamMoveDetector`, admin dashboard, tests | No durable odds-history recorder process; movement attribution (injury/weather-driven) is limited |
| Pitch Intelligence (`/matchups/pitch-intelligence`) | Route exists | Materially less complete than Zone Intelligence — treat as unfinished |
| Entity research (`/research/players`, `/research/teams`, `/research/ballparks`) | Placeholder routes exist | Not yet searchable/functional entity pages |
| Best Bets filtering/sorting | Static ranked board renders | No interactive filters or sort controls yet |

---

## 4. Not Yet Built (Production Blockers)

Ranked by what actually blocks a real launch:

1. **Authentication & authorization** — none exists; `/admin/*` routes are open to anyone
2. **Production persistence layer** — no database anywhere; everything is request-scoped or in-memory
3. **Live injuries provider** — mock only, no real feed
4. **Durable odds-history recorder** — no process records real line movement over time
5. **Historical results ingestion** — nothing populates real outcomes for calibration/backtesting to learn from
6. **Production cache adapter** — in-memory cache only, doesn't survive restarts or scale across instances
7. **Runtime env schema validation** — ~50 env vars across providers, no `.env.example`, no startup validation, no secret-presence checks for live modes
8. **Observability** — no structured logging, no provider health monitoring, no error tracking
9. **E2E / route smoke tests** — 160 unit tests exist, zero browser-level tests
10. **Global search** — not implemented anywhere
11. **API licensing review** — Baseball Savant / Statcast CSV and Open-Meteo usage haven't been reviewed for production terms

---

## 5. Cleanup / Debt Not Captured in Existing Docs

Found during independent review — not mentioned in `CLAUDE_HANDOFF.md` or `PROJECT_STATE.md`:

- [ ] **Delete `src/components/layout/`** (Navbar/Footer/Sidebar/Container) — zero imports anywhere in `src/` or `app/`. Leftover from the original landing-page scaffold, abandoned commit 2 of the project.
- [ ] **Delete or adopt `src/design-system/`** (colors/spacing/typography/shadows/theme tokens) — also zero imports anywhere; dashboard uses inline Tailwind instead, and the token values don't even match current inline colors.
- [ ] Legacy `/team/*` routes (`/team/moneyline`, `/team/team-total`, `/team/game-total`) — superseded by `/betting/*` equivalents, should be removed or redirected.
- [ ] `docs/PROJECT_STATE.md` is self-acknowledged stale — either refresh it or deprecate it in favor of this file.
- [ ] Duplicate market-card/candidate-normalization patterns across market feature folders — real but low urgency; don't refactor broadly without a specific trigger.
- [ ] PR #5 targets `test-codex-auth`, not `main` — needs a decision on final merge path before this branch's work lands anywhere permanent.

---

## 6. Recommended Build Order (Dependency-Aware)

Work roughly top-to-bottom; items within a phase can interleave.

**Phase 0 — Hygiene (do first, no dependencies, near-zero risk)**
1. Delete dead `layout/` and `design-system/` code
2. Add `.env.example` documenting every provider mode/key currently read from `process.env`
3. Remove or redirect legacy `/team/*` routes
4. Resolve PR #5 merge-target question (this branch → `main`)

**Phase 1 — Foundation for everything else**
5. Production persistence layer (predictions, odds snapshots, results, calibration records) — almost everything downstream depends on this existing first
6. Runtime env validation + secret-presence checks for live-mode providers
7. Auth + admin route protection (`/admin/*` is currently the single biggest real risk)

**Phase 2 — Make the data real**
8. Durable odds-history recorder (depends on #5)
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

## 7. Update Protocol

After every major feature or milestone:
1. Move the item from its section (3/4/6) into Section 2 with a `[x]`.
2. Re-run `npx tsc --noEmit`, `npm run build`, `npm test` and update the validation block at the top.
3. Adjust the completion percentages in Section 1 if the change is significant.
4. Note any new debt discovered in Section 5 rather than letting it go unrecorded.
