# TrueLine Project State

Last updated: June 24, 2026

## Product Status

TrueLine is an MLB-first sports betting analytics dashboard with:

- Live MLB schedule integration.
- Provider-based live, replay, and mock data patterns.
- Live probable starter season statistics.
- Live team offense and pitching strength.
- Live-configured sportsbook odds integration.
- Deterministic Prediction Engine V1.
- Fair lines, edge, expected value, confidence, and recommendations.
- Explainable game-card outputs.

## Active Branch Context

Current development is occurring on:

```text
codex/trueline-rebrand
```

The branch is stacked on `test-codex-auth`. Pull requests remain unmerged pending review.

## Current Providers

### Schedule

- Default: Live MLB Stats API.
- Cache: Next.js revalidation for 5 minutes.
- Fallback: Full mock slate when live schedule loading fails.
- Replay: Not implemented.

### Odds

- Default configured mode: Live OddsPipe.
- Replay: Supported.
- Mock: Supported.
- Cache: In-memory, 60 seconds.
- Operational requirement: `ODDSPIPE_API_KEY`.
- Current limitation: Odds failures return no overlay records and the slate continues with existing or pending game odds.

### Pitcher Statistics

- Default: Live official MLB season pitching statistics.
- Replay: Supported.
- Mock: Supported.
- Cache: In-memory, one hour per pitcher and season.
- Live fields:
  - ERA.
  - WHIP.
  - Innings pitched.
  - Strikeouts.
  - Strikeout rate.
  - K/9.
  - BB/9.
  - HR/9.
  - Wins.
  - Losses.
  - Games started.
- Current placeholders:
  - Pitch arsenal.
  - Pitcher handedness in the live schedule adapter.

### Team Strength

- Default: Live official MLB team season statistics.
- Replay: Supported.
- Mock: Supported.
- Cache: In-memory, one hour per team and season.
- Live offense fields:
  - Runs per game.
  - OPS.
  - Batting average.
  - Strikeout rate.
  - Walk rate.
- Live pitching fields:
  - Runs allowed per game.
  - Run differential.
  - Team ERA.
  - Team WHIP.
- Current placeholder:
  - Bullpen ERA and WHIP are unavailable and remain neutral.

### Weather

- Current status: Schedule-derived placeholder.
- Live weather API: Not implemented.
- Values such as temperature, wind, humidity, and rain chance remain placeholders in live schedule mode.

### Injuries

- Current status: Mock.
- Live provider: Not implemented.

### Player Props

- Current status: Mock.
- Live provider and player-prop model: Not implemented.

### Predictions

- Current status: Deterministic live engine.
- Inputs:
  - Starting pitcher strength.
  - Team offense strength.
  - Team pitching strength.
  - Bullpen strength when available.
  - Home field.
  - Sportsbook implied probability.
- Replay and mock support are inherited from normalized input providers.

## Prediction Engine V1

Prediction Engine V1 is implemented in:

```text
src/services/predictions
```

The engine produces:

- Home and away win probabilities.
- Projected score and total.
- Home and away fair moneylines.
- Sportsbook comparison.
- Edge.
- Expected value.
- Confidence.
- Recommendation.
- Explanation factors.

Current configurable weights:

| Factor | Weight |
| --- | ---: |
| Starting pitcher | 30% |
| Team offense | 25% |
| Team pitching | 20% |
| Bullpen | 10% |
| Home field | 10% |
| Sportsbook implied probability | 5% |

## UI Status

The Daily Slate includes:

- Today's games.
- Model predictions.
- Fair line and value display.
- Starting pitcher comparison.
- Team offense, pitching, bullpen, and overall ratings.
- Weather placeholder display.
- Mock injury and prop sections.

No redesign is planned during data-quality sprints.

## Testing Status

Automated tests cover:

- Odds conversion and value math.
- Prediction Engine calculations.
- Recommendation thresholds.
- Pitcher-stat normalization.
- Pitcher live, replay, and mock providers.
- Pitcher caching.
- Team-stat normalization.
- Team rating calculations.
- Team missing-data behavior.
- Team live, replay, and mock providers.
- Prediction changes caused by team-strength inputs.

## Known Limitations

- OddsPipe live operation requires deployment credentials.
- Schedule replay is not implemented.
- Bullpen-only metrics are unavailable.
- Weather and injuries are not live.
- Props remain mock.
- The projected run model still uses sportsbook totals or a neutral fallback.
- Team rating ranges and Prediction Engine weights are deterministic V1 assumptions, not historically calibrated coefficients.
- Historical prediction storage, ROI, and closing line value tracking are not implemented.

## Recommended Next Task

Add a reliable bullpen provider or aggregation pipeline, then incorporate bullpen availability and recent workload.

This would replace the remaining neutral team-strength factor and improve both game probability and explanation quality.
