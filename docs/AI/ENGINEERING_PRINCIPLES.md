# Engineering Principles

This document defines the engineering standards for continuing TrueLine development. It complements the project constitution in [`../../PROJECT_PRINCIPLES.md`](../../PROJECT_PRINCIPLES.md) and the onboarding handoff in [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md).

## Primary Principle

TrueLine is a model and market-value product. Engineering decisions should protect prediction quality, explainability, vendor independence, and long-term maintainability before adding new visual surfaces.

The UI exists to present intelligence. The model, data quality, and market-value logic are the product.

## Engineering Priorities

Order priorities this way:

1. Correctness.
2. Explainability.
3. Testability.
4. Provider independence.
5. Maintainability.
6. Performance.
7. Visual polish.

This does not mean visual quality is optional. It means polish should not outrank reliable data, deterministic calculations, or clear domain boundaries.

## Non-Negotiable Boundaries

React components must not:

- Call live providers directly.
- Contain prediction logic.
- Contain odds math.
- Select vendors.
- Know whether data came from live, replay, or mock mode.
- Duplicate service calculations.

Services must:

- Consume normalized data.
- Own business logic.
- Return typed view models.
- Include graceful fallbacks.
- Keep calculations deterministic.
- Expose explainability.

Providers must:

- Hide vendor response shapes.
- Normalize external data.
- Support mock and replay where possible.
- Be cacheable.
- Keep secrets server-side.

## Domain Integrity

Use domain language precisely:

- `confidence` is the model's certainty, not sportsbook price.
- `edge` is the difference between model probability and market implied probability.
- `expectedValue` is the estimated return expectation from model probability and odds.
- `fairLine` is the odds or line implied by TrueLine's model.
- `recommendation` is a decision tier, not a raw probability.
- `dataQuality` measures available input completeness and source confidence.

Do not merge these concepts into vague labels.

## Data Quality Is Product Quality

Prediction quality is constrained by input quality. When deciding between adding another formula and improving a data source, prefer the data source unless the model has a proven measurement gap.

Current high-value data gaps:

- Live injuries.
- Full live player-prop odds.
- Durable historical results.
- Durable odds history.
- Defense, travel, and rest.
- Production-calibrated outcomes.

## Deterministic Calculations

Critical calculations must be deterministic:

- Odds conversion.
- Implied probability.
- Vig removal.
- Fair line.
- Edge.
- Expected value.
- Confidence.
- Ranking.
- Calibration summaries.
- Backtesting math.
- Correlation/exposure scoring.

Given the same inputs, the same service should produce the same output. Avoid hidden state and UI-only math.

## Explainability Requirement

Every recommendation should include structured reasons.

Good explanations are specific:

- "Pitch Match favors the hitter."
- "Confirmed lineup improves data quality."
- "Bullpen workload increases late-game opportunity."
- "Wind and park context support run scoring."

Weak explanations are vague:

- "Good model output."
- "Strong pick."
- "High confidence."

For new markets or engines, include:

- Factor scores.
- Factor weights.
- Short explanations.
- Supporting details.
- Final recommendation summary.

## Provider Independence

Never let OddsPipe, MLB, Baseball Savant, Open-Meteo, or any future vendor shape the product model directly.

Provider-specific details belong in `src/providers/**` or low-level provider services. Feature services and UI should consume normalized models.

Related docs:

- [`../../docs/API_PROVIDERS.md`](../API_PROVIDERS.md)
- [`../../docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md)

## Mock, Replay, and Live Are First-Class

TrueLine should remain usable in all three modes:

- Live for real data.
- Replay for deterministic local testing.
- Mock for graceful fallback and synthetic development.

Do not add a provider without considering replay and mock support.

## Production Readiness Bias

The current codebase already has broad V1 product coverage. Future work should prioritize:

- Persistence.
- Auth.
- Historical data.
- Calibration.
- Prop odds.
- Monitoring.
- Production cache.

Avoid adding new betting markets unless the user explicitly prioritizes them.

## Review Checklist

Before merging meaningful work, answer:

- Does this improve prediction quality or product clarity?
- Does business logic stay out of React?
- Are providers hidden behind interfaces?
- Are calculations deterministic?
- Are tests included for important math?
- Does missing data degrade gracefully?
- Is confidence separate from odds?
- Are docs updated?
- Are unrelated files untouched?

