# Player Intelligence

Player Intelligence is the normalized player-level data layer for TrueLine.
It is designed to be consumed by research pages, labs, Matchup Intelligence,
and future sport-specific models without requiring React components to call
multiple providers.

## Architecture

```text
Live, replay, or mock providers
  -> PlayerIntelligenceService
  -> normalized PitcherIntelligence
  -> Pitcher Research, Batter Research, labs, slate diagnostics
```

Current files:

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
game-log path:

```text
/api/v1/people/{playerId}?hydrate=stats(group=[pitching],type=[gameLog],season={season})
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

Future Statcast-backed trends can add velocity, hard contact, pitch mix, and
command location once those feeds are connected to Player Intelligence.

## Consistency Engine

The consistency engine currently supports pitcher strikeouts and can be reused
for innings, pitch count, hits allowed, or future batter metrics.

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

## Caching and Replay

- Pitcher game logs cache for 24 hours.
- Replay fixtures live in `replay/player-intelligence`.
- `PLAYER_INTELLIGENCE_RECORD=true` records live provider responses.
- Mock mode mirrors the live provider contract.

## Current Limitations

- Batter Intelligence is intentionally a placeholder.
- Velocity, command, and hard-contact trends require Statcast-backed game logs
  or matchup inputs and are not fully implemented yet.
- Game result and game score depend on availability in the MLB game-log split.
- Player Intelligence is not yet wired into Pitcher Research; that should be
  the next UI integration step.

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
