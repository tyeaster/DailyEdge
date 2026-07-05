# TrueLine Ranking Engine V1

## Purpose

The Ranking Engine creates a single, explainable scoring layer for every betting opportunity in TrueLine. It does not replace the PredictionEngine, MatchupService, or any market-specific lab. It sits above them and ranks normalized candidates from any market using a consistent scoring contract.

Version 1 is deterministic. It does not calibrate probabilities, train models, or call sportsbooks directly.

## Architecture

The implementation lives in `src/services/ranking/` and is intentionally provider-independent.

- `RankingEngineService` scores, sorts, filters, and ranks candidates.
- `BetCandidate` is the normalized input contract used by all future labs.
- `RankedBetCandidate` is the output contract for ranked opportunities.
- `RANKING_ENGINE_CONFIG` centralizes all scoring weights and thresholds.
- `MockRankingCandidateProvider`, `ReplayRankingCandidateProvider`, and `StaticRankingCandidateProvider` support mock, replay, and live normalized candidate flows.

React pages should not import providers or calculate ranking values. Labs should assemble their own market-specific intelligence, normalize it into `BetCandidate`, and pass those candidates into `RankingEngineService`.

## Inputs

Each candidate includes:

- Market type
- Player, team, and opponent context
- Sportsbook and sportsbook odds when available
- Model probability
- Fair odds
- Edge
- Expected value
- Confidence
- Variance
- Data quality
- Recommendation
- Supporting factors
- Timestamp

Supporting factors are generic so every lab can provide market-specific context without changing the ranking engine. Examples include matchup strength, weather impact, bullpen impact, lineup certainty, and recent form.

## Scoring

Version 1 uses a weighted score from 0 to 100. The initial weights are:

- Edge: 18%
- Expected value: 18%
- Confidence: 14%
- Data quality: 12%
- Matchup strength: 10%
- Bullpen impact: 6%
- Recent form: 6%
- Market risk: 5%
- Lineup certainty: 5%
- Weather impact: 3%
- Variance: 3%

Edge and expected value are normalized to bounded score ranges. Market risk and variance reduce the score when risk is higher. Missing supporting factors default to neutral values so incomplete markets can still be ranked without inflating the result.

## Outputs

The engine returns:

- Overall TrueLine Score from 0 to 100
- Overall grade from `A+` through `F`
- Confidence tier
- Risk tier
- Recommendation tier
- Rank position
- Reusable explanation strings

The score represents current recommendation quality under the active model version. It is not a promise of win rate.

## Filtering And Sorting

Ranking supports:

- Top N bets
- Minimum confidence
- Minimum edge
- Market type
- Player
- Team
- Sportsbook

Sorting supports:

- TrueLine Score
- Expected value
- Edge
- Confidence
- Model probability

## Replay

Replay mode reads normalized candidates from `replay/ranking/candidates.json` by default. A different fixture path can be supplied with `RANKING_REPLAY_FILE`.

Mode selection uses `RANKING_MODE`:

- `live`: accepts candidates already assembled by application services
- `replay`: reads local replay fixtures
- `mock`: returns deterministic mock candidates

Replay mode lets the ranking logic be tested without external network requests or provider availability.

## Future Calibration

Future versions should calibrate:

- Market-specific score weights
- Probability-to-grade mapping
- Variance estimates by bet type
- Closing line value impact
- Historical ROI by confidence tier
- Sportsbook-specific pricing quality
- Model-version performance history

Calibration should be based on stored outcomes, closing lines, and model version metadata. Until that exists, the engine remains a transparent deterministic scoring layer.
