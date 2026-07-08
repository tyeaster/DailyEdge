# Claude Handoff: TrueLine Engineering Onboarding

This document is the definitive engineering handoff for the next Lead Engineer working on TrueLine. It assumes no prior project context.

TrueLine has been built rapidly through a sequence of architecture, data, analytics, and product sprints. The current system is broad and functional, but it is not production-ready yet. The next engineering phase should focus less on adding new market concepts and more on production hardening, data completeness, security, calibration, and maintainability.

## Executive Summary

TrueLine is an MLB-first sports betting analytics platform. Its purpose is not to serve generic picks. Its purpose is to identify market value by comparing TrueLine's model-derived probability, fair line, and expected value against sportsbook pricing.

The codebase is a Next.js App Router application using TypeScript, React, Tailwind-style utility classes, server-rendered pages, deterministic service layers, provider interfaces, in-memory caching, mock/replay/live data modes, and a feature-first folder structure.

The application currently includes:

- Daily Slate dashboard.
- Provider-based MLB schedule integration.
- Live/replay/mock odds architecture with OddsPipe as the first live odds provider.
- Live/replay/mock weather, ballpark, bullpen, lineup, pitcher, team-strength, recent-form, player-intelligence, and matchup providers.
- PredictionEngine V1.
- RankingEngine V1.
- CalibrationEngine scaffold.
- BacktestingEngine scaffold.
- OddsIntelligence scaffold.
- Correlation and Exposure Engine V1.
- Betting market products for Moneyline, Run Line, Team Totals, Game Totals, Home Runs, Total Bases, Hits, and Strikeouts.
- Research pages for pitchers, hitters, and zone intelligence.
- Admin dashboards for calibration, backtesting, and odds intelligence.

The architecture is conceptually strong. The key production gaps are:

- No production persistence layer.
- No authentication or authorization.
- No live injury provider.
- Live player-prop odds coverage is incomplete.
- Historical results are replay/mock oriented, not production-ingested.
- Calibration and backtesting are structurally present but not powered by durable historical data.
- Admin routes are not protected.
- Global search and interactive market filtering are incomplete.
- Documentation exists but needs continuous refresh.

Current working branch context at handoff:

```text
codex/trueline-rebrand
```

Existing draft PR:

```text
https://github.com/tyeaster/DailyEdge/pull/5
```

Known local workspace note:

```text
app/globals.css
screenshots/
```

These files have appeared as untracked local files. Treat them as user/local artifacts unless explicitly told otherwise.

## Project Vision

TrueLine exists to become a trusted sports betting analytics platform by identifying mispriced markets through transparent, explainable predictive models.

TrueLine is not a tout site and not a picks feed. The product should feel closer to a research terminal than a sportsbook. The long-term analogy used in product planning is:

```text
Bloomberg Terminal for sports betting
```

The platform should help users quickly answer:

- Which games matter today?
- Which markets are mispriced?
- Which players have the best prop environments?
- Which recommendations have the best expected value?
- Which recommendations are correlated?
- Which model edges have historically held up?
- Where did the market move after TrueLine identified value?

MLB is the first production sport. Future sports should reuse the same architecture where domain concepts overlap.

## Product Philosophy

The core product principles are documented in `PROJECT_PRINCIPLES.md`. The most important rules for future work are:

- The model is the product.
- Prediction accuracy takes priority over visual polish.
- TrueLine exists to find edge, not simply predict winners.
- Confidence must remain separate from sportsbook odds.
- Every recommendation should be explainable.
- External APIs must be accessed through interfaces.
- Never hardcode sportsbook vendors or provider-specific response shapes into UI.
- Business logic belongs in services, not React components.
- Calculations must be deterministic and testable.
- Cache before increasing API usage.
- Secrets must never be exposed to the client.
- Optimize maintainability over cleverness.
- Documentation should evolve with the codebase.

Future contributors should read these files early:

- `PROJECT_PRINCIPLES.md`
- `docs/PRODUCT_BLUEPRINT.md`
- `docs/ARCHITECTURE.md`
- `docs/PROJECT_STATE.md`
- `docs/PREDICTION_ENGINE_V1.md`
- `docs/RANKING_ENGINE.md`
- `docs/BEST_BETS.md`

## Technology Stack

The current stack is deliberately minimal:

- Next.js `16.2.9`
- React `19.2.4`
- TypeScript `5`
- ESLint `9`
- Tailwind CSS `4`
- Node built-in test runner
- No database yet
- No auth provider yet
- No external state manager
- No client-side API layer

