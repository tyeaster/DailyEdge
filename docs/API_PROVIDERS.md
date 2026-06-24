# API Providers

TrueLine uses provider interfaces so production data vendors can be swapped without rewriting the dashboard.

## Provider Strategy

Each provider implementation should conform to a generic contract and return normalized TrueLine models. Services choose providers based on configuration. React components should never import provider classes or know which vendor supplied the data.

## OddsPipe

OddsPipe is the first production odds provider. It is implemented as one `OddsProvider` option, not as a platform dependency.

The OddsPipe provider is responsible for:

- Requesting live sportsbook odds.
- Translating OddsPipe response shapes into normalized odds records.
- Recording raw responses when replay recording is enabled.
- Throwing clear errors when credentials or responses fail.

## Avoiding Vendor Lock-In

TrueLine avoids vendor lock-in by depending on internal contracts instead of vendor SDKs or response shapes.

Rules:

- UI components consume typed props, not vendors.
- Services consume provider interfaces, not vendor-specific clients.
- Providers normalize source data before it leaves the provider layer.
- New vendors should be additive implementations of the same contract.

## Replay Mode

Replay mode allows local development without making network requests.

Recommended workflow:

1. Run with `ODDS_MODE=live` and `ODDS_RECORD=true`.
2. Save raw provider responses into the replay directory.
3. Switch to `ODDS_MODE=replay`.
4. Develop locally against recorded responses.

This reduces API usage, improves local speed, and makes provider bugs easier to reproduce.

## Cache Layer

TrueLine has a cache abstraction in front of scalable cache choices.

Current implementation:

- `MemoryCache`
- Odds TTL: 60 seconds
- Schedule TTL: 5 minutes

Future implementations can use:

- Redis
- Cloudflare KV
- Vercel KV

Any future cache should implement the same cache provider contract so services do not need to change.

## Environment Variables

Current odds configuration:

```text
ODDS_MODE=mock
ODDS_MODE=replay
ODDS_MODE=live
ODDSPIPE_API_URL=https://api.oddspipe.com/v1/odds
ODDSPIPE_API_KEY=your_api_key
ODDS_RECORD=true
ODDS_REPLAY_DIR=replay/odds
ODDS_REPLAY_FILE=replay/odds/example.json
```

`ODDS_MODE=mock` should remain the safest local default.

Current pitcher configuration:

```text
PITCHER_MODE=live
PITCHER_MODE=replay
PITCHER_MODE=mock
PITCHER_RECORD=true
PITCHER_REPLAY_DIR=replay/pitchers
PITCHER_REPLAY_FILE=replay/pitchers/example.json
MLB_PEOPLE_API_URL=https://statsapi.mlb.com/api/v1/people
```

Pitcher mode follows `ODDS_MODE=replay` or `ODDS_MODE=mock` when
`PITCHER_MODE` is not set. Live pitcher lookups are cached for one hour.

Current team-strength configuration:

```text
TEAM_STRENGTH_MODE=live
TEAM_STRENGTH_MODE=replay
TEAM_STRENGTH_MODE=mock
TEAM_STRENGTH_RECORD=true
TEAM_STRENGTH_REPLAY_DIR=replay/team-strength
TEAM_STRENGTH_REPLAY_FILE=replay/team-strength/example.json
MLB_TEAMS_API_URL=https://statsapi.mlb.com/api/v1/teams
```

Team-strength mode follows pitcher or odds replay/mock mode when no
team-specific mode is configured. Team-season lookups are cached for one hour.

## Future Providers

Potential future providers:

- The Odds API
- SportsDataIO
- Pinnacle
- FanDuel
- DraftKings
- Weather data providers
- Injury/news providers

Each new provider should live behind a provider interface and be selected by a service, not by React components.
