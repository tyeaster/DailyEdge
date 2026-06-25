# TrueLine Prediction Engine V1

This document describes the first production rules-based prediction engine for TrueLine.

V1 is intentionally simple. It uses only normalized data already available in the application, produces deterministic outputs, and avoids claims of advanced baseball modeling.

Related documents:

- [Project Principles](../PROJECT_PRINCIPLES.md)
- [MLB Model Specification](MODEL_SPEC.md)
- [MLB Model V1 Design](MODEL_SPEC_V1.md)
- [Scoring](SCORING.md)

## Purpose

Prediction Engine V1 replaces static mock game predictions with calculated results.

It produces:

- Home win probability
- Away win probability
- Projected home runs
- Projected away runs
- Projected total runs
- Home fair moneyline
- Away fair moneyline
- Sportsbook moneyline
- Sportsbook implied probability
- Edge percentage
- Expected value
- Confidence score
- Recommendation
- Explainable model factors
- Per-factor model breakdown
- Data Quality score
- Prediction version

The engine consumes normalized TrueLine models. It does not call MLB or sportsbook APIs directly.

## Architecture

`PredictionEngine` accepts normalized games, teams, pitchers, and sportsbook odds. Provider selection remains outside the engine.

```text
Live, replay, or mock providers
  -> normalized TrueLine models
  -> PredictionEngine
  -> PredictionResult
  -> Daily Slate service
  -> React components
```

This preserves live, replay, and mock modes without changing the model interface.

Future inputs can be added to normalized models or an engine context without changing the public `predictGame` and `predictSlate` responsibilities.

## Inputs

V1 uses:

- Home team
- Away team
- Team offense rating
- Team pitching rating
- Season overall rating
- Recent Form Rating
- Momentum Score
- Bullpen rating when available
- Home field advantage
- Starting pitcher ERA, WHIP, and strikeout rate when available
- Sportsbook moneyline
- Sportsbook implied probability
- Sportsbook game total

Missing statistics use neutral values. The engine never invents unavailable pitcher or team performance data.

## Configurable Weights

All V1 weights live in `src/services/predictions/config.ts`.

| Factor | Weight |
| --- | ---: |
| Starting pitcher | 24% |
| Season strength | 14% |
| Team offense | 14% |
| Team pitching | 12% |
| Recent form | 12% |
| Momentum | 8% |
| Bullpen | 6% |
| Home field | 6% |
| Sportsbook implied probability | 4% |

The weights sum to 100%.

Starting pitcher receives the highest weight. The sportsbook is a low-weight market reference and does not replace the model.

## Factor Normalization

Every factor becomes a home-team probability-like score between `0` and `1`.

### Starting Pitcher

Available pitcher fields are individually normalized:

```text
ERA score = clamp((5.00 - ERA) / 3.00, 0, 1)
WHIP score = clamp((1.50 - WHIP) / 0.70, 0, 1)
Strikeout score = clamp((K% - 15) / 20, 0, 1)
```

Only available non-zero fields are averaged.

```text
Pitcher quality = average(available normalized pitcher fields)
Pitcher factor = 0.50 + (home quality - away quality) * 0.25
```

If pitcher statistics are unavailable, that pitcher receives a neutral `0.50` quality score.

These ranges are transparent V1 normalization bounds, not a trained baseball model.

### Team Strength

```text
home factor =
  home rating /
  (home rating + away rating)
```

This comparison is applied independently to offense, team pitching, and
bullpen ratings.

Missing or unavailable ratings use `50`, producing a neutral factor when both
teams lack the same input.

See [TEAM_STRENGTH_MODEL.md](TEAM_STRENGTH_MODEL.md) for raw metrics and rating
formulas.

### Recent Form and Momentum

The normalized `Team` model includes rolling 7, 14, and 30-game statistics.

```text
recent-form factor =
  home RecentFormRating /
  (home RecentFormRating + away RecentFormRating)

momentum factor =
  home MomentumScore /
  (home MomentumScore + away MomentumScore)
```

See [RECENT_FORM_MODEL.md](RECENT_FORM_MODEL.md) for the rating, trend, and
missing-data formulas.

### Home Field

The configurable V1 home-field signal is:

```text
Home field factor = 0.54
```

This is a simple model input, not a park-specific estimate.

### Sportsbook

American odds are converted to implied probability:

For positive odds:

```text
implied probability = 100 / (odds + 100)
```

For negative odds:

```text
implied probability = abs(odds) / (abs(odds) + 100)
```

V1 uses the normalized home-side implied probability as a low-weight factor.

## Final Win Probability

```text
home probability =
  pitcher factor * 0.24 +
  season-strength factor * 0.14 +
  offense factor * 0.14 +
  team pitching factor * 0.12 +
  recent-form factor * 0.12 +
  momentum factor * 0.08 +
  bullpen factor * 0.06 +
  home field factor * 0.06 +
  sportsbook factor * 0.04
```

The implementation divides by total configured weight so future weight changes remain normalized.

Home probability is bounded between `25%` and `75%`.

```text
away probability = 1 - home probability
```

The team with the higher probability is the predicted winner.

## Projected Runs

V1 does not contain a run-production model.

When a sportsbook total is available:

```text
projected total runs = sportsbook total
```

When it is unavailable:

```text
projected total runs = 8.6
```

The total is divided using the model win probabilities:

