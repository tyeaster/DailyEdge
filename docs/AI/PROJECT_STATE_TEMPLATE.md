# Project State Template

Use this template to update project state after significant work. The current project state file is [`../PROJECT_STATE.md`](../PROJECT_STATE.md), but it should be refreshed regularly.

## Update Rules

Update project state when:

- A new provider is added.
- A new market is added.
- A service architecture changes.
- A route changes.
- Live/replay/mock mode changes.
- A production blocker is resolved.
- Technical debt is introduced or removed.

Keep entries factual. Do not record aspirations as completed work.

## Template

```md
# TrueLine Project State

Last updated: YYYY-MM-DD

## Branch Context

- Current branch:
- Base branch:
- Active PR:
- Merge status:
- Known local untracked files:

## Executive Status

Short paragraph describing current system state.

## Production Readiness

- Overall completion:
- Production readiness:
- Largest blockers:

## Current Routes

List all active routes:

- /
- /best-bets
- ...

## Core Engines

| Engine | Status | Notes |
|---|---:|---|
| PredictionEngine | Complete / Partial / Missing | |
| RankingEngine | Complete / Partial / Missing | |
| CalibrationEngine | Complete / Partial / Missing | |
| BacktestingEngine | Complete / Partial / Missing | |
| OddsIntelligence | Complete / Partial / Missing | |
| CorrelationEngine | Complete / Partial / Missing | |

## Providers

| Domain | Live | Replay | Mock | Cache | Notes |
|---|---:|---:|---:|---|---|
| Schedule | | | | | |
| Odds | | | | | |
| Weather | | | | | |
| Ballpark | | | | | |
| Bullpen | | | | | |
| Lineups | | | | | |
| Injuries | | | | | |

## Betting Markets

| Market | Route | Status | Live Odds | Ranking | Best Bets | Notes |
|---|---|---:|---:|---:|---:|---|
| Strikeouts | | | | | | |
| Hits | | | | | | |
| Total Bases | | | | | | |
| Home Runs | | | | | | |
| Moneyline | | | | | | |
| Run Line | | | | | | |
| Team Totals | | | | | | |
| Game Totals | | | | | | |

## Research Pages

| Page | Route | Status | Notes |
|---|---|---:|---|
| Pitcher Research | | | |
| Hitter Research | | | |
| Zone Intelligence | | | |
| Player Research | | | |
| Team Research | | | |
| Ballpark Research | | | |

## Validation Status

Last known results:

- npm run lint:
- npm run build:
- npm test:
- npx tsc --noEmit:

## Technical Debt

Ranked list:

1.
2.
3.

## Production Blockers

Ranked list:

1.
2.
3.

## Documentation Status

Updated docs:

- 

Stale docs:

-

Missing docs:

-

## Next Recommended Tasks

1.
2.
3.
```

