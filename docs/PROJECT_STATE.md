# TrueLine Project State

Last updated: June 25, 2026

## Product Status

TrueLine is an MLB-first sports betting analytics dashboard with:

- Live MLB schedule integration.
- Provider-based live, replay, and mock data patterns.
- Live probable starter season statistics.
- Live team offense and pitching strength.
- Live bullpen season quality and recent workload.
- Live confirmed lineups with projected fallback.
- Live 7, 14, and 30-game recent form and momentum.
- Live-configured sportsbook odds integration.
- Deterministic Prediction Engine V1.
- Fair lines, edge, expected value, confidence, and recommendations.
- Explainable game-card outputs.
- Per-factor model breakdowns and input data-quality scoring.
- Developer diagnostics for model version, weights, sources, and missing inputs.

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
### Bullpen Quality

- Default: Live official MLB relief-pitcher statistics.
- Replay: Supported.
- Mock: Supported.
- Cache: In-memory, 30 minutes per team and slate date.
- Shared upstream requests:
  - Season relief-pitcher statistics for all MLB teams.
  - Previous three calendar days of relief workload for all MLB teams.
- Live fields:
  - Season ERA.
  - Season WHIP.
  - Strikeout rate.
  - Innings pitched.
  - Recent innings and pitches.
  - Recent appearances and relievers used.
  - Workload availability rating.
  - Bullpen strength rating.

### Recent Form

- Default: Live official MLB rolling team statistics.
- Replay: Supported.
- Mock: Supported.
- Cache: In-memory, 30 minutes per team and slate date.
- Windows:
  - Last 7 completed games.
  - Last 14 completed games.
  - Last 30 completed games.
- Live fields:
  - Win percentage.
  - Runs scored per game.
  - Runs allowed per game.
  - Run differential.
  - OPS.
  - Batting average.
  - ERA.
  - WHIP.
- Outputs:
  - Recent Form Rating.
  - Momentum Score based on underlying performance trends.

### Confirmed Lineups

- Default: Live official MLB schedule and active-roster statistics.
- Replay: Supported with raw schedule/roster fixtures.
- Mock: Supported with the same provider contract.
- Cache:
  - Confirmed lineups: 60 seconds.
  - Projected lineups: 5 minutes.
  - Active roster and season hitting data: 1 hour.
- Confirmation:
  - Current submitted batting order: confirmed at 100 confidence.
  - Latest official lineup from the previous seven days: projected at 65
    confidence.
  - No usable lineup: unavailable and neutral.
- Live fields:
  - Batting order, MLB ID, name, position, handedness, and starting status.
  - Season AVG, OBP, SLG, OPS, home runs, plate appearances, and strikeout rate.
  - Missing starters and star hitters.
  - Replacement quality, handedness balance, average OPS, average strikeout
    rate, contact rating, power rating, and overall lineup strength.
- Current limitation: wRC+ is unavailable from the selected official endpoint
  and remains null.

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
  - Season overall strength.
  - Recent Form Rating.
  - Momentum Score.
  - Bullpen strength when available.
  - Confirmed or projected lineup strength when available.
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
- Per-factor contribution breakdown.
- Data Quality score and input availability.
- Prediction version.

Current configurable weights:

| Factor | Weight |
| --- | ---: |
| Starting pitcher | 24% |
| Season strength | 12% |
| Team offense | 10% |
| Team pitching | 12% |
| Recent form | 12% |
| Momentum | 8% |
| Bullpen | 6% |
| Lineup strength | 10% |
| Home field | 4% |
| Sportsbook implied probability | 2% |

Model intelligence behavior:

- Each factor reports its probability-like value, configured weight,
  availability, and percentage-point contribution.
- Explanations are generated only for meaningful, available inputs.
- Data Quality scores pitchers, team statistics, bullpen, lineups, sportsbook,
  recent form, and weather from `0` to `100`.
- Confidence is capped by Data Quality so incomplete inputs cannot produce
  inflated certainty.
- `PredictionDiagnosticsService` exposes the prediction version, weights,
  sources, and missing inputs without adding user-interface clutter.

## UI Status

The Daily Slate includes:

- Today's games.
- Model predictions.
- Fair line and value display.
- Starting pitcher comparison.
- Team offense, pitching, bullpen, and overall ratings.
- Bullpen ERA, WHIP, and strikeout rate.
- Compact last-7 record, form rating, and momentum comparison.
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
- Central weight configuration.
- Per-factor breakdown calculations.
- Data-quality calculations and missing-data behavior.
- Confidence quality caps and developer diagnostics.
- Recent-form normalization and rating calculations.
- Momentum calculations based on underlying trends.
- Recent-form live, replay, and mock providers.
- Recent-form caching and Prediction Engine integration.
- Bullpen aggregation, rating, live/replay/mock providers, and caching.
- Prediction explanations for bullpen quality and recent workload.
- Confirmed/projected lineup normalization and missing-data behavior.
- Lineup live/replay/mock providers and cache behavior.
- Prediction probability, breakdown, explanations, and Data Quality changes
  caused by lineup inputs.

## Known Limitations

- OddsPipe live operation requires deployment credentials.
- Schedule replay is not implemented.
- Weather and injuries are not live.
- Props remain mock.
- The projected run model still uses sportsbook totals or a neutral fallback.
- Team rating ranges and Prediction Engine weights are deterministic V1 assumptions, not historically calibrated coefficients.
- Recent form is not opponent-adjusted and uses deterministic V1 ranges.
- Projected lineups use the latest official batting order rather than a
  dedicated projection model.
- wRC+ and platoon matchup quality are not available in the lineup model.
- Data Quality still marks weather as missing.
- Historical prediction storage, ROI, and closing line value tracking are not implemented.

## Recommended Next Task

Add stadium-level live weather and roof-state data.

Weather is now the highest-value missing pregame input because wind,
temperature, precipitation, and roof state affect run environment while the
current model still treats weather as unavailable.