```text
projected home runs = projected total * home win probability
projected away runs = projected total - projected home runs
```

This is a display-oriented V1 estimate and should be replaced by an independent run model in Version 2.

## Fair Moneyline

Model probability is converted to American odds.

For probability at or above `50%`:

```text
fair line = -100 * probability / (1 - probability)
```

For probability below `50%`:

```text
fair line = 100 * (1 - probability) / probability
```

The result is rounded to the nearest whole American odds value.

## Edge

Edge compares model probability with sportsbook implied probability for the selected value side.

```text
edge percent =
  (model probability - sportsbook implied probability) * 100
```

The selected value side is the team with the larger calculated edge. This can differ from the predicted winner.

## Expected Value

Expected value is calculated per one unit risked.

For positive American odds:

```text
profit per unit = odds / 100
```

For negative American odds:

```text
profit per unit = 100 / abs(odds)
```

Then:

```text
EV percent =
  (
    model probability * profit per unit
    - (1 - model probability)
  ) * 100
```

Positive EV means the model believes the offered price has long-term value.

## Confidence

Confidence is deterministic and separate from sportsbook odds.

It begins at `35` and adds:

- Up to `25` points for probability clarity.
- Up to `20` points for edge strength.
- Up to `20` points when model factors agree on direction.

```text
clarity =
  min(1, abs(home probability - 0.50) / 0.20)

edge strength =
  min(1, max(0, edge percent) / 10)

agreement =
  abs(positive factor count - negative factor count) /
  total factor count

raw confidence =
  min(
    100,
    35 +
    clarity * 25 +
    edge strength * 20 +
    agreement * 20
  )

final confidence =
  min(raw confidence, data quality)
```

Teams close to `50%`, small edges, and conflicting factors produce lower confidence.
Incomplete inputs cap confidence even when the raw signals appear strong.

## Model Breakdown

Every factor reports its normalized value, configured weight, availability,
and percentage-point contribution relative to a neutral `50%` input.

```text
factor contribution =
  (factor probability - 0.50) *
  factor weight /
  total configured weight *
  100
```

Unavailable inputs report zero contribution. See
[MODEL_INTELLIGENCE.md](MODEL_INTELLIGENCE.md) for the full diagnostics
contract.

## Data Quality

Every prediction receives a `0` to `100` Data Quality score based on the
availability of:

- Starting pitchers.
- Team statistics.
- Bullpen.
- Sportsbook market.
- Recent form.
- Weather.

Each group reports an availability status and source. This score is separate
from model probability, edge, and sportsbook odds.

## Recommendation Thresholds

Recommendations require edge, positive EV, and minimum confidence.

| Recommendation | Minimum Edge | Minimum EV | Minimum Confidence |
| --- | ---: | ---: | ---: |
| Best Bet | 8.0% | 5.0% | 75 |
| Strong Play | 5.0% | 3.0% | 70 |
| Play | 3.0% | 1.0% | 60 |
| Lean | 0.1% | 0.1% | 0 |
| Pass | Below all thresholds | Below all thresholds | Any |

Thresholds are configurable in `src/services/predictions/config.ts`.

## Explainability

Every `PredictionResult` includes an explanation array.

V1 explanations identify:

- Better starting pitcher.
- Better team offense.
- Better team pitching.
- Better bullpen.
- Fresher bullpen.
- Better run differential.
- Better overall rating.
- Better recent form.
- Better recent offense.
- Better recent pitching.
- Positive momentum.
- Superior recent run differential.
- Strong home field advantage.
- Sportsbook probability as a low-weight reference.
- Selected value side.

Explanations are emitted only when the required data is available. React
components render them but do not create them.

## Testing

Automated tests cover:

- American odds to implied probability.
- Implied probability to fair moneyline.
- Vig removal utility.
- Edge calculation.
- Expected value.
- Confidence behavior.
- Recommendation thresholds.
- Deterministic complete prediction output.
- Recommendation record generation.
- Weight configuration.
- Model breakdown calculations.
- Data Quality and missing-data behavior.
- Confidence quality caps.
- Developer diagnostics.
- Recent-form and momentum integration.

## Current Limitations

- Starting pitcher data from the live schedule may include identity without ERA, WHIP, or strikeout rate. Missing fields remain neutral.
- Team strength uses season-to-date official MLB totals and deterministic V1 rating ranges.
- Recent form uses official rolling statistics and deterministic V1 rating ranges.
- Recent form is not opponent-adjusted.
- Bullpen quality uses official relief-pitcher aggregates and a three-day
  workload window.
- Projected runs use the sportsbook total rather than an independent run model.
- V1 does not remove vig from every live market pairing before the sportsbook factor is used.
- No historical training, backtesting, calibration, or model fitting is included.
- No weather, injury, bullpen, park, travel, rest, lineup, or advanced-stat inputs are included.
- Player prop predictions remain outside this game-level V1 engine.

## Version 2 Priorities

The inputs most likely to improve accuracy are:

1. Starting pitcher advanced metrics and projected workload.
2. Team offensive handedness splits and lineup-level quality.
3. Bullpen quality, availability, and recent workload.
4. Confirmed lineups and injuries.
5. Park factors.
6. Weather, especially wind, temperature, and roof status.
7. Travel and rest.
8. Line movement and no-vig market consensus.
9. Historical backtesting and probability calibration.

These additions should extend normalized engine inputs while preserving the provider and service boundaries.
