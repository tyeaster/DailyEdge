# Correlation & Exposure Engine V1

Correlation & Exposure Engine V1 evaluates relationships between ranked Best Bets recommendations. It does not replace PredictionEngine and does not change any prediction model.

## Architecture

The implementation lives in `src/features/correlation/`.

- `CorrelationEngineService` loads ranked recommendations from `BestBetsService`.
- `ExposureAnalyzer` calculates pairwise relationships between bets.
- `CorrelationViewModel` exposes portfolio exposure, warnings, and generated portfolios.
- `/analysis/correlation` renders the analysis.
- Best Bets cards expose lightweight correlation and exposure badges.

No provider is called from React. The engine consumes normalized Best Bets output.

## Correlation Rules

V1 detects:

- Same player
- Same team
- Same game
- Same offense
- Same sportsbook
- Positive correlation
- Negative correlation
- Duplicate exposure

Prepared categories:

- Same pitcher
- Portfolio-level pitcher dependency

Pitcher-specific relation depth will improve when each Best Bets candidate carries normalized pitcher IDs.

## Exposure Metrics

For each bet, V1 calculates:

- Exposure Score
- Correlation Score
- Diversification Score
- Portfolio Risk
- Conflict Score

Scores are deterministic and bounded from 0 to 100.

## Warnings

The engine generates warnings such as:

- Multiple recommendations rely on the same offense.
- Multiple bets depend on the same player.
- Multiple bets are tied to one game.
- A bet has negative-correlation conflict risk with related recommendations.

## Portfolio Generation

V1 creates:

- Diversified Top 10
- Highest EV Top 10
- Safest Portfolio
- Aggressive Portfolio

The diversified portfolio limits repeated player, team, and game exposure. Highest EV prioritizes expected value. Safest prioritizes lower portfolio risk. Aggressive allows more variance and correlation.

## Calibration And Backtesting

V1 does not add a new historical portfolio store. It is compatible with existing Calibration and Backtesting services because it operates on ranked Best Bets candidates.

Future historical records should track:

- Portfolio ROI
- Diversification ROI
- Correlation win rate
- Same-team portfolio performance
- Same-player portfolio performance
- Game-stack performance

## Current Limitations

- Pitcher-level exposure is limited until every market carries normalized pitcher IDs.
- Game identity is inferred from team/opponent pairs.
- Positive and negative correlation use deterministic market rules, not historical covariance.
- Best Bets badges use lightweight exposure metadata; the full portfolio view lives at `/analysis/correlation`.
- Portfolio construction is rule-based and not bankroll-optimized.

## Correlation V2 Roadmap

- Persist Best Bets portfolios and outcomes.
- Add historical covariance by market, player, team, and game.
- Add pitcher ID propagation to every Best Bets candidate.
- Add bankroll-aware portfolio sizing.
- Add parlay correlation scoring.
- Add lineup stack detection.
- Add under/over conflict detection using explicit side normalization.
- Backtest diversified, safest, and aggressive portfolios over historical slates.
