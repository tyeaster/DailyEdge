# Game Totals Intelligence V1

Game Totals Intelligence evaluates MLB Over/Under opportunities using the existing TrueLine service architecture. It does not replace PredictionEngine and does not introduce new provider contracts.

## Architecture

The implementation lives in `src/features/game-totals-intelligence/`.

- `GameTotalsIntelligenceService` loads the current slate through `DailySlateOrchestratorService` via `getDailySlate()`.
- `MatchupService` supplies pitch match, zone match, and overall matchup context for both lineups.
- Existing weather, ballpark, bullpen, lineup, recent form, and PredictionEngine outputs are consumed from normalized Daily Slate game objects.
- `RankingEngineService` ranks game-total candidates as normalized `game-total` market candidates.
- Calibration and Backtesting support the `game-total` market through shared market types.

No React page imports providers directly. The page receives a completed `GameTotalsViewModel`.

## Route

`/betting/game-totals`

## View Model

Each `GameTotalCandidate` includes:

- Projected runs
- Projected home runs
- Projected away runs
- Sportsbook total
- TrueLine total
- Fair total
- Edge
- Expected value
- Confidence
- Recommendation
- Game grade
- Ranked position
- Reasons
- Expandable scoring factors

## Scoring Model

V1 uses deterministic factor scoring. All weights are centralized in `src/features/game-totals-intelligence/config.ts`.

Factors:

- Home offense
- Away offense
- Home starter
- Away starter
- Bullpen matchup
- Pitch Match
- Zone Match
- Weather
- Wind
- Temperature
- Ballpark
- Lineup quality
- Recent form
- Rest and travel
- Home field

The score becomes the Game Totals game grade. Projected runs are anchored to existing PredictionEngine projected runs when available, then adjusted by game-total factors, weather, ballpark, and bullpen context.

## Edge And EV

The model compares:

- TrueLine projected total
- Sportsbook game total

The run difference is converted into an initial deterministic probability for the selected side. That probability is compared with sportsbook implied probability to calculate:

- Edge
- Expected value
- Recommendation

V1 is intentionally not calibrated. Calibration should be handled by Calibration Engine after enough historical game-total records exist.

## Ranking

Candidates are converted into normalized RankingEngine `BetCandidate` records using market type `game-total`.

Ranking factors include:

- Composite matchup strength
- Weather impact
- Bullpen impact
- Lineup certainty
- Recent form
- Data quality
- Confidence
- Edge
- EV

RankingEngine behavior is unchanged.

## Calibration

The shared Calibration Engine can track:

- Over percentage
- Under percentage
- ROI
- CLV
- Historical accuracy

V1 does not add persistent game-total result storage. It relies on the existing calibration record model:

```ts
market: "game-total"
```

## Backtesting

The shared Backtesting Engine can filter historical records by:

```ts
settings: { market: "game-total" }
```

This enables historical Game Total ROI, confidence buckets, sportsbook filters, and market-specific strategy replay once historical game-total records are persisted.

## Current Limitations

- Sportsbook game totals use the existing normalized game odds only.
- Over and Under prices are represented by the available total price; two-sided total prices are not yet modeled separately.
- Rest and travel remain neutral placeholders.
- Defense is not yet included directly.
- Projection is deterministic and not calibrated to historical totals distribution.
- No persistent game-total prediction/result store exists yet.

## Game Totals V2 Roadmap

- Add true two-sided Over/Under odds normalization.
- Persist game-total prediction and result history.
- Calibrate run-total probabilities by total range and park.
- Add defense provider inputs.
- Add rest, travel, and schedule-density providers.
- Add umpire run-environment data when reliable.
- Add sportsbook-specific CLV for totals.
- Split confidence by Over and Under market availability.
