# Project Memory

This document captures the important architectural decisions and development rationale behind TrueLine. It is intended to preserve context that would otherwise live only in prior implementation conversations.

Related:

- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md)
- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md)
- [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md)
- [`../PRODUCT_BLUEPRINT.md`](../PRODUCT_BLUEPRINT.md)

## Foundational Product Decision

TrueLine was defined as an analytics platform, not a picks service.

The central product claim is:

```text
Find market value through transparent, explainable predictive models.
```

This drove almost every architecture choice:

- Model outputs must be explainable.
- Odds and confidence must remain separate.
- Market edge matters more than raw win probability.
- Historical calibration and CLV eventually matter as much as projections.

## Why the Provider Abstraction Exists

Provider abstraction exists to prevent vendor lock-in and keep the UI independent from data source choices.

Systems created around providers:

- Odds providers.
- Weather providers.
- Ballpark providers.
- Bullpen providers.
- Lineup providers.
- Pitcher providers.
- Team strength providers.
- Recent form providers.
- Player intelligence providers.
- Matchup providers.

Rejected alternative:

- Calling vendor APIs directly from pages or feature services.

Why rejected:

- It would leak vendor response shapes into the product.
- It would make provider swaps expensive.
- It would make replay/mock difficult.
- It would increase the risk of secrets reaching client code.

## Why Replay Exists

Replay mode exists because live sports APIs are rate-limited, fragile, and sometimes paid.

Replay supports:

- Deterministic local development.
- Provider contract tests.
- Reduced API usage.
- Offline work.
- Debugging against captured responses.

Rejected alternative:

- Live-only development.

Why rejected:

- Live-only tests are flaky.
- Paid provider usage would increase.
- API outages would block development.
- Historical debugging would be difficult.

## Why Mock Providers Exist

Mock providers exist so the product remains usable when live data is missing or unavailable.

Mock data supports:

- UI development.
- Service tests.
- Graceful fallbacks.
- Empty-state avoidance.
- Architecture validation before providers are complete.

Important assumption:

Mock data should never be represented as live truth. UI should surface mock/fallback status where relevant.

## Why Deterministic Scoring Was Chosen

Version 1 uses deterministic scoring rather than machine learning.

Reasons:

- Historical data persistence does not exist yet.
- Calibration is not production-ready.
- Explainability is a core principle.
- Deterministic scores are easier to test.
- Inputs are still improving.
- Product needs transparent reasoning before advanced modeling.

Rejected alternative:

- Building complex prediction formulas or black-box ML immediately.

Why rejected:

- It would overfit weak or incomplete data.
- It would be hard to explain.
- It would create false confidence.
- There is no durable historical training/evaluation pipeline yet.

## Why Explainability Is Core

Explainability exists because users should not blindly trust TrueLine.

Every recommendation should answer:

- What does the model project?
- What does the market imply?
- Where is the edge?
- What factors drive the output?
- What data quality supports it?
- What could invalidate it?

This informed:

- Prediction explanations.
- Model breakdowns.
- Factor cards.
- Ranking explanations.
- Best Bets reason lists.
- Correlation warnings.

Rejected alternative:

- Single-score recommendations without reasons.

Why rejected:

- Reduces trust.
- Makes debugging difficult.
- Makes calibration failures harder to diagnose.

## Why PredictionEngine Was Kept Stable

After V1, the project shifted away from adding prediction formulas and toward improving inputs.

Rationale:

- The model foundation was enough for V1.
- Better data should precede more complex math.
- Weather, ballpark, bullpen, lineups, player intelligence, and matchup data improved model inputs without changing the interface.

Assumption:

Future PredictionEngine improvements should be calibrated against historical data, not added ad hoc.

## Why RankingEngine Was Created

RankingEngine was created so all betting opportunities could be compared through one common model.

Before RankingEngine, each market could produce its own recommendation but not easily compare with other markets.

RankingEngine enables:

- Best Bets.
- Cross-market comparison.
- Correlation engine input.
- Calibration grouping.
- Backtesting filters.
- Common grades and risk tiers.

