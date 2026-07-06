# Total Bases Intelligence V1

Total Bases Intelligence evaluates hitter total-base opportunities using the existing TrueLine architecture. It does not introduce a new provider layer or modify PredictionEngine.

## Purpose

The module answers:

> Which hitters have the strongest total-base opportunity today?

It ranks candidates by projected total bases, market value, matchup context, and confidence.

## Architecture

The implementation lives in:

- `src/features/total-bases-intelligence/service.ts`
- `src/features/total-bases-intelligence/config.ts`
- `src/features/total-bases-intelligence/total-bases-intelligence-page.tsx`
- `app/betting/total-bases/page.tsx`

React components render the finished `TotalBasesViewModel`. Calculation logic remains inside the service layer.

## Inputs

The service consumes normalized data from existing services and slate models:

- Daily Slate games and player props
- PlayerIntelligenceService for batter profile, recent form, rolling stats, trends, and consistency
- MatchupService for pitch match, zone match, and overall matchup score
- Pitcher Intelligence for opponent pitcher context
- Weather profile
- Ballpark profile
- Bullpen quality and workload
- Lineup status, batting order, and expected plate appearances

## Candidate Model

Each `TotalBasesCandidate` includes:

- Projected total bases
- Sportsbook line
- Fair line
- Edge
- Expected value
- Confidence
- Recommendation
- Game grade
- Player intelligence summary
- Matchup, pitch, and zone intelligence
- Weather, ballpark, bullpen, and lineup context
- Explainability breakdown
- Optional RankingEngine output

## Scoring

Weights live in `TOTAL_BASES_INTELLIGENCE_CONFIG`.

Current factors:

- Player Intelligence
- Recent Production
- Matchup Intelligence
- Pitch Intelligence
- Zone Intelligence
- Environment
- Lineup Opportunity
- Bullpen Opportunity

The V1 score is deterministic and intentionally transparent. It is not calibrated yet.

## Ranking

Total Bases candidates are converted to the shared `BetCandidate` shape and ranked through `RankingEngineService`.

The market is integrated with:

- Daily Slate Intelligence
- Best Bets
- `/betting/total-bases`

## Replay, Mock, and Live Compatibility

The service does not call providers directly from React. It consumes normalized slate, player, and matchup services, so it inherits the existing mock, replay, live, cache, and graceful-fallback behavior from those services.

## Limitations

- Sportsbook total-base prop availability depends on the existing Daily Slate prop data.
- The probability estimate is deterministic and not historically calibrated.
- Batter handedness splits and pitch-level total-base calibration remain future improvements.
- Expected plate appearances are estimated from lineup strength and batting order.

## V2 Roadmap

- Live sportsbook total-base prop odds coverage.
- Historical total-base result ingestion.
- Calibrated probability curves by line number.
- Pitch-type-specific total-base outcomes.
- Batter handedness splits against probable starters and bullpen profiles.
- Alternate total-base line probabilities.