Package scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npx tsc --noEmit
```

Important project rule from `AGENTS.md`:

> This version of Next.js has breaking changes. Read relevant docs in `node_modules/next/dist/docs/` before writing framework-sensitive code.

When modifying routes, layouts, metadata, server/client components, or App Router behavior, inspect the local Next docs first.

## Overall Architecture

TrueLine uses a layered architecture:

```text
App Routes
  -> Feature Pages
    -> Feature Services / View Model Builders
      -> Shared Domain Services
        -> Provider Interfaces
          -> Live / Replay / Mock Providers
      -> Ranking / Calibration / Odds / Backtesting Services
    -> Typed View Models
  -> React Components render only prepared data
```

Core rules:

- React components should render finished view models.
- Pages should not import provider implementations.
- Provider selection should happen inside service/provider factories.
- Business logic should stay out of React.
- New market services should assemble normalized data and produce view models.
- New provider integrations should normalize vendor responses before data reaches features.

## Folder Structure

High-level folders:

```text
app/
  Next.js App Router routes.

src/components/
  Shared UI components, app shell, dashboard components, research components.

src/features/
  Product-facing feature modules and market pages.

src/services/
  Shared business logic, orchestration, analytics engines, provider-facing services.

src/providers/
  External data provider interfaces and live/replay/mock provider implementations.

src/models/
  Core domain models.

src/cache/
  Cache abstractions and in-memory cache implementation.

src/lib/
  Utility functions such as odds math and class name helpers.

mock/
  Mock MLB data.

replay/
  Replay fixtures for deterministic local development and tests.

tests/
  Node test-runner tests.

docs/
  Product, architecture, model, provider, scoring, and engine documentation.
```

Important feature folders:

```text
src/features/daily-slate-intelligence/
src/features/best-bets/
src/features/correlation/
src/features/pitcher-research/
src/features/hitter-research/
src/features/zone-intelligence/
src/features/home-run-intelligence/
src/features/total-bases-intelligence/
src/features/moneyline-intelligence/
src/features/run-line-intelligence/
src/features/team-totals-intelligence/
src/features/game-totals-intelligence/
src/features/backtesting-admin/
src/features/calibration-admin/
src/features/odds-intelligence-admin/
```

Important service folders:

```text
src/services/predictions/
src/services/ranking/
src/services/calibration/
src/services/backtesting/
src/services/odds-intelligence/
src/services/matchup/
src/services/player-intelligence/
src/services/daily-slate/
```

Important provider folders:

```text
src/providers/odds/
src/providers/weather/
src/providers/ballparks/
src/providers/bullpen/
src/providers/lineups/
src/providers/pitchers/
src/providers/team-strength/
src/providers/recent-form/
src/providers/player-intelligence/
src/providers/matchup/
```

## Provider Architecture

Providers isolate vendor-specific data access from the rest of the application.

Each provider area should follow this pattern:

```text
ProviderInterface.ts
LiveProvider.ts
ReplayProvider.ts
MockProvider.ts
index.ts
normalization/rating helpers where needed
```

Examples:

```text
src/providers/weather/WeatherProvider.ts
src/providers/weather/OpenMeteoWeatherProvider.ts
src/providers/weather/ReplayWeatherProvider.ts
src/providers/weather/MockWeatherProvider.ts

