# Live OddsPipe Integration

This document defines TrueLine's production OddsPipe integration after the
`v1.0.0-foundation` release.

## Purpose

OddsPipe is the first live sportsbook odds provider for TrueLine. It is one
implementation of the generic `OddsProvider` interface and must remain
replaceable by future providers.

React components should never call OddsPipe directly. The data flow is:

`OddsPipeProvider -> OddsService -> Daily Slate / market services -> view models -> UI`

## Supported Markets

The provider normalizes live OddsPipe records into the shared
`NormalizedOddsRecord` model.

Currently supported market mappings:

| TrueLine Market | OddsPipe / common aliases |
|---|---|
| Moneyline | `moneyline`, `h2h` |
| Run Line | `spread`, `spreads`, `run_line`, `run-line`, `runline` |
| Game Total | `total`, `totals`, `game_total`, `game_totals` |
| Team Total | `team_total`, `team_totals` |
| Strikeouts | `player_strikeouts`, `pitcher_strikeouts` |
| Hits | `batter_hits`, `player_hits` |
| Runs | `batter_runs_scored`, `player_runs` |
| RBI | `batter_rbis`, `batter_rbi`, `player_rbis`, `player_rbi` |
| Home Runs | `batter_home_runs`, `batter_homeruns`, `player_home_runs`, `player_homeruns` |
| Total Bases | `batter_total_bases`, `player_total_bases` |

Moneyline, run line, and game total odds are applied to `Game.odds`.
Player prop odds are matched to today's probable pitchers and lineup batters by
normalized player name.

Team-total records are normalized and available to service consumers, but the
current Team Totals product still derives its sportsbook context from the game
total because `Game.odds` does not yet carry a dedicated team-total odds slot.

## Environment Variables

Required for live mode:

```bash
ODDS_MODE=live
ODDSPIPE_API_KEY=...
```

Endpoint configuration:

```bash
ODDSPIPE_BASE_URL=https://api.oddspipe.com
```

`ODDSPIPE_BASE_URL` is preferred. The app appends `/v1/odds`.

Legacy/full endpoint override:

```bash
ODDSPIPE_API_URL=https://api.oddspipe.com/v1/odds
```

If `ODDSPIPE_API_URL` is set, it takes precedence over `ODDSPIPE_BASE_URL`.

Replay configuration:

```bash
ODDS_MODE=replay
ODDS_REPLAY_DIR=replay/odds
ODDS_REPLAY_FILE=
```

Recording:

```bash
ODDS_RECORD=true
```

Optional live verification date:

```bash
ODDSPIPE_VERIFY_DATE=2026-07-08
```

## Live Verification

Run:

```bash
npm run verify:oddspipe
```

The verification command:

- loads `.env.local` and `.env` without printing secrets
- checks API connectivity
- checks bearer-token authentication
- requests MLB moneyline, spread, total, team-total, and player-prop markets
- validates that at least one supported record normalizes
- reports rate-limit headers when OddsPipe exposes them
- prints a small redacted sample

To record a successful live response as replay data:

```bash
ODDS_RECORD=true npm run verify:oddspipe
```

Recorded files are written to `replay/odds/` unless `ODDS_REPLAY_DIR` overrides
the target.

## Replay Workflow

1. Configure live credentials locally.
2. Run `ODDS_RECORD=true npm run verify:oddspipe`.
3. Commit representative replay fixtures only after confirming the raw response
   contains no secrets or account-specific metadata.
4. Set `ODDS_MODE=replay` to run local development without network calls.

Replay providers return the normalized records and stored rate-limit metadata.

## Error Handling

The live provider includes response status, truncated response body, and
`retry-after` information in thrown errors. `OddsService` falls back to mock odds
for OddsPipe failures so downstream slate generation does not fail solely due to
an odds outage.

This fallback is intentionally scoped to odds data. It does not mark the entire
Daily Slate as mock.

## Known Limitations

- Player-prop model edge/confidence is still not fully calibrated for every
  prop market. Live lines are real, but some projection values remain
  conservative placeholders until market-specific projection engines are
  completed.
- Team-total records are normalized but not yet stored on a dedicated
  `Game.odds.teamTotal` model field.
- Rate-limit support depends on OddsPipe exposing standard headers.
- Live fixture capture requires a valid `ODDSPIPE_API_KEY` and network access.
- OddsPipe remains vendor-specific only inside `src/providers/odds/`.
