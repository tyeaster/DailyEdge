# TrueLine Model Intelligence Layer

The Model Intelligence Layer makes Prediction Engine V1 configurable,
inspectable, and honest about the quality of its inputs. It does not add a new
data provider or change the engine's public input interface.

Related documents:

- [Project Principles](../PROJECT_PRINCIPLES.md)
- [Prediction Engine V1](PREDICTION_ENGINE_V1.md)
- [Team Strength Model](TEAM_STRENGTH_MODEL.md)
- [Project State](PROJECT_STATE.md)

## Weight Configuration

Every prediction weight lives in
`src/services/predictions/config.ts`.

| Factor | Weight | Current status |
| --- | ---: | --- |
| Starting pitcher | 24% | Active |
| Season strength | 12% | Active |
| Team offense | 10% | Active |
| Team pitching | 12% | Active |
| Recent form | 12% | Active when rolling data is available |
| Momentum | 8% | Active when 7-game and 30-game data are available |
| Bullpen | 6% | Active when data is available; neutral otherwise |
| Lineup strength | 10% | Active for confirmed or projected lineups |
| Home field | 4% | Active |
| Sportsbook market | 2% | Active |

The weights sum to 100%. Season strength, recent form, and momentum remain
separate so short-window performance does not replace the larger season sample.

## Model Breakdown

Every `PredictionResult` includes a `ModelBreakdown`.

For each factor, the breakdown reports:

- Human-readable label.
- Configured weight.
- Normalized probability-like factor value.
- Availability.
- Contribution in percentage points relative to a neutral `50%` input.

The contribution formula is:

```text
contribution percentage points =
  (factor probability - 0.50) *
  factor weight /
  total configured weight *
  100
```

Unavailable inputs have a neutral model value and a reported contribution of
zero. The total contribution is the sum of the available factor contributions.
This ledger is intended for diagnostics and future model-analysis screens.

## Explainability

Explanation generation remains inside `PredictionEngine`.

The engine can identify:

- Better Starting Pitcher.
- Better Team Offense.
- Better Team Pitching.
- Better Bullpen.
- Stronger Confirmed Lineup or Projected Lineup Edge.
- Fewer Missing Stars.
- Better Run Differential.
- Better Overall Rating.
- Better Recent Form.
- Better Recent Offense.
- Better Recent Pitching.
- Positive Momentum.
- Superior Recent Run Differential.
- Strong Home Field Advantage.
- Sportsbook Market reference.
- Selected value side.

An explanation is emitted only when the required normalized data exists and
the difference is meaningful. Missing data is reported by `DataQuality`, not
presented as a competitive reason.

## Data Quality

Every prediction includes a deterministic `DataQuality` score from `0` to
`100`.

| Input group | Quality weight |
| --- | ---: |
| Starting pitchers | 25 |
| Team statistics | 20 |
| Bullpen | 15 |
| Starting lineups | 15 |
| Sportsbook market | 10 |
| Recent form | 10 |
| Weather | 5 |

Each input group is marked `available`, `partial`, or `missing` and includes
its source. Two-sided inputs, such as starting pitchers, receive partial credit
when only one side is available.

```text
data quality =
  sum(input completeness * quality weight) /
  sum(quality weights)
```

Current predictions receive lineup quality in proportion to confirmation
confidence. Confirmed lineups receive full credit, projected lineups receive
partial credit, and unavailable lineups receive no credit. Live slates without
weather data still score lower.

Confidence is capped at the Data Quality score:

```text
final confidence = min(raw confidence, data quality)
```

This prevents a large apparent edge or strong factor agreement from producing
high confidence when the supporting inputs are incomplete.

## Developer Diagnostics

`PredictionDiagnosticsService` converts a `PredictionResult` into a
developer-focused diagnostics record containing:

- Prediction version.
- Current weight configuration.
- Data Quality and per-input status.
- Input sources.
- Missing inputs.

The diagnostics service is not imported by React components and does not add
content to the Daily Slate. It is available for tests, development tooling,
future logs, and future internal model-analysis views.

## Current Boundaries

- Bullpen quality and workload are live, but role changes and individual
  day-to-day availability are not yet modeled.
- Weather remains schedule-derived placeholder data and is not an engine input.
- Recent form and momentum are deterministic and not opponent-adjusted.
- Injuries, park factors, travel, rest, and advanced metrics remain outside V1.
- Model weights and quality weights are deterministic configuration, not
  historically calibrated coefficients.

Future inputs should extend normalized data and diagnostics while preserving
the existing provider, service, and UI boundaries.
