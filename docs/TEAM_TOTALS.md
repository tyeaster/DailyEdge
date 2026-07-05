# TrueLine Team Totals Intelligence V1

## Purpose

Team Totals Intelligence evaluates each team’s run-scoring opportunity for the current MLB slate. It is not a new PredictionEngine and does not replace existing win probability logic.

The module answers:

- Which teams are most likely to exceed their team total?
- Where does TrueLine differ from the sportsbook team total?
- Which baseball factors explain the scoring opportunity?

## Architecture

The implementation lives in `src/features/team-totals-intelligence/`.

- `TeamTotalsIntelligenceService` loads the existing Daily Slate and evaluates both teams in every game.
- Existing `MatchupService` supplies Pitch Match and Zone Match context.
- Existing slate data supplies weather, ballpark, bullpen, lineup, recent form, and PredictionEngine projected runs.
- `RankingEngineService` ranks team-total candidates as normalized `team-total` market candidates.
- Calibration and Backtesting already support the `team-total` market through shared market types.

The page route is:

`/betting/team-totals`

## Scoring Model

V1 uses a deterministic weighted score. The weights live in `config.ts`.

Factors:

- Offense quality
- Projected lineup strength
- Starting pitcher matchup
- Pitch Match score
- Zone Match score
- Bullpen strength
- Bullpen fatigue
- Park factor
- Weather
- Wind
- Temperature
- Recent form
- Home / away
- Rest and travel placeholder
- Opponent defense placeholder

The score becomes the Team Totals game grade. Projected runs are anchored to existing PredictionEngine projected runs when available, then adjusted by the team-total factor score, weather, and park context.

## Output

Each candidate includes:

- Projected runs
- Sportsbook team total
- TrueLine team total
- Edge
- Expected value
- Confidence
- Recommendation
- Game grade
- Reasons
- Scoring breakdown
- RankingEngine result

## Ranking

Candidates are converted into normalized RankingEngine `BetCandidate` records using market type `team-total`. RankingEngine behavior is unchanged.

## Calibration

Calibration supports Team Totals through the existing generic market scorecard flow:

- Team Total win rate
- Average edge
- ROI
- CLV
- Historical accuracy

V1 does not add a dedicated persistent team-total result provider.

## Backtesting

Backtesting supports Team Totals through the existing market filter:

`market: "team-total"`

This enables historical Team Total ROI, confidence filtering, sportsbook filtering, and market-specific strategy replay once historical team-total records are persisted.

## Current Limitations

- Sportsbook team totals are estimated from game totals until live team-total odds are available.
- Opponent defense is neutral placeholder data.
- Rest and travel are neutral placeholders.
- The module relies on existing slate projections and does not create a new prediction model.

## Team Totals V2

Recommended next steps:

- Add live team-total odds from the odds provider layer.
- Persist historical team-total predictions and results.
- Add defense, rest, travel, and umpire context.
- Add sportsbook-specific team-total CLV.
- Add separate Over / Under candidates.
- Add model-version calibration for team totals only.