src/providers/odds/OddsProvider.ts
src/providers/odds/OddsPipeProvider.ts
src/providers/odds/ReplayOddsProvider.ts
src/providers/odds/MockOddsProvider.ts
```

Provider requirements:

- Return normalized domain objects or normalized provider responses.
- Hide vendor response shapes.
- Support graceful failure.
- Support mock mode.
- Support replay mode where feasible.
- Be cacheable through service-level cache abstractions.
- Avoid leaking secrets to the client.

Current provider modes by domain:

| Domain | Live | Replay | Mock | Notes |
|---|---:|---:|---:|---|
| Schedule | Yes | No | Yes | Live MLB schedule with mock fallback. Replay schedule is still missing. |
| Odds | Yes | Yes | Yes | OddsPipe live provider; requires `ODDSPIPE_API_KEY`. |
| Weather | Yes | Yes | Yes | Open-Meteo live provider; production licensing review needed. |
| Ballparks | Yes | Yes | Yes | MLB venue plus Baseball Savant park factors. Savant contract risk. |
| Bullpen | Yes | Yes | Yes | MLB relief stats and recent workload. |
| Lineups | Yes | Yes | Yes | MLB confirmed/projected lineup profiles. |
| Pitcher Stats | Yes | Yes | Yes | MLB season pitching stats. |
| Player Game Logs | Yes | Yes | Yes | MLB pitcher and batter logs. |
| Team Strength | Yes | Yes | Yes | MLB hitting/pitching team statistics. |
| Recent Form | Yes | Yes | Yes | MLB rolling team windows. |
| Matchup | Yes | Yes | Yes | Baseball Savant Statcast CSV. |
| Injuries | No | No | Yes | Production gap. |
| Historical Results | No | Partial | Yes | Backtesting/calibration scaffolds exist but no durable ingestion. |

## Service Architecture

Services are the business logic layer.

Shared services perform:

- Data orchestration.
- Provider selection.
- Caching.
- Normalization.
- Scoring.
- Recommendation generation.
- View model assembly.
- Fallback behavior.

Feature services are usually responsible for a specific product or betting market. They typically:

1. Load the Daily Slate or receive an existing `DailySlateViewModel`.
2. Select relevant candidates.
3. Load additional intelligence services as needed.
4. Calculate deterministic scores through centralized config.
5. Convert candidates to shared ranking candidates.
6. Return a typed view model for the React page.

Examples:

```text
src/features/home-run-intelligence/service.ts
src/features/total-bases-intelligence/service.ts
src/features/moneyline-intelligence/service.ts
```

Shared analytics services:

```text
src/services/ranking/RankingEngineService.ts
src/services/calibration/CalibrationService.ts
src/services/backtesting/BacktestService.ts
src/services/odds-intelligence/OddsIntelligenceService.ts
src/features/correlation/service.ts
```

Avoid introducing logic directly in page components. If a component needs calculated data, add it to the service view model.

## View Model Architecture

View models are the contract between services and UI.

Common conventions:

- Feature pages export a `FeaturePage` server component.
- Feature services export a `getFeatureViewModel()` or similar function.
- Candidate-level models include raw numeric values plus display strings where useful.
- React components render fields directly.
- Components do not calculate expected value, fair line, edge, recommendation, or ranking.

Examples:

```text
HomeRunIntelligenceViewModel
TotalBasesViewModel
MoneylineIntelligenceViewModel
TeamTotalsViewModel
GameTotalsViewModel
RunLineViewModel
BestBetsViewModel
CorrelationViewModel
```

For new features:

- Define the view model in the feature service file unless it becomes broadly shared.
- Include enough fields for UI rendering without requiring UI calculations.
- Include explainability arrays and scoring factor breakdowns.
- Include source and timestamp metadata.
- Include optional `RankedBetCandidate` if integrating with RankingEngine.

## Data Flow

Typical Daily Slate flow:

```text
app/page.tsx
  -> DailySlateIntelligencePage
    -> dailySlateOrchestratorService.getDailySlateIntelligence()
      -> getDailySlate()
        -> LiveMLBProvider or Mock fallback
        -> Enriched teams, pitchers, weather, ballpark, lineups, bullpen, odds
      -> HomeRunIntelligenceService
      -> TotalBasesIntelligenceService
      -> MoneylineIntelligenceService
      -> RankingEngineService
      -> DailySlateIntelligenceViewModel
    -> React renders cards and sections
```

Typical market page flow:

```text
app/betting/total-bases/page.tsx
  -> TotalBasesIntelligencePage
    -> getTotalBasesIntelligence()
      -> getDailySlate()
      -> PlayerIntelligenceService
      -> MatchupService
      -> RankingEngineService
      -> TotalBasesViewModel
    -> React renders candidate cards
```

Typical provider flow:

```text
Feature Service
  -> Domain Service
    -> Provider Interface
      -> Live Provider / Replay Provider / Mock Provider
    -> Normalize
    -> Cache
    -> Return typed data
