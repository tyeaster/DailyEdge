# TrueLine Matchup Intelligence

Matchup Intelligence is the Phase 3 foundation for pitch-level and
batter-vs-pitch-type analysis. It is intentionally independent from
PredictionEngine. PredictionEngine can consume the normalized output later, but
this module does not import or call PredictionEngine.

## Data Source Audit

### Selected Source

The first live provider uses Baseball Savant Statcast Search CSV.

Reasons:

- It exposes pitch-level data needed for pitch type, velocity, spin rate,
  movement, release point, plate location, zone, handedness, batted-ball type,
  launch speed, launch angle, whiffs, contact, and expected outcome fields.
- It supports pitcher and batter scoped queries.
- It is free and replayable.
- It can be cached aggressively because pitch-level season data does not need
  second-by-second updates.

### Official MLB Endpoint

Official MLB Stats API remains useful for player IDs, rosters, schedules,
probable pitchers, player metadata, and handedness. It is not sufficient by
itself for this phase because the currently used official endpoints do not
provide complete pitch movement, zone heat-map, batter pitch-type split, or
pitch-value data in one stable contract.

Use official MLB data as identity and schedule glue. Use Statcast for
pitch-level intelligence.

### Baseball Savant / Statcast

Coverage:

- Pitch arsenal: available by grouping `pitch_type`.
- Pitch usage: available by pitch-type frequency.
- Pitch velocity: `release_speed`.
- Spin rate: `release_spin_rate`.
- Vertical break: normalized from `pfx_z`.
- Horizontal break: normalized from `pfx_x`.
- Release point: `release_pos_x`, `release_pos_z`, and `release_extension`.
- Pitch movement: derived from horizontal and vertical break.
- Pitch location: `plate_x`, `plate_z`, and `zone`.
- Pitcher handedness: `p_throws`.
- Batter handedness: `stand`.
- Batter splits by pitch type: derived from batter-scoped pitch rows grouped by
  `pitch_type`.
- Zone heat maps: derived from `zone`, `plate_x`, and `plate_z`.
- Pitch heat maps: derived from pitch type plus location buckets.
- Pitch values: partially available through event and expected-outcome fields;
  explicit run-value feeds remain a future paid-data candidate.

Replay feasibility is high because responses are CSV or normalized JSON and can
be stored as immutable fixtures.

Recommended cache duration:

- Pitcher arsenal: 24 hours during development.
- Batter pitch-type profiles: 24 hours during development.
- Shorter cache windows can be added later for same-day rolling data.

Licensing concern:

- Baseball Savant is appropriate for development and model research, but
  production commercial use should be reviewed before scaling traffic or
  monetizing derived data.

Long-term reliability:

- Medium. The data is high quality, but the CSV endpoint is not a formal paid
  enterprise contract.

### Free Alternatives

- `pybaseball` wraps Baseball Savant, FanGraphs, and other public baseball data
  sources. It is useful for offline research, backfills, and validation, but it
  adds a Python dependency and still relies on scraped/public sources.
- Community wrappers around MLB Stats API can help discover endpoints but do
  not solve the missing pitch-level fields.

### Paid Alternatives

- Sportradar MLB API: commercial option for production reliability, licensing,
  and formal support.
- SportsDataIO MLB API: commercial option for production sports feeds and
  broader betting/fantasy coverage.
- TruMedia, Inside Edge, and proprietary baseball-data vendors are future
  candidates for deeper pitch values, scouting classifications, and matchup
  features.

Paid providers should be implemented as additional `MatchupProvider`
implementations, not as changes to services or UI.

## Architecture

```text
Statcast, replay, or mock provider
  -> MatchupService
  -> normalized PitchArsenal and BatterMatchupProfile
  -> Matchup Intelligence engines
  -> MatchupIntelligenceResult
  -> future research, prop, slate, and prediction consumers
```

Files:

- `src/providers/matchup/MatchupProvider.ts`
- `src/providers/matchup/StatcastMatchupProvider.ts`
- `src/providers/matchup/ReplayMatchupProvider.ts`
- `src/providers/matchup/MockMatchupProvider.ts`
- `src/services/matchup/MatchupService.ts`
- `src/services/matchup/engines.ts`
- `src/services/matchup/normalization.ts`
- `src/services/matchup/types.ts`

Mode selection:

```text
MATCHUP_MODE=live
MATCHUP_MODE=replay
MATCHUP_MODE=mock
```

Recording:

```text
MATCHUP_RECORD=true
MATCHUP_REPLAY_DIR=replay/matchup
```

## Models

### PitchProfile

Contains normalized pitch type, usage, velocity, spin rate, movement, whiff
rate, put-away rate, strike rate, zone rate, batted-ball quality, release point,
location buckets, and future-ready heat-map fields.

### PitchUsage

Stores pitch type, pitch name, and usage percentage.

### PitchLocation

Stores zone, average plate coordinates, and frequency.

### PitchHeatMap and ZoneHeatMap

Store normalized location buckets. They are intentionally sparse now and can
grow into higher-resolution premium visuals later.

### PitchArsenal

Represents one pitcher's complete arsenal for a season and includes source,
data quality, handedness, primary pitch, and overall arsenal quality.

### BatterPitchProfile

Represents batter performance against a pitch type, including AVG, SLG, xBA,
xSLG approximation, hard-hit rate, barrel rate, whiff rate, chase rate,
contact, swing, take, average exit velocity, launch angle, ISO, K%, sweet-spot
rate, and expected damage rating.

