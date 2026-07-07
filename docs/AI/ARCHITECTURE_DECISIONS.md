# Architecture Decisions

This document records the major architectural decisions currently reflected in the TrueLine codebase. It is a practical ADR-style summary for future engineers.

Related:

- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md)
- [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md)
- [`../../docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`../../docs/API_PROVIDERS.md`](../API_PROVIDERS.md)

## Decision 1: Feature-First Application Structure

Decision:

Use `src/features/**` for product experiences and market-specific view models.

Why:

- Betting markets evolve independently.
- Pages need product-specific view models.
- Feature folders keep service/page/config files close.

Current examples:

- `src/features/home-run-intelligence/`
- `src/features/total-bases-intelligence/`
- `src/features/moneyline-intelligence/`
- `src/features/best-bets/`
- `src/features/correlation/`

Tradeoff:

- Some UI/card duplication exists across features.
- Shared components should be extracted carefully, not through broad refactors.

## Decision 2: Provider Interfaces Hide Vendors

Decision:

Every external source should sit behind provider interfaces.

Why:

- Avoid vendor lock-in.
- Keep UI independent from data source.
- Make live/replay/mock interchangeable.
- Enable future providers such as The Odds API, SportsDataIO, Pinnacle, DraftKings, FanDuel, Redis, or paid weather providers.

Current examples:

- `src/providers/odds/OddsProvider.ts`
- `src/providers/weather/WeatherProvider.ts`
- `src/providers/matchup/MatchupProvider.ts`
- `src/providers/lineups/LineupProvider.ts`

Tradeoff:

- Provider boilerplate is higher.
- Tests and replay fixtures are required to keep contracts stable.

## Decision 3: Services Own Business Logic

Decision:

Services calculate scores, projections, recommendations, fair lines, EV, rankings, diagnostics, and view models.

Why:

- React remains a renderer.
- Calculations are independently testable.
- Business logic can be reused across pages.
- Future APIs or UI changes do not rewrite model logic.

Current examples:

- `src/services/predictions/PredictionEngine.ts`
- `src/services/ranking/RankingEngineService.ts`
- `src/features/total-bases-intelligence/service.ts`
- `src/features/best-bets/service.ts`

Tradeoff:

- Feature services can become large. Refactor only when duplication becomes a clear maintenance problem.

## Decision 4: View Models Are UI Contracts

Decision:

Pages consume feature-specific view models instead of raw domain/provider data.

Why:

- UI remains stable.
- Calculations stay testable.
- Display formatting can be centralized.
- Product surfaces can evolve without exposing provider details.

Current examples:

- `BestBetsViewModel`
- `TotalBasesViewModel`
- `MoneylineIntelligenceViewModel`
- `DailySlateIntelligenceViewModel`

Tradeoff:

- View models sometimes duplicate display strings and raw values. This is acceptable when it keeps React simple.

## Decision 5: Deterministic V1 Models Before Machine Learning

Decision:

Use transparent deterministic scoring models before building advanced predictive engines.

Why:

- Inputs are still maturing.
- Calibration data is not production-ready.
- Explainability is a product requirement.
- Deterministic rules are easier to test and debug.

Current examples:

- PredictionEngine V1.
- RankingEngine V1.
- Home Run Intelligence V1.
- Total Bases Intelligence V1.
- Team Totals, Game Totals, Run Line, Moneyline V1.

Tradeoff:

- Scores are not fully calibrated.
- Product copy should not claim model certainty beyond what the current data supports.

## Decision 6: RankingEngine Sits Above Markets

Decision:

Markets produce `BetCandidate` records and RankingEngine ranks across markets.

Why:

- Best Bets can aggregate all markets.
- Correlation can consume a common recommendation shape.
- Calibration/backtesting can use common market records.

Current location:

```text
src/services/ranking/
```

Tradeoff:

- Market services need adapter code.
- Some adapter duplication exists and should eventually be shared.

## Decision 7: Replay Mode Is Required for Provider Work

Decision:

Provider domains should support replay fixtures.

Why:

- Reduce API usage.
- Avoid rate limits.
- Enable deterministic tests.
- Support development without secrets.

Current replay folder:

```text
replay/
```

Tradeoff:

- Fixtures must be maintained when provider contracts change.

## Decision 8: In-Memory Cache First

Decision:

Use `MemoryCache` as the first cache provider.

Why:

- Simple local development.
- No infrastructure dependency.
- Provides a contract for future cache implementations.

Current location:

```text
src/cache/
```

Tradeoff:

- Not production durable.
- Does not share cache across server instances.
- Must be replaced or supplemented before scale.

## Decision 9: Admin Analytics Exist Before Auth

Decision:

Calibration, backtesting, and odds intelligence dashboards were built before auth.

Why:

- Internal analytics workflows were needed early.
- Product validation required visible dashboards.

Current risk:

- `/admin/*` routes are not production-safe until protected.

Required before production:

- Authentication.
- Authorization.
- Admin route protection.

## Decision 10: MLB First, Multi-Sport Later

Decision:

Build MLB production quality before expanding to other sports.

Why:

- MLB has enough complexity to validate architecture.
- Pitcher/batter/team/park/weather/odds domains force strong abstractions.
- Multi-sport work before MLB maturity would dilute quality.

Tradeoff:

- Some models are MLB-specific today.
- Shared abstractions should be extracted as future sports require them.

