# Roadmap Master

This is the implementation-oriented roadmap for TrueLine. It complements the product roadmap in [`../ROADMAP.md`](../ROADMAP.md) and the long-term product blueprint in [`../PRODUCT_BLUEPRINT.md`](../PRODUCT_BLUEPRINT.md).

## Current Phase

TrueLine is between broad V1 product completion and Production V1 hardening.

The product already includes many engines and market pages. The next priority is not breadth. The next priority is production trust.

## Phase 0: Stabilize Handoff

Status: In progress.

Goals:

- Preserve current docs.
- Make onboarding possible without chat history.
- Keep architecture decision context available.
- Document AI workflow.

Deliverables:

- `docs/AI/CLAUDE_HANDOFF.md`
- `docs/AI/ENGINEERING_PRINCIPLES.md`
- `docs/AI/CODING_STANDARDS.md`
- `docs/AI/ARCHITECTURE_DECISIONS.md`
- Remaining AI docs in this folder.

## Phase 1: Production Foundation

Priority: Critical.

Deliverables:

- Production database or persistence layer.
- Data schema for predictions.
- Data schema for odds snapshots.
- Data schema for results.
- Data schema for calibration records.
- Data schema for backtesting slates.
- Repository interfaces.
- Migration strategy.
- Local development seed data.

Why:

Calibration, backtesting, CLV, and historical performance cannot become production-grade without persistence.

## Phase 2: Security and Admin Protection

Priority: Critical.

Deliverables:

- Authentication.
- Authorization.
- Admin route protection.
- Environment validation.
- Secret handling review.
- Deployment-safe provider configuration.

Routes requiring protection:

- `/admin/backtesting`
- `/admin/calibration`
- `/admin/odds-intelligence`

## Phase 3: Live Market Data Completion

Priority: Critical.

Deliverables:

- Full live player-prop odds coverage.
- Strikeout props.
- Hits props.
- Total Bases props.
- Home Run props.
- Team Totals.
- Game Totals.
- Run Line two-sided pricing.
- Market normalization tests.
- Replay fixtures for all markets.

Why:

Many market pages exist, but production usefulness depends on reliable live sportsbook data.

## Phase 4: Historical Results and Calibration

Priority: Critical.

Deliverables:

- Historical MLB game results ingestion.
- Player prop result ingestion.
- Market result settlement.
- Calibration dashboard backed by real data.
- Confidence calibration by market.
- ROI by market and recommendation tier.
- CLV by market.

## Phase 5: Odds Intelligence Productionization

Priority: High.

Deliverables:

- Durable odds history recorder.
- Scheduled odds snapshots.
- Closing line capture.
- Opening/current/closing comparison.
- Market movement alerts.
- CLV display in Best Bets.

## Phase 6: Live Injuries and Availability

Priority: High.

Deliverables:

- Injury provider interface.
- Live injury provider.
- Replay provider.
- Mock provider.
- Injury impact model.
- Integration into Daily Slate, Moneyline, Team Totals, Game Totals, props, and Best Bets.

## Phase 7: Product Workflow Improvements

Priority: High.

Deliverables:

- Interactive Best Bets filters.
- Sorting controls.
- Team/player/sportsbook filters.
- Global search.
- Saved views.
- Responsive polish.
- Entity research pages.

## Phase 8: Observability and Reliability

Priority: High.

Deliverables:

- Provider health dashboard.
- Structured logging.
- API latency tracking.
- Provider error rates.
- Cache hit/miss metrics.
- Fallback visibility.
- User-facing data freshness indicators.

## Phase 9: Testing Hardening

Priority: Medium.

Deliverables:

- Coverage script.
- Coverage thresholds.
- E2E route smoke tests.
- Critical workflow browser tests.
- Provider contract tests.
- Persistence integration tests.

## Phase 10: Multi-Sport Foundation

Priority: Later.

Do not begin until MLB Production V1 is credible.

Deliverables:

- Shared sport abstractions.
- Sport-specific model boundaries.
- WNBA/NFL/NBA/NHL/Soccer roadmap.
- Provider compatibility review.

## Top 20 Remaining Tasks

1. Add production persistence.
2. Protect admin routes.
3. Add full live prop odds.
4. Add historical result ingestion.
5. Add durable odds history.
6. Add live injuries.
7. Add production cache adapter.
8. Normalize two-sided odds across markets.
9. Connect calibration to real outcomes.
10. Connect backtesting to real historical slates.
11. Add Best Bets UI filters/sorting.
12. Add global search.
13. Add observability.
14. Add e2e tests.
15. Add coverage thresholds.
16. Remove or redirect legacy `/team/*` routes.
17. Refactor duplicated candidate adapters.
18. Refactor repeated card UI patterns.
19. Refresh stale docs.
20. Review API licensing.

