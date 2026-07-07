# Product Vision

This document summarizes TrueLine's product direction for engineers. It complements [`../PRODUCT_BLUEPRINT.md`](../PRODUCT_BLUEPRINT.md) and avoids duplicating the full blueprint.

## Mission

TrueLine exists to become the most trusted sports betting analytics platform by identifying mispriced markets through transparent, explainable predictive models.

TrueLine is not a picks service. It is an analytics platform.

The goal is not simply to predict winners. The goal is to find market value.

## Product Identity

TrueLine should feel like:

- Baseball Savant for betting context.
- FanGraphs for analytical depth.
- A trading terminal for market value.
- A research lab for props and game markets.

It should not feel like:

- A sportsbook.
- A hype-driven picks feed.
- A generic dashboard template.
- A black-box AI oracle.

## North Star User Question

Every feature should help answer:

```text
Where is the sportsbook market wrong, and why does TrueLine believe that?
```

Secondary questions:

- How strong is the model edge?
- How reliable is the data?
- What factors drive the recommendation?
- Has this type of edge historically performed?
- Did the market move toward TrueLine?
- Are my bets overly correlated?

## Target Users

Primary users:

- Serious sports bettors.
- Value bettors.
- DFS players.
- Sports analytics users.
- Model-curious bettors who want transparent reasoning.

Secondary users:

- Content creators.
- Betting analysts.
- Sports researchers.
- Advanced fans.
- Future B2B/internal trading users.

## Core Product Pillars

### 1. Daily Slate

The homepage should summarize today's MLB betting environment:

- Games.
- Best bets.
- Weather concerns.
- Injury/lineup context.
- Bullpen fatigue.
- Top model edges.
- Highest-confidence recommendations.
- Biggest market disagreements.

Current implementation:

- `src/features/daily-slate-intelligence/`
- `app/page.tsx`

### 2. Best Bets

Best Bets is the unified recommendation board across markets.

Current route:

```text
/best-bets
```

It should become the primary betting workflow after Daily Slate.

### 3. Research Labs

Research Labs answer market-specific questions:

- Strikeouts: Is this pitcher likely to clear the strikeout line?
- Hits: Is this hitter likely to get a hit?
- Total Bases: Is this hitter likely to exceed the total-base line?
- Home Runs: Which hitters have the best HR opportunity?
- Moneyline: Which team should win and why?
- Run Line: Which team has cover value?
- Team Totals: Which teams are mispriced for runs?
- Game Totals: Which games are mispriced for over/under?

### 4. Intelligence Engines

Engines produce reusable analytics:

- PredictionEngine.
- RankingEngine.
- MatchupService.
- PlayerIntelligenceService.
- CalibrationService.
- BacktestingService.
- OddsIntelligenceService.
- CorrelationEngineService.

### 5. Trust Layer

The trust layer is not a single feature. It is the combination of:

- Explainability.
- Historical calibration.
- Backtesting.
- CLV.
- Data quality.
- Source transparency.
- Correlation/exposure warnings.

## Product Completion Direction

The product currently has broad market coverage. The next product phase should prioritize:

1. Make Best Bets operationally useful.
2. Add real filters and sorting.
3. Add search.
4. Add production historical performance.
5. Add CLV timelines with durable odds history.
6. Add live injury impact.
7. Improve prop odds completeness.
8. Protect admin analytics.

## Product Anti-Patterns

Avoid:

- Adding new pages without data quality.
- Adding model formulas without calibration plans.
- Showing unsupported precision.
- Presenting mock data as live truth.
- Hiding missing inputs.
- Ranking bets without explaining why.
- Optimizing for win percentage instead of expected value.

## Product Roadmap Relationship

Use these documents together:

- [`../PRODUCT_BLUEPRINT.md`](../PRODUCT_BLUEPRINT.md): long-term product specification.
- [`ROADMAP_MASTER.md`](ROADMAP_MASTER.md): implementation-oriented roadmap.
- [`BETTING_PHILOSOPHY.md`](BETTING_PHILOSOPHY.md): market-value philosophy.
- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md): engineering state and system overview.