Rejected alternative:

- Separate ranking logic inside every market page.

Why rejected:

- Duplicates scoring logic.
- Makes Best Bets harder.
- Makes market comparison inconsistent.

## Why Best Bets Exists

Best Bets was created as the unified recommendation board.

It aggregates:

- Strikeouts.
- Hits.
- Total Bases.
- Home Runs.
- Moneyline.
- Run Line.
- Team Totals.
- Game Totals.

Assumption:

Best Bets should become the primary recommendation workflow after Daily Slate.

Current limitation:

Interactive filters/search are incomplete.

## Why Correlation Engine Exists

Correlation Engine exists because ranked bets are not independent.

Examples:

- A hitter HR, hitter hits, hitter total bases, and team total can all depend on the same offense.
- A moneyline and run line on the same team are related.
- A game over and multiple hitter overs are related.

Rejected alternative:

- Showing Top 10 bets as independent picks.

Why rejected:

- Misrepresents portfolio risk.
- Encourages overexposure.
- Makes backtesting less realistic.

## Why Calibration and Backtesting Were Created Early

Calibration and Backtesting were created before production persistence to define the evaluation architecture.

Reasons:

- TrueLine must eventually prove performance.
- Confidence scores must be measured.
- Market edges must be evaluated historically.
- ROI and CLV must become part of the trust layer.

Current limitation:

- These systems are scaffolds until backed by durable historical data.

## Why Odds Intelligence Exists

Odds Intelligence exists to measure whether TrueLine beats market movement.

CLV is a key trust metric because even losing bets can be good decisions if they consistently beat closing price.

Rejected alternative:

- Evaluate only win/loss outcomes.

Why rejected:

- Short-term results are noisy.
- CLV is often a better signal of market value.

## Why Daily Slate Is Central

Daily Slate is the top-level product context.

It should answer:

- What games are today?
- Which markets matter?
- What weather matters?
- Which lineups and bullpens matter?
- Which bets rank highest?

Assumption:

Users should be able to start at Daily Slate and drill into labs.

## Why Market-Specific Labs Exist

Different markets require different reasoning.

Examples:

- Strikeouts need pitch count, opponent contact, and lineup K profile.
- Home runs need barrel quality, wind, park, pitch type, and zone.
- Total Bases need hard contact, slugging, pitch/zone match, batting order, and bullpen.
- Moneyline needs team-level and game-level context.

Rejected alternative:

- One generic bet card for all research.

Why rejected:

- Loses market-specific explainability.
- Makes product feel shallow.

## Version 1 Assumptions

V1 assumes:

- Deterministic scores are acceptable before calibration.
- Missing data should degrade to neutral values.
- Confidence should decrease when data quality is poor.
- Mock/replay/live should remain interchangeable.
- MLB is the production proving ground.
- Current models should not claim calibration.
- In-memory cache is acceptable for local development.
- Admin pages can exist before auth only while not production-shipped.

## Version 1 Known Weaknesses

- No production database.
- No auth.
- No full live prop odds.
- No live injuries.
- No durable historical results.
- No durable odds history.
- No production cache.
- Limited search/filter UI.
- No e2e tests.
- Stale docs in places.
- Some duplicate market adapters/cards.

## What Version 2 Should Improve

V2 should prioritize:

1. Persistence.
2. Auth.
3. Live prop data.
4. Historical results.
5. Calibration.
6. CLV tracking.
7. Injuries.
8. Production cache.
9. Search/filter UX.
10. Observability.
11. E2E testing.
12. Refactoring duplication after production workflows stabilize.

## Architectural Assumptions to Preserve

Preserve these unless there is a deliberate redesign:

- Providers hide vendors.
- Services own business logic.
- React renders view models.
- RankingEngine ranks all bet candidates.
- Replay/mock/live remain first-class.
- Weights live in config.
- Calculations are deterministic and tested.
- Explainability is required.
- Confidence is separate from odds.

