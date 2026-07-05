# Run Line Intelligence V1

Run Line Intelligence evaluates MLB spread-cover opportunities using the existing TrueLine architecture. It does not replace PredictionEngine and does not add a new odds provider.

## Architecture

The implementation lives in `src/features/run-line-intelligence/`.

- `RunLineIntelligenceService` loads the slate through the existing Daily Slate service.
- `MatchupService` supplies pitch match, zone match, and overall matchup context for both sides.
- Existing normalized Daily Slate data provides projected runs, sportsbook spread, starters, team strength, bullpens, lineups, weather, ballpark, and recent form.
- `RankingEngineService` ranks candidates as `run-line` market records.
- Calibration and Backtesting support Run Line through the shared market type.

React pages receive a completed `RunLineViewModel`. They do not call providers.

## Route

`/betting/run-line`

## View Model

Each `RunLineCandidate` includes:

- Selected team
- Opponent
- Projected margin
- Sportsbook run line
- TrueLine run line
- Fair spread
- Win probability
- Cover probability
- Edge
- Expected value
- Confidence
- Recommendation
- Game grade
- Reasons
- Expandable scoring factors

## Scoring Factors

All weights live in `src/features/run-line-intelligence/config.ts`.

Factors:

- Projected margin
- Starting pitching
- Bullpen difference
- Offense difference
- Pitch Match
- Zone Match
- Home field
- Recent form
- Weather
- Ballpark
- Lineup strength
- Late-inning advantage
- Blowout potential

## Projection And Cover Probability

V1 anchors projected margin to the existing PredictionEngine projected runs when available:

```txt
Projected Margin = Selected Team Projected Runs - Opponent Projected Runs
```

Cover edge compares projected margin to the sportsbook run line:

```txt
Margin Edge = Projected Margin + Sportsbook Run Line
```

The cover probability is deterministic and intentionally simple. It is not calibrated yet.

## Ranking

Candidates are converted into normalized RankingEngine `BetCandidate` records using:

```ts
marketType: "run-line"
```

Ranking considers:

- Edge
- EV
- Confidence
- Data quality
- Run Line grade
- Bullpen difference
- Lineup strength
- Recent form
- Weather impact

RankingEngine behavior is unchanged.

## Calibration

The shared Calibration Engine can track:

- Cover percentage
- ROI
- CLV
- Historical accuracy

V1 does not add a persistent Run Line result store. Historical records should use:

```ts
market: "run-line"
```

## Backtesting

The shared Backtesting Engine can filter historical records with:

```ts
settings: { market: "run-line" }
```

This enables historical Run Line simulations, confidence buckets, sportsbook filters, and recommendation-tier testing after records are persisted.

## Current Limitations

- The current normalized odds model exposes one spread line and price per game.
- V1 mirrors the available spread price for the opposite side until true two-sided Run Line odds are normalized.
- Cover probability is deterministic and not calibrated to historical spread outcomes.
- Rest and travel are included as architecture-ready factors but not yet backed by a live provider.
- Defense is not included directly yet.

## Run Line V2 Roadmap

- Normalize two-sided Run Line odds and prices.
- Persist historical Run Line predictions and results.
- Calibrate cover probabilities by spread, total, park, and team profile.
- Add rest, travel, and schedule-density providers.
- Add defense and baserunning inputs.
- Add sportsbook-specific CLV for spreads.
- Add alternate run-line support.
