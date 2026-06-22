# DailyEdge Project Principles

This document is the engineering constitution for DailyEdge. It should guide every engineer, designer, product contributor, and AI coding agent working on the project.

DailyEdge is a prediction and market-value product first. The application should be built so the model can improve, explain itself, and scale across sports without forcing rewrites of the user experience or data architecture.

## 1. The Prediction Model Is the Product

The prediction model is the core product. The UI exists to present model outputs clearly, quickly, and responsibly.

Visual features are valuable only when they help users understand:

- What the model believes.
- Why the model believes it.
- Where the market price differs from the model.
- How confident DailyEdge is in the recommendation.

Prediction accuracy takes priority over visual features, cosmetic polish, and dashboard expansion. A beautiful interface that presents weak or unclear predictions is not a successful product.

## 2. DailyEdge Exists to Find Market Value

DailyEdge is not simply a winner-picking application. The purpose is to identify market value, also known as edge.

Every recommendation should be grounded in the relationship between:

- The sportsbook price.
- The model probability.
- The fair line.
- The expected value.
- The confidence score.

A team can be likely to win and still be a bad bet. A player prop can be risky and still be valuable at the right price. DailyEdge must preserve that distinction throughout the model, services, and UI.

## 3. Confidence Is Separate From Odds

Model confidence must always remain separate from sportsbook odds.

Sportsbook odds describe market price. Confidence describes the model's certainty in its own projection. These are related inputs for decision-making, but they are not the same concept and should not be merged into a single ambiguous score.

Every recommendation should make this separation clear in data structures, calculations, documentation, and presentation.

## 4. Every Prediction Must Be Explainable

Every prediction should expose explainable reasoning.

Reasoning does not need to reveal proprietary model internals, but it should communicate the key factors behind the output. Examples include pitcher matchup, lineup context, weather, park factor, injury impact, line movement, bullpen availability, or player form.

Users should be able to understand why DailyEdge surfaced a recommendation without reverse-engineering the model.

## 5. Keep APIs Vendor-Agnostic

Every external API must be accessed through interfaces. No feature should depend directly on a vendor's response shape, SDK, authentication pattern, or naming convention.

Rules:

- Never hardcode sportsbook vendors or odds providers into React components.
- Never let UI code import provider implementations.
- Never let one vendor's terminology become the domain model unless it is truly universal.
- Always normalize external data before it reaches feature code.

OddsPipe, The Odds API, SportsDataIO, Pinnacle, FanDuel, DraftKings, and future providers should be interchangeable behind provider contracts.

## 6. Business Logic Belongs in Services

Business logic belongs in services, not React components.

React components should render typed props, handle local interaction, and present loading or error states. They should not calculate fair lines, remove vig, choose providers, fetch vendor APIs, rank bets, or decide recommended units.

Service and utility layers should own:

- Data access.
- Provider selection.
- Normalization.
- Caching.
- Scoring.
- Fair-line calculations.
- Recommendation shaping.
- Fallback behavior.

This keeps the UI stable as the model and data architecture evolve.

## 7. Calculations Must Be Deterministic and Testable

All calculations should be deterministic, testable, and documented.

Critical prediction calculations require automated testing. This includes odds conversion, implied probability, vig removal, fair-line generation, edge percentage, expected value, value ratings, and recommended units.

Given the same inputs, calculation utilities should return the same outputs. Avoid hidden state, implicit time dependencies, or UI-only math in prediction logic.

## 8. Cache Before Scaling API Usage

DailyEdge should cache before scaling API usage.

Live sports data can be expensive, rate-limited, and operationally fragile. Before increasing request volume, add or improve cache behavior, replay workflows, and provider fallbacks.

Cache policy should be explicit:

- Odds can refresh frequently.
- Schedule data can refresh less often.
- Weather and injury data should match the volatility of the source.
- Replay mode should support local development without live API calls.

Future cache implementations such as Redis, Cloudflare KV, and Vercel KV should plug into shared cache contracts.

## 9. Prioritize Security

Secrets must never be exposed to the client.

API keys, provider credentials, billing secrets, account tokens, and signing keys belong on the server side or in secure deployment configuration. Public client bundles should never contain private credentials.

Provider integrations must be designed with a clear boundary between server-safe data access and client-safe presentation.

## 10. Maintainability Beats Cleverness

Optimize for maintainability over cleverness.

DailyEdge should favor clear names, explicit types, small modules, and predictable boundaries. Avoid abstractions that exist only to appear sophisticated. Add abstractions when they reduce real duplication, protect vendor boundaries, or support multi-sport scale.

Future engineers should be able to understand the system quickly and change it safely.

## 11. Favor Long-Term Architecture

Favor long-term architecture over short-term feature velocity.

Fast product iteration matters, but not at the cost of corrupting the model boundary, provider strategy, calculation integrity, or security posture. Temporary shortcuts should be rare, documented, and easy to remove.

When a feature pressures the architecture, improve the architecture instead of bypassing it.

## 12. Build for Every Sport, Starting With MLB

DailyEdge starts with MLB, but the architecture should support NBA, NFL, WNBA, NHL, Soccer, and future sports.

Shared abstractions should be used where concepts are common:

- Games.
- Teams.
- Players.
- Odds.
- Props.
- Predictions.
- Confidence.
- Edge.
- Providers.
- Services.
- Caching.

Sport-specific models should exist where the domain requires them. Do not force MLB-only assumptions into shared layers.

## 13. Design Mobile-First

Design mobile-first.

DailyEdge should be usable when users are scanning today's slate quickly. Layouts should adapt cleanly to narrow screens, preserve readable data density, and avoid horizontal overflow.

Mobile-first does not mean simplistic. It means prioritizing clarity, hierarchy, and touch-friendly interaction before expanding into richer desktop layouts.

## 14. Documentation Evolves With the Codebase

Documentation should evolve with the codebase.

When architecture, model behavior, provider strategy, scoring rules, or development workflow changes, the relevant documentation should change in the same pull request.

Documentation is not separate from engineering quality. It is how the next contributor understands the system without rediscovering the same decisions.

## 15. Engineering Review Standard

Before merging meaningful work, contributors should be able to answer:

- Does this improve or protect prediction quality?
- Does this preserve the separation between model, service, provider, and UI layers?
- Are external vendors hidden behind interfaces?
- Are critical calculations deterministic and tested?
- Are secrets protected from the client?
- Can this pattern scale beyond MLB?
- Does the documentation still match the system?

If the answer is unclear, the work needs more design before it needs more code.
