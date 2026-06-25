# TrueLine Recent Form and Momentum Model

## Purpose

The Recent Form Model adds current team performance to Prediction Engine V1
without replacing season-long strength. It measures underlying results across
the last 7, 14, and 30 completed games and produces two distinct outputs:

- `RecentFormRating`: current rolling performance from `0` to `100`.
- `MomentumScore`: short-window improvement or decline from `0` to `100`.

The model is deterministic, provider-based, and available in live, replay, and
mock modes.

## Data Source

Live mode uses the official MLB Stats API.

The provider requests combined hitting and pitching team aggregates for each
required window. Responses are paginated because the API uses the game-window
limit as its page size. The entire slate shares nine upstream requests:

- Five pages for the 7-game window.
- Three pages for the 14-game window.
- One page for the 30-game window.

```text
/api/v1/teams/stats
  ?stats=lastXGames
  &group=hitting,pitching
  &sportIds=1
  &season={season}
  &limit={7|14|30}
  &offset={pageOffset}
```

Recent-form lookups are cached for 30 minutes by provider, team, and slate
date.

## Normalized Windows

Each 7, 14, and 30-game window contains:

- Games played.
- Wins and losses.
- Win percentage.
- Runs scored per game.
- Runs allowed per game.
- Run differential.
- Run differential per game.
- OPS.
- Batting average.
- ERA.
- WHIP.
- Window rating.

If MLB has fewer completed games than the requested window, all available
games are used.

## Window Rating

Every available window receives a `0` to `100` rating.

| Metric | Range | Direction | Weight |
| --- | --- | --- | ---: |
| Win percentage | 20%–80% | Higher is better | 5% |
| Runs per game | 2.5–6.5 | Higher is better | 10% |
| Runs allowed per game | 2.5–6.5 | Lower is better | 10% |
| Run differential per game | -2.5–+2.5 | Higher is better | 25% |
| OPS | .600–.900 | Higher is better | 20% |
| Batting average | .210–.290 | Higher is better | 10% |
| ERA | 2.50–6.00 | Lower is better | 15% |
| WHIP | 1.00–1.60 | Lower is better | 5% |

Each metric is linearly normalized and clamped between `0` and `100`.

```text
window rating =
  win score * 0.05 +
  runs score * 0.10 +
  inverse runs-allowed score * 0.10 +
  run-differential score * 0.25 +
  OPS score * 0.20 +
  batting-average score * 0.10 +
  inverse ERA score * 0.15 +
  inverse WHIP score * 0.05
```

## Recent Form Rating

Available window ratings are combined:

| Window | Weight |
| --- | ---: |
| Last 7 games | 45% |
| Last 14 games | 35% |
| Last 30 games | 20% |

```text
RecentFormRating =
  last-7 rating * 0.45 +
  last-14 rating * 0.35 +
  last-30 rating * 0.20
```

Unavailable windows are excluded and the active weights are re-normalized.

## Momentum Score

Momentum is not a winning-streak counter. It rewards underlying short-window
performance and improvement relative to the 30-game baseline.

| Component | Weight |
| --- | ---: |
| Last-7 win percentage | 20% |
| Last-7 run differential per game | 30% |
| Last-7 OPS change versus last 30 | 25% |
| Last-7 ERA and WHIP improvement versus last 30 | 25% |

```text
MomentumScore =
  recent win score * 0.20 +
  recent run-differential score * 0.30 +
  offensive trend score * 0.25 +
  pitching trend score * 0.25
```

A team can have positive momentum without a long winning streak when its
offense, pitching, and run differential are improving.

## Missing Data

Missing recent-form data remains neutral:

```text
rating = 50
available = false
```

Unavailable data contributes no model breakdown value, creates no competitive
explanation, and reduces Data Quality.

## Provider Modes

### Live

Retrieves official MLB schedule and rolling team statistics.

### Replay

Reads recorded raw window responses and normalized output from:

```text
replay/recent-form
```

### Mock

Returns normalized fallback recent form already attached to a team.

Configuration:

```text
RECENT_FORM_MODE=live
RECENT_FORM_MODE=replay
RECENT_FORM_MODE=mock
RECENT_FORM_RECORD=true
RECENT_FORM_REPLAY_DIR=replay/recent-form
RECENT_FORM_REPLAY_FILE=path/to/file.json
```

## Prediction Engine Use

Prediction Engine V1 compares home and away ratings:

```text
home factor =
  home rating /
  (home rating + away rating)
```

This is applied independently to `RecentFormRating` and `MomentumScore`.
Season strength remains separate so a short hot or cold period cannot fully
replace the larger sample.

## Current Limitations

- The ranges and weights are transparent V1 assumptions, not trained values.
- Recent form is not opponent-adjusted.
- Lineup quality and player availability are not included.
- No expected-stat, contact-quality, or handedness splits are included.
- Momentum uses the last 7 games against the 30-game baseline and does not yet
  include rest, travel, or schedule strength.
