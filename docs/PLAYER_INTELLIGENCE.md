# Player Intelligence

Player Intelligence is the normalized player-level data layer for TrueLine.
It is designed to be consumed by research pages, labs, Matchup Intelligence,
and future sport-specific models without requiring React components to call
multiple providers.

## Architecture

```text
Live, replay, or mock providers
  -> PlayerIntelligenceService
  -> normalized PitcherIntelligence or BatterIntelligence
  -> Pitcher Research, Batter Research, labs, slate diagnostics
```

Current files:

- `src/providers/player-intelligence/BatterGameLogProvider.ts`
- `src/providers/player-intelligence/MLBBatterGameLogProvider.ts`
- `src/providers/player-intelligence/ReplayBatterGameLogProvider.ts`
- `src/providers/player-intelligence/MockBatterGameLogProvider.ts`
- `src/providers/player-intelligence/PitcherGameLogProvider.ts`
- `src/providers/player-intelligence/MLBPitcherGameLogProvider.ts`
- `src/providers/player-intelligence/ReplayPitcherGameLogProvider.ts`
- `src/providers/player-intelligence/MockPitcherGameLogProvider.ts`
- `src/services/player-intelligence/PlayerIntelligenceService.ts`
- `src/services/player-intelligence/metrics.ts`
- `src/services/player-intelligence/types.ts`
- `src/services/player-intelligence/config.ts`

Mode selection:

```text
PLAYER_INTELLIGENCE_MODE=live
PLAYER_INTELLIGENCE_MODE=replay
PLAYER_INTELLIGENCE_MODE=mock
```

`PITCHER_GAME_LOG_MODE` is also supported for game-log-specific overrides.

## Provider Source

The first live implementation uses the official MLB Stats API player hydrate
game-log paths:

```text
/api/v1/people/{playerId}?hydrate=stats(group=[pitching],type=[gameLog],season={season})
/api/v1/people/{playerId}?hydrate=stats(group=[hitting],type=[gameLog],season={season})
```

This keeps player identity and historical pitching logs in the same official
MLB ecosystem already used by the schedule and pitcher-stat providers.

## Pitcher Game Logs

Normalized fields:

- Date
- Opponent
- Home / away
- Result
- Innings
- Strikeouts
- Walks
- Hits
- Earned runs
- Pitch count
- Batters faced
- Ground balls
- Fly balls
- Game score
- Decision

Unavailable fields remain `null` or neutral and never break intelligence
generation.

## Batter Game Logs

Normalized fields:

- Date
- Opponent
- Home / away
- At-bats
- Plate appearances
- Hits
- Singles, doubles, triples, and home runs
- RBI
- Runs
- Walks
- Strikeouts
- Hit by pitch
- Total bases
- Stolen bases
- Average exit velocity when available
- Average launch angle when available
- Barrels when available
- Hard-hit balls when available

The official MLB game-log feed does not consistently include Statcast
quality-of-contact fields. Those fields remain nullable in live mode and are
filled by replay/mock fixtures when available.

## Derived Metrics

`PlayerIntelligenceService` calculates:

- Last 3, last 5, last 10, and season rolling summaries.
- Home, away, day, and night splits.
- Rolling strikeout average.
- Rolling innings.
- Rolling pitch count.
- Rolling ERA.
- Rolling WHIP.
- Quality Start percentage.
- 6+ inning percentage.
- 100+ pitch percentage.
- Average batters faced.

For batters it calculates:

- Last 3, last 5, last 10, and season rolling summaries.
- Home, away, day, and night splits.
- Splits versus left-handed and right-handed pitchers when available.
- Rolling AVG, OBP, SLG, OPS, ISO, hard-hit percentage, barrel percentage,
  strikeout percentage, and walk percentage.
- A normalized BatterProfile with AVG, OBP, SLG, OPS, ISO, BABIP, K%, BB%,
  hard-hit rate, barrel rate, sweet-spot rate, average exit velocity, average
  launch angle, batted-ball mix, and future-ready plate-discipline fields.

## Trend Engine

The trend analyzer returns deterministic signals:

- Direction: `up`, `down`, or `flat`.
- Strength: `weak`, `moderate`, or `strong`.
- Confidence: `0–100`.
- Human-readable explanation.

Initial pitcher trends include:

- Strikeouts.
- Pitch count.
- Walks.
- Efficiency.
- Recent workload.

Batter trends include:

- Power.
- Contact.
- Strikeouts.
- Barrel rate.
- Hard-hit rate.
- Plate discipline.

Future Statcast-backed trends can improve chase, contact, zone-contact, pull,
center, and opposite-field rates once those feeds are connected per game.

## Consistency Engine

The consistency engine supports pitcher strikeouts and batter hit/total-base
ranges.

It returns:

- Mean.
- Median.
- Standard deviation.
- Floor.
- Ceiling.
- Expected range.
- Consistency Score from `0–100`.

This will later support alternate-line probabilities.

## Recent Form Score

Recent Form is scored from `0–100` using centralized weights in
`src/services/player-intelligence/config.ts`.

Inputs:

- Strikeouts.
- ERA.
- WHIP.
- Walks.
- Pitch count.
- Innings.
- Quality starts.
- Recent trend signals.

Batter Recent Form is scored from:

- Hits.
- Power.
- Hard contact.
- Strikeouts.
- Walks.
- Quality of contact.
- Trend signals.

## Caching and Replay

- Pitcher and batter game logs cache for 24 hours.
- Replay fixtures live in `replay/player-intelligence`.
- `PLAYER_INTELLIGENCE_RECORD=true` records live provider responses.
- Mock mode mirrors the live provider contract.

## Current Limitations

- Chase, contact, zone-contact, pull, center, and opposite-field rates require
  a Statcast-backed per-game batter feed and remain nullable.
- Game result and game score depend on availability in the MLB game-log split.
- Batter pitch-type performance remains in Matchup Intelligence until Batter
  Research consumes the full batter profile.

## Future Consumers

- Pitcher Research.
- Batter Research.
- Matchup Intelligence.
- Daily Slate.
- Strikeout Lab.
- Hits / Total Bases Lab.
- Home Run Lab.
- Moneyline Lab.
- Future MLB, WNBA, NBA, NFL, NHL, and Soccer intelligence layers.