### ZoneMatch

Scores pitcher location tendencies against available batter zone-damage data
from 0 to 100. It returns overlay-ready cells, hitter hot zones, hitter cold
zones, and explainable reasons.

### PitchTypeMatch

Scores each pitch type from 0 to 100 using deterministic component scores:

- Velocity Match
- Movement Match
- Zone Match
- Contact Match
- Expected Damage Match

Each score includes reasons.

### MatchupIntelligenceResult

The production analytics result returned by `buildMatchupIntelligence()` and
`MatchupService.analyzeMatchup()`. It includes:

- Pitch arsenal and pitch mix.
- Batter pitch-type profiles.
- Pitch Type Match score.
- Zone Match score.
- Recent Matchup score from Player Intelligence.
- Weather, ballpark, bullpen, and lineup context scores when supplied.
- Overall Matchup Score.
- Confidence score.
- Explainable reasons.

### OverallPitchMatch Legacy Summary

Combines pitch-type and zone matches into a 0-100 pitcher-batter compatibility
score. It remains supported for existing consumers and replay compatibility.
New research and model consumers should prefer `MatchupIntelligenceResult`.

## Deterministic Calculations

The current implementation is not a prediction formula and does not adjust win
probability.

Pitch-type score:

```text
score =
  Contact Match * 0.25 +
  Velocity Match * 0.15 +
  Movement Match * 0.20 +
  Zone Match * 0.15 +
  Expected Damage Match * 0.25
```

Overall score:

```text
overall =
  Pitch Type Match * 0.42 +
  Zone Match * 0.18 +
  Recent Form * 0.18 +
  Weather * 0.08 +
  Ballpark * 0.08 +
  Bullpen * 0.06
```

Pitch-type scores are weighted by pitch usage. Missing optional context returns
neutral 50 values and lowers confidence rather than failing the analysis.

## Engines

### Pitch Type Match

Compares the pitcher's arsenal against batter pitch-type performance. It
scores contact pressure, velocity, movement, zone fit, and expected damage. It
returns per-pitch scores plus top advantages and top weaknesses.

### Zone Match

Aggregates pitcher location tendencies into normalized zone cells and compares
them with batter damage zones. It returns overlay-ready data for future UI:
zone, bucket coordinates, pitcher frequency, batter damage rating,
classification, and cell score.

### Recent Matchup Score

Consumes `PitcherIntelligence` output rather than raw game logs. It combines
recent form, consistency, and trend signals. This keeps the matchup engine
dependent on normalized services, not providers.

### Overall Matchup Score

Combines pitch type, zone, recent form, weather, ballpark, and bullpen context
through centralized weights in `MATCHUP_INTELLIGENCE_CONFIG`.

Missing data returns neutral values and marks missing inputs. It never fails
prediction generation.

## PredictionEngine Consumption

PredictionEngine now accepts optional normalized matchup intelligence attached
to a game. When present, it:

- Carries the matchup summary into `PredictionResult`.
- Adds one explainable matchup reason.
- Does not change current win-probability weights.
- Does not tune or replace existing prediction formulas.

This preserves the stable V1 model while creating a clean place to consume
Matchup Intelligence after backtesting.

## Replay

Replay fixtures live in:

```text
replay/matchup
```

Replay mode loads normalized responses from disk and returns source `replay`.
Live recording stores raw and normalized provider responses for deterministic
local tests.

## Caching

The initial cache TTL is 24 hours:

```text
CACHE_TTL_SECONDS.matchup = 86400
```

This is appropriate for season-to-date pitch and batter profiles. Later phases
can add shorter cache keys for same-day lineup-specific or rolling-window
matchups.

## Current Capabilities

- Live Statcast CSV provider.
- Replay provider.
- Mock provider.
- Pitch arsenal normalization.
- Batter pitch-type profile normalization.
- Pitch location and heat-map preparation.
- Production Pitch Type Match engine.
- Production Zone Match engine with overlay-ready cells.
- Recent Matchup Score consuming Player Intelligence.
- Overall Matchup Score with weather, ballpark, and bullpen context.
- Explainable reasons for each score.
- Service-level caching and graceful fallback.
- Optional PredictionEngine consumption.

## Current Limitations

- Pitch-value data is approximated from available event and expected-outcome
  fields; explicit run-value feeds remain future work.
- Zone matching is sparse and deterministic; it is not yet a trained heat-map
  model.
- Batter profiles are currently season-to-date by pitch type, not count,
  handedness split, or recent form.
- The live provider is suitable for development and replay capture; production
  licensing should be resolved before commercial scaling.
- The Daily Slate does not yet automatically enrich every game with matchup
  intelligence because that should be introduced after provider load, cache
  pressure, and backtest behavior are validated.

## Roadmap

1. Harden live Statcast collection with chunked date windows and backfill jobs.
2. Add pitcher arsenal history, recent changes, and pitch-level trend detection.
3. Add batter splits by pitch type, handedness, count, and zone.
4. Add high-resolution pitch and zone heat maps.
5. Aggregate pitcher-vs-lineup matchup scores once confirmed lineups are
   available.
6. Backtest matchup scores against run prevention, strikeouts, hard contact,
   home runs, and player props.
7. Add calibrated matchup features to PredictionEngine weights only after
   backtesting proves lift.
8. Build premium UI diagnostics for pitch mix, zone attack, batter weaknesses,
   and model explanations.