```

## Replay / Mock / Live Strategy

TrueLine uses three development/data modes:

### Live

Live providers call external sources such as:

- MLB Stats API.
- OddsPipe.
- Open-Meteo.
- Baseball Savant / Statcast CSV.

Live mode is the production direction but not fully production-hardened yet.

### Replay

Replay providers read saved fixtures from `replay/`.

Replay mode exists to:

- Develop without hitting APIs.
- Reduce paid provider usage.
- Make tests deterministic.
- Preserve provider contracts when live APIs are unavailable.

Replay fixtures currently exist for:

```text
replay/backtesting/historical-slates.json
replay/ballparks/example.json
replay/calibration/history.json
replay/lineups/example.json
replay/matchup/example.json
replay/odds-intelligence/history.json
replay/player-intelligence/example.json
replay/player-intelligence/batters/example.json
replay/ranking/candidates.json
replay/weather/example.json
```

Some replay folders contain `.gitkeep` placeholders but not full fixtures yet.

### Mock

Mock providers return deterministic synthetic data.

Mock mode exists to:

- Keep the UI usable when live providers fail.
- Support tests.
- Provide offline development.
- Prevent prediction generation from failing due to missing inputs.

Missing data should always degrade gracefully to neutral values and reduce confidence where appropriate.

## Cache Strategy

Current cache implementation:

```text
src/cache/CacheProvider.ts
src/cache/MemoryCache.ts
```

Current cache is in-memory. It is acceptable for local development but not enough for production.

Future production cache targets:

- Redis.
- Vercel KV.
- Cloudflare KV.

General cache expectations:

- Odds: short TTL, around 60 seconds.
- Schedule: about 5 minutes.
- Weather: around 10 minutes, longer for indoor/closed roof.
- Ballparks: around 24 hours.
- Pitcher/team/player stats: one hour or longer depending on volatility.
- Historical replay/static data: effectively durable.

Production hardening should add a shared durable cache adapter before increasing live API volume.

## Prediction Engine

Location:

```text
src/services/predictions/PredictionEngine.ts
src/services/predictions/config.ts
src/services/predictions/PredictionDiagnosticsService.ts
```

Purpose:

- Generate deterministic MLB game predictions.
- Calculate home/away win probability.
- Calculate projected runs.
- Calculate fair moneyline.
- Calculate edge and expected value versus sportsbook odds.
- Calculate confidence and data quality.
- Produce explanations and model breakdown.

Current inputs include:

- Starting pitchers.
- Team records.
- Team strength.
- Recent form.
- Momentum.
- Bullpen.
- Lineups.
- Weather.
- Ballpark.
- Sportsbook implied probability.

Important rule:

Do not casually change PredictionEngine formulas. It is considered stable for this phase. Improvements should generally come from better input data, calibration, and persistence before adding formula complexity.

Current limitations:

- V1 model is deterministic and simple by design.
- It is not historically calibrated.
- Defense, travel, rest, injuries, and some advanced factors remain placeholders or incomplete.
- Production confidence requires calibration against historical outcomes.

## Ranking Engine

Location:

```text
src/services/ranking/
```

Purpose:

- Rank betting opportunities across markets using a common `BetCandidate` model.
- Produce TrueLine score, grade, confidence tier, risk tier, recommendation tier, rank, and explanations.

Input model:

```text
BetCandidate
```

Key fields:

- `betId`
- `marketType`
- `player`
- `team`
- `opponent`
- `sportsbook`
- `sportsbookOdds`
- `modelProbability`
- `fairOdds`
- `edgePercent`
- `expectedValuePercent`
- `confidence`
- `variance`
- `dataQuality`
- `recommendation`
- `supportingFactors`
- `timestamp`

Supported market types include:

- `strikeouts`
- `hits`
- `total-bases`
- `home-runs`
- `moneyline`
- `run-line`
- `team-total`
- `game-total`
- future `prizepicks`
- future `parlay`

Ranking is deterministic. It should not be treated as calibrated portfolio optimization yet.

## Calibration Engine

Location:

```text
src/services/calibration/
src/features/calibration-admin/
app/admin/calibration/page.tsx
```

Purpose:

- Compare predictions against results.
- Calculate market/model performance.
- Track confidence calibration.
- Expose ROI, win rate, average edge, average EV, CLV-related fields, and scorecards.

Current status:

- Service scaffold exists.
- Admin dashboard exists.
- Tests exist.
- Mock/replay records exist.

Production gap:

- No durable production prediction/result database.
- No automated historical result ingestion.
- Calibration is not yet authoritative for production recommendations.

## Backtesting Engine

Location:

```text
src/services/backtesting/
src/features/backtesting-admin/
app/admin/backtesting/page.tsx
```

Components:

- `BacktestService`
- `BacktestRunner`
- `StrategyEvaluator`
- `BankrollSimulator`
- `HistoricalSlateProvider`

Purpose:

- Replay historical slates.
- Evaluate strategy performance.
- Simulate bankrolls.
- Calculate ROI, units won, profit, win/loss/push rates, average odds, streaks, drawdown, return score, and daily profit.

Current status:

- Mock/replay historical slate support exists.
- Dashboard exists.
- Tests exist.

Production gap:

- Historical slates are not backed by a production data store.
- Results are not ingested automatically.
- Backtesting should not be used for production claims until real historical data is loaded and audited.

## Odds Intelligence

Location:

```text
src/services/odds-intelligence/
src/features/odds-intelligence-admin/
app/admin/odds-intelligence/page.tsx
```

Components:

- `OddsIntelligenceService`
- `OddsHistoryRecorder`
- `ClosingLineCalculator`
- `MarketMovementAnalyzer`
- `SteamMoveDetector`

Purpose:

- Track line movement.
- Calculate CLV.
- Detect steam moves and reverse line movement.
- Compare opening, current, and closing market prices.
- Feed calibration/backtesting with market movement context.

Current status:

- Service scaffold exists.
- Movement calculations exist.
- Admin dashboard exists.
- Replay/mock data exists.
- Tests exist.

Production gap:

- No durable odds history storage.
- No long-running recorder process.
- Movement attribution, such as injury/weather-driven movement, is still limited.

## Correlation and Exposure Engine

Location:

```text
src/features/correlation/
app/analysis/correlation/page.tsx
docs/CORRELATION_ENGINE.md
```

Purpose:

- Consume Best Bets recommendations.
- Detect correlated exposure.
- Identify same-player, same-team, same-game, same-pitcher, same-offense, same-sportsbook, duplicate, positive, and negative correlations.
- Generate diversified, highest-EV, safest, and aggressive portfolios.
- Produce warnings such as multiple bets depending on the same offense or game environment.

Current status:

- Engine exists.
- UI page exists.
- Tests exist.

Limitations:

- Correlation is deterministic rule-based, not historically covariance-based.
- Pitcher exposure is only as good as candidate metadata.
- Portfolio ROI tracking needs production backtesting data.

## Betting Markets

### Strikeouts

Routes:

```text
/pitching/strikeouts
/pitcher-research
```

Status:

- Research experience exists.
- Uses Pitcher Intelligence, PlayerIntelligenceService, MatchupService, weather, ballpark, bullpen, and lineup context.
- Strong foundation for evaluating strikeout props.

Limitations:

- Live prop odds are not fully production-grade.
- Strikeout-specific calibrated model is not production calibrated.

### Hits

Routes:

```text
/hitting/hits
/hitter-research
```

Status:

- Hitter research exists.
- Uses Batter Intelligence, MatchupService, weather, ballpark, bullpen, and lineup context.

Limitations:

- Live hit prop odds are not fully production-grade.
- Dedicated hits intelligence service is less standalone than newer market services.

### Total Bases

Routes:

```text
/betting/total-bases
/hitting/total-bases
```

Status:

- Dedicated `TotalBasesIntelligenceService` exists.
- Dedicated `/betting/total-bases` page exists.
- Integrated with RankingEngine.
- Integrated with Daily Slate.
- Integrated with Best Bets.
- Documentation exists in `docs/TOTAL_BASES.md`.

Inputs:

- Batter/player intelligence.
- Matchup intelligence.
- Pitch intelligence.
- Zone intelligence.
- Weather.
- Ballpark.
- Bullpen.
- Lineup position.
- Sportsbook line where available.

Limitations:

- Probability estimate is deterministic and not calibrated.
- Live total-base prop odds coverage depends on current prop data availability.

### Home Runs

Route:

```text
/hitting/home-runs
```

Status:

- `HomeRunIntelligenceService` exists.
- Page exists.
- Uses batter power, pitcher HR risk, pitch/zone matchup, environment, lineup, bullpen, fair odds, edge, EV, and confidence.

Limitations:

- HR probability is not calibrated.
- Live HR odds availability may be incomplete.

### Moneyline

Route:

```text
/betting/moneyline
```

Status:

- `MoneylineIntelligenceService` exists.
- Page exists.
- Uses team strength, starting pitching, bullpen, matchup, environment, home field, and sportsbook odds.

Limitations:

- Defense, rest, travel, and schedule density are placeholders or partial.
- Needs historical calibration.

### Run Line

Route:

```text
/betting/run-line
```

Status:

- `RunLineIntelligenceService` exists.
- Page exists.
- Uses projected margin, cover probability, edge, EV, confidence, game grade, and scoring breakdown.

Limitations:

- Two-sided spread pricing needs stronger live odds normalization.
- Blowout potential and late-inning modeling are deterministic V1 approximations.

### Team Totals

Route:

```text
/betting/team-totals
```

Status:

- `TeamTotalsIntelligenceService` exists.
- Page exists.
- Uses offense, lineup, starter matchup, pitch/zone match, bullpen, weather, park, recent form, home/away, rest/travel placeholders, opponent defense placeholder.

Limitations:

- Live team-total odds are not fully production-grade.
- Opponent defense and travel/rest remain placeholders.

### Game Totals

Route:

```text
/betting/game-totals
```

Status:

- `GameTotalsIntelligenceService` exists.
- Page exists.
- Uses home/away offense, starters, bullpens, pitch/zone match, weather, wind, temperature, ballpark, lineups, recent form, rest/travel placeholders.

Limitations:

- Needs complete two-sided over/under odds.
- Needs historical calibration by total number, park, weather, and market type.

### Best Bets

Route:

```text
/best-bets
```

Status:

- `BestBetsService` exists.
- Aggregates markets into one ranked board.
- Uses RankingEngine.
- Includes correlation badges.
- Displays calibration and CLV placeholders where available.

Current markets:

- Strikeouts.
- Hits.
- Total Bases.
- Home Runs.
- Moneyline.
- Run Line.
- Team Total.
- Game Total.

Limitations:

- UI filtering and sorting are not yet fully interactive.
- Historical calibration and CLV are not production-backed.

## Research Pages

### Pitcher Research / Strikeout Lab

Routes:

```text
/pitcher-research
/pitching/strikeouts
```

Purpose:

- Evaluate strikeout props.
- Show pitcher profile, season stats, recent performance, matchup context, prediction breakdown, model explanation, and placeholder matchup intelligence where appropriate.

Uses:

- PlayerIntelligenceService.
- Pitcher Intelligence.
- MatchupService.
- Weather.
- Ballpark.
- Bullpen.
- Lineup context.

### Hitter Research / Hits Lab

Routes:

```text
/hitter-research
/hitting/hits
/hitting/total-bases
```

Purpose:

- Evaluate hits and total-base props.
- Show hitter profile, rolling trends, matchup intelligence, pitcher matchup, context, and explainability.

Note:

- `/hitting/total-bases` currently routes through Hitter Research.
- `/betting/total-bases` is the newer dedicated ranked Total Bases market page.

### Zone Intelligence

Route:

```text
/matchups/zone-intelligence
```

Purpose:

- Show pitcher-vs-batter matchup intelligence.
- Display pitch arsenal, batter pitch-type profile, zone visualization, pitch match, zone match, overall match, confidence, and explanations.

Uses:

- MatchupService.
- Player Intelligence.
- Pitcher/Batter Intelligence.
- Weather, ballpark, bullpen, lineup context where available.

### Pitch Intelligence

Route:

```text
/matchups/pitch-intelligence
```

Status:

- Route exists.
- Current product depth appears less complete than Zone Intelligence.
- Treat this as a future product-completion area.

### Research Placeholders

Routes:

```text
/research/players
/research/teams
/research/ballparks
```

Status:

- Placeholder-style research routes exist.
- These should eventually become searchable entity research pages.

## Application Shell and Navigation

Location:

```text
src/components/app-shell/app-shell.tsx
```

Navigation groups:

- Slate.
- Pitching.
- Hitting.
- Matchups.
- Analysis.
- Team Betting.
- Research.

Current route organization:

```text
/
/best-bets
/analysis/correlation
/pitching/strikeouts
/hitting/hits
/hitting/total-bases
/hitting/home-runs
/matchups/zone-intelligence
/matchups/pitch-intelligence
/betting/moneyline
/betting/run-line
/betting/total-bases
/betting/team-totals
/betting/game-totals
/research/players
/research/teams
/research/ballparks
/admin/backtesting
/admin/calibration
/admin/odds-intelligence
```

Legacy placeholder routes still exist:

```text
/team/moneyline
/team/team-total
/team/game-total
```

These should likely be removed or redirected before production.

## Current Completion Status

Approximate engineering status:

| Area | Status | Notes |
|---|---:|---|
| Core architecture | Complete for V1 | Provider/service/view-model pattern is established. |
| PredictionEngine V1 | Complete for V1 | Deterministic, transparent, not calibrated. |
| Player Intelligence | Complete for V1 | Pitcher and batter intelligence exist. |
| Matchup Intelligence | Complete for V1 | Pitch/zone/recent/overall matchup engines exist. |
| Environmental Intelligence | Complete for V1 | Weather and ballparks exist. |
| Lineups | Complete for V1 | Confirmed/projected lineups exist. |
| Bullpen | Complete for V1 | Live/replay/mock bullpen quality exists. |
| RankingEngine | Complete for V1 | Used by markets and Best Bets. |
| CalibrationEngine | Partial | Structurally present, no production persistence. |
| BacktestingEngine | Partial | Structurally present, no production historical store. |
| OddsIntelligence | Partial | CLV/movement logic exists, no durable recorder. |
| CorrelationEngine | Complete for V1 | Deterministic exposure model exists. |
| Betting markets | Broad V1 complete | Several need live prop odds/calibration. |
| Research pages | Partial to strong | Pitcher/hitter/zone strong; entity research incomplete. |
| Auth/security | Missing | Admin routes are unprotected. |
| Persistence | Missing | No database. |
| Observability | Missing | No production logs/metrics/alerts. |

## Current Technical Debt

High-priority technical debt:

1. No production persistence layer.
2. Admin routes are not protected.
3. Live player-prop odds are incomplete.
4. Live injuries are missing.
5. Historical results ingestion is missing.
6. Odds history recording is not durable.
7. Schedule replay provider is missing.
8. Some market pages duplicate card and adapter patterns.
9. Some docs are stale, especially `docs/PROJECT_STATE.md` and README doc index.
10. Legacy `/team/*` routes remain.
11. Search is not implemented.
12. Interactive filters/sorting are incomplete.
13. No coverage script or coverage thresholds.
14. No browser/e2e test suite.
15. No observability/monitoring.
16. Only in-memory cache exists.
17. Weather and Baseball Savant providers require licensing/reliability review.
18. Rest, travel, defense, injuries, and some movement attribution remain placeholders.

## Production Blockers

Before Production V1, address:

1. Authentication and authorization.
2. Admin route protection.
3. Production persistence for predictions, odds snapshots, historical results, calibration, and backtesting.
4. Live player-prop odds coverage.
5. Live injuries provider.
6. Durable odds history recorder.
7. Historical results ingestion.
8. Production cache adapter.
9. Runtime env validation.
10. Structured logging and provider health monitoring.
11. API licensing review.
12. E2E route smoke tests.
13. Documentation refresh.

## Security Notes

Current known security posture:

- No obvious client-side secret exposure was identified.
- Provider secrets should remain server-side.
- `ODDSPIPE_API_KEY` is required for live OddsPipe.
- `OPEN_METEO_API_KEY` may be used depending on provider configuration.
- No auth exists.
- No authorization exists.
- Admin dashboards are frontend routes and should be treated as public until protected.

Do not ship production admin pages without auth.

Add:

- Environment variable schema validation.
- Secret presence checks for live modes.
- Safe provider error logging.
- Server-side-only boundaries for paid API providers.
- Access control for admin routes.

## Coding Conventions

Follow existing patterns:

- TypeScript interfaces for models.
- Feature-first organization.
- Service-layer business logic.
- Provider interfaces for external data.
- Config files for weights and thresholds.
- Deterministic utility functions.
- Tests for calculation logic.
- React components render view models only.

Do not:

- Put provider imports in React pages.
- Put odds math in components.
- Hardcode vendors into features.
- Add prediction formulas casually.
- Introduce backend/API routes unless explicitly required.
- Refactor folders without explicit direction.
- Remove mock/replay support.
- Bypass RankingEngine when a market produces bet candidates.

When adding calculations:

- Put weights in a config file.
- Add tests.
- Document formulas.
- Keep fallback values neutral.
- Separate confidence from sportsbook odds.
- Include explainability.

## Documentation Standards

Every meaningful system should have a corresponding doc under `docs/`.

Existing docs include:

- `docs/ARCHITECTURE.md`
- `docs/API_PROVIDERS.md`
- `docs/PREDICTION_ENGINE_V1.md`
- `docs/RANKING_ENGINE.md`
- `docs/CALIBRATION_ENGINE.md`
- `docs/BACKTEST_ENGINE.md`
- `docs/ODDS_INTELLIGENCE.md`
- `docs/CORRELATION_ENGINE.md`
- `docs/BEST_BETS.md`
- `docs/TOTAL_BASES.md`
- `docs/TEAM_TOTALS.md`
- `docs/GAME_TOTALS.md`
- `docs/RUN_LINE.md`
- `docs/MATCHUP_INTELLIGENCE.md`
- `docs/PLAYER_INTELLIGENCE.md`
- `docs/ENVIRONMENTAL_INTELLIGENCE.md`
- `docs/LINEUP_MODEL.md`
- `docs/PRODUCT_BLUEPRINT.md`
- `docs/PROJECT_STATE.md`

Documentation should cover:

- Purpose.
- Architecture.
- Inputs.
- Outputs.
- Provider strategy.
- Replay/mock/live behavior.
- Scoring or formula details.
- Limitations.
- V2 roadmap.

If code changes behavior, update docs in the same PR.

## Git Workflow

Current branch:

```text
codex/trueline-rebrand
```

Current draft PR:

```text
https://github.com/tyeaster/DailyEdge/pull/5
```

Project history includes stacked feature work on `test-codex-auth`.

Expected workflow:

1. Check status before editing.
2. Avoid touching unrelated files.
3. Preserve user/local changes.
4. Keep commits focused.
5. Run validation before committing.
6. Push the current feature branch.
7. Update the existing draft PR.
8. Do not merge without review.

Known untracked local files at this handoff:

```text
app/globals.css
screenshots/
```

Do not stage or delete these unless the user explicitly directs it.

## Testing Workflow

Run before committing meaningful changes:

```bash
npm run lint
npm run build
npm test
npx tsc --noEmit
```

Current test runner:

```bash
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.ts
```

Test files are in:

```text
tests/
```

Current coverage:

- Many service/unit tests exist.
- Replay/provider tests exist for major providers.
- Market service tests exist.
- No coverage report exists.
- No e2e/browser test suite exists.

Future testing improvements:

- Add coverage script and thresholds.
- Add Playwright or equivalent route smoke tests.
- Add provider health integration tests isolated from unit tests.
- Add persistence/repository tests once database exists.

## How to Add a New Provider

Use this process:

1. Define a provider interface in `src/providers/<domain>/<Domain>Provider.ts`.
2. Define normalized request/response types.
3. Add a live provider implementation.
4. Add a replay provider implementation.
5. Add a mock provider implementation.
6. Add provider selection in `index.ts` or the relevant service.
7. Add cache behavior in the service layer.
8. Normalize vendor response shapes immediately.
9. Gracefully degrade to neutral values when data is missing.
10. Add replay fixtures under `replay/<domain>/`.
11. Add tests for live normalization, replay, mock, missing data, and caching.
12. Document the provider in `docs/API_PROVIDERS.md` or a domain-specific doc.

Provider code should not import React. React should not import provider code.

## How to Add a New Betting Market

Use the recent Total Bases market as the best current template:

```text
src/features/total-bases-intelligence/
  config.ts
  service.ts
  total-bases-intelligence-page.tsx

app/betting/total-bases/page.tsx
tests/total-bases-intelligence.test.ts
docs/TOTAL_BASES.md
```

Steps:

1. Create feature folder.
2. Create centralized config for weights and thresholds.
3. Create candidate interface.
4. Create view model interface.
5. Create service that loads Daily Slate or accepts a slate.
6. Consume normalized services only.
7. Calculate projection, fair line, edge, EV, confidence, recommendation, and explanations.
8. Convert candidates to `BetCandidate`.
9. Rank with `RankingEngineService`.
10. Create a page that renders only the view model.
11. Add route under `app/`.
12. Integrate with Best Bets if it is a bettable market.
13. Integrate with Daily Slate if it should surface on the main dashboard.
14. Add tests.
15. Add docs.
16. Run validation.

Do not add a new market by copying inline math into React.

## How to Add a New Intelligence Engine

An intelligence engine should be provider-independent and reusable.

Recommended structure:

```text
src/services/<engine>/
  types.ts
  config.ts
  EngineService.ts
  engines.ts
  normalization.ts
  index.ts
```

If product-specific, use:

```text
src/features/<engine-or-product>/
```

Use shared service location when multiple markets/pages will consume it. Use feature location when the intelligence is tightly scoped to one product page.

Steps:

1. Define normalized inputs.
2. Define normalized outputs.
3. Define scoring factors.
4. Put weights in config.
5. Keep calculations deterministic.
6. Include explainability.
7. Avoid provider imports unless this service is explicitly a domain service.
8. Add tests for normal, edge, missing-data, and explanation cases.
9. Document purpose, architecture, and limitations.

## Future Roadmap

Recommended next work order:

1. Production persistence layer.
2. Auth and admin route protection.
3. Live player-prop odds coverage.
4. Durable odds history recorder.
5. Historical results ingestion.
6. Calibration powered by real results.
7. Backtesting powered by real historical slates.
8. Live injuries provider and injury impact model.
9. Production cache adapter.
10. Interactive Best Bets filters and sorting.
11. Global search.
12. Entity research pages for players, teams, and ballparks.
13. Remove or redirect legacy `/team/*` routes.
14. E2E test suite.
15. Coverage thresholds.
16. Observability and provider health dashboard.
17. API licensing review and provider hardening.
18. Subscription/account architecture.
19. Mobile application planning.
20. Multi-sport abstraction review.

## Known Limitations

Current known limitations:

- No production database.
- No auth.
- No protected admin routes.
- Live injuries missing.
- Live player-prop odds incomplete.
- Historical results missing.
- Calibration not production-authoritative.
- Backtesting not production-authoritative.
- Odds Intelligence lacks durable recording.
- Search missing.
- UI filters and sorting incomplete.
- Some market calculations are deterministic approximations.
- PredictionEngine V1 is intentionally simple.
- Several provider sources require licensing review.
- Replay coverage is broad but not universal.
- Schedule replay is not implemented.
- README doc index is not fully current.
- `docs/PROJECT_STATE.md` is stale relative to recent systems.
- Duplicate market card patterns exist.
- Duplicate candidate normalization exists in places.
- Legacy `/team/*` routes remain.

## Practical First Steps for Claude Code

If taking over as Lead Engineer, start with:

1. Read this file.
2. Read `PROJECT_PRINCIPLES.md`.
3. Read `docs/PRODUCT_BLUEPRINT.md`.
4. Read `docs/ARCHITECTURE.md`.
5. Read `docs/PROJECT_STATE.md`, but treat it as partially stale.
6. Run `git status --short --branch`.
7. Run validation:

```bash
npm run lint
npm run build
npm test
npx tsc --noEmit
```

8. Inspect current PR #5.
9. Do not stage `app/globals.css` or `screenshots/` unless directed.
10. Prioritize production blockers before adding more model formulas.

## Final Engineering Guidance

TrueLine has enough V1 market breadth. The next lead engineer should resist the temptation to keep adding new betting surfaces before strengthening the foundation.

The highest-leverage work is:

- Real persistence.
- Real historical outcomes.
- Real prop odds.
- Real calibration.
- Admin security.
- Better production observability.

Once those are in place, the existing intelligence architecture will become much more valuable because TrueLine will be able to measure whether its claimed edge actually persists against the market.
