# TrueLine Team Strength Model

## Purpose

The Team Strength Model converts normalized MLB season statistics into simple, deterministic ratings that Prediction Engine V1 can compare across teams.

It is intentionally transparent. The ratings are not trained coefficients and should not be presented as a complete measure of team quality.

The model supports live, replay, and mock providers through the same interface.

## Data Source

Live mode uses the official MLB Stats API team season endpoints:

```text
/api/v1/teams/{teamId}/stats?stats=season&group=hitting&season={season}
/api/v1/teams/{teamId}/stats?stats=season&group=pitching&season={season}
```

Responses are normalized inside the provider layer before reaching the service, prediction engine, or UI.

Team-strength lookups are cached for one hour.

## Normalized Types

### TeamStrength

Contains:

- Offensive rating.
- Pitching rating.
- Bullpen rating.
- Overall team rating.
- Data source.
- Fetch timestamp.

### OffensiveRating

Contains:

- Runs per game.
- OPS.
- Batting average.
- Team strikeout rate.
- Team walk rate.
- Rating from 0 to 100.
- Availability status.

### PitchingRating

Contains:

- Runs allowed per game.
- Team ERA.
- Team WHIP.
- Rating from 0 to 100.
- Availability status.

### BullpenRating

Contains:

- Season bullpen ERA.
- Season bullpen WHIP.
- Strikeout rate.
- Season innings pitched.
- Recent pitches, innings, appearances, and relievers used.
- Workload availability rating.
- Rating from 0 to 100.
- Availability status.

Bullpen data is enriched by `BullpenService` after the season team-strength
profile is loaded.

### OverallTeamRating

Contains:

- Overall rating from 0 to 100.
- Run differential.
- Availability status.

## Raw Metric Formulas

### Runs Per Game

```text
runs per game = runs scored / games played
```

### Runs Allowed Per Game

```text
runs allowed per game = runs allowed / games played
```

### Run Differential

```text
run differential = runs scored - runs allowed
```

### Strikeout Rate

```text
team strikeout rate = strikeouts / plate appearances
```

### Walk Rate

```text
team walk rate = walks / plate appearances
```

If plate appearances are unavailable, at-bats are used as a fallback denominator.

## Rating Normalization

All ranges and weights are defined in:

```text
src/providers/team-strength/config.ts
```

Values outside the configured range are clamped between 0 and 100.

These ranges are transparent V1 assumptions, not historically trained boundaries.

## Offensive Rating

| Metric | Range | Direction | Weight |
| --- | --- | --- | ---: |
| Runs per game | 3.0–6.0 | Higher is better | 30% |
| OPS | .650–.850 | Higher is better | 30% |
| Batting average | .220–.290 | Higher is better | 15% |
| Walk rate | 6%–12% | Higher is better | 15% |
| Strikeout rate | 18%–28% | Lower is better | 10% |

```text
offensive rating =
  runs score * 0.30 +
  OPS score * 0.30 +
  batting average score * 0.15 +
  walk-rate score * 0.15 +
  inverse strikeout-rate score * 0.10
```

## Pitching Rating

| Metric | Range | Direction | Weight |
| --- | --- | --- | ---: |
| Team ERA | 3.00–5.50 | Lower is better | 40% |
| Runs allowed per game | 3.0–6.0 | Lower is better | 35% |
| Team WHIP | 1.05–1.45 | Lower is better | 25% |

```text
pitching rating =
  inverse ERA score * 0.40 +
  inverse runs-allowed score * 0.35 +
  inverse WHIP score * 0.25
```

## Bullpen Rating

Bullpen rate statistics are calculated from aggregated relief-pitcher counts:

```text
ERA = earned runs * 9 / innings
WHIP = (walks + hits) / innings
strikeout rate = strikeouts / batters faced
```

The rating is:

```text
bullpen rating =
  inverse ERA score * 0.35 +
  inverse WHIP score * 0.30 +
  strikeout-rate score * 0.20 +
  workload availability * 0.15
```

Recent workload uses the previous three calendar days. More pitches and
innings lower workload availability. Splits containing starts are excluded
from recent workload so starter innings cannot inflate bullpen usage. Missing
bullpen data remains neutral.

## Overall Rating

Available components are combined and re-normalized by their active weights:

| Component | Weight |
| --- | ---: |
| Offense | 45% |
| Pitching | 40% |
| Bullpen | 15% |
| Run differential | 20% |

Run differential is normalized across a V1 range of `-150` to `+150`.

Unavailable bullpen data is excluded from the weighted average rather than being treated as real performance.

The overall rating is primarily a product-facing summary. Prediction Engine V1 consumes offense, pitching, and bullpen factors separately.

## Missing Data

Missing data always produces neutral ratings:

```text
rating = 50
available = false
```

The model does not invent unavailable team metrics.

If both hitting and pitching responses are absent, the team-strength service records an unavailable strength profile and the prediction engine receives neutral factors.

## Provider Modes

### Live

Retrieves current-season official MLB team hitting and pitching data.

### Replay

Reads recorded raw responses and normalized team strength from:

```text
replay/team-strength
```

No network request is made.

### Mock

Uses normalized fallback strength supplied by mock data. When no mock strength exists, the engine uses neutral values.

## Prediction Engine Use

Prediction Engine V1 compares home and away ratings:

```text
home factor =
  home rating / (home rating + away rating)
```

This formula is applied independently to:

- Offense.
- Team pitching.
- Bullpen.

The `PredictionEngine` public interface does not change. Team strength is attached to the existing normalized `Team` model.

## Current Limitations

- Relief designation is based on MLB's `position=RP` stats filter and can
  include pitchers whose role changed during the season.
- Ratings use season-to-date results and do not account for opponent quality.
- No handedness splits are included.
- No recent-form windows are included.
- No lineup-specific adjustments are included.
- No park, weather, injury, travel, or rest adjustments are included.
- Rating ranges have not been historically calibrated.

## Planned Improvements

- Role-aware active-roster filtering and leverage quality.
- Handedness splits.
- Rolling 7-day and 30-day form.
- Expected offensive metrics.
- Opponent-adjusted ratings.
- Lineup-level projections.
- Historical calibration and backtesting.
