# TrueLine Backtesting Engine V1

## Purpose

The Backtesting Engine evaluates historical betting performance using existing prediction outputs. It does not create predictions, tune weights, or replace the Calibration Engine.

Backtesting answers:

- How would a strategy have performed historically?
- Which filters improved or hurt performance?
- How did bankroll change over time?
- Which markets produced the best ROI?

## Architecture

The implementation lives in `src/services/backtesting/`.

- `HistoricalSlateProvider` supplies historical slates in live-normalized, replay, or mock mode.
- `StrategyEvaluator` applies date, market, sportsbook, edge, EV, confidence, player, team, and odds filters.
- `BankrollSimulator` sizes wagers and replays bankroll changes.
- `BacktestRunner` combines strategy selection and bankroll simulation into a complete result.
- `BacktestService` orchestrates providers and produces `BacktestDashboardViewModel`.

The admin UI lives at `/admin/backtesting`.

## Replay

Replay mode reads:

`replay/backtesting/historical-slates.json`

Set `BACKTEST_MODE=replay` to run deterministic historical simulations. Set `BACKTEST_REPLAY_FILE` to use another fixture.

Mock mode provides deterministic local slates for tests and development. Live mode accepts normalized historical slates from future storage services.

## Inputs

Each historical slate contains:

- Predictions
- Odds
- Results
- Calibration records

Backtest settings support:

- Date range
- Market filters
- Minimum edge
- Minimum confidence
- Minimum EV
- Sportsbook
- Player
- Team
- Market
- Recommendation tier placeholder
- Maximum bets per day
- Favorites or underdogs
- Future weather, ballpark, pitch match, and zone match thresholds

## Bankroll

Bankroll settings support:

- Starting bankroll
- Flat betting
- Kelly sizing
- Fractional Kelly
- Fixed percentage staking
- Custom stake

Kelly sizing is deterministic and uses model probability plus American odds. The engine does not judge whether the model probability is calibrated; that remains the Calibration Engine’s responsibility.

## Metrics

V1 calculates:

- ROI
- Units won
- Profit
- Win %
- Loss %
- Push %
- Average odds
- Longest win streak
- Longest losing streak
- Maximum drawdown
- Sharpe-style return score
- Average daily profit
- Daily breakdown
- Bet history
- Equity curve
- Monthly performance
- Market breakdown
- Top and worst filter groups

## Strategy Evaluation

The StrategyEvaluator filters historical predictions before bankroll simulation. This allows tests such as:

- Only EV greater than a threshold
- Only confidence above a threshold
- Only favorites
- Only underdogs
- One market only
- One sportsbook only
- Maximum bets per day

V1 reports filter performance but does not optimize strategies automatically.

## Future Optimization Support

Backtesting V2 should add:

- Persistent historical slate storage
- Saved strategy definitions
- Parameter grid testing
- Market-specific backtest presets
- Closing line value tracking inside strategy results
- Weather, park, pitch match, and zone match filters once those historical fields are persisted
- Model-version comparisons
- Exportable reports

Automatic model weight optimization should remain outside V1 and should only happen after enough calibrated historical data exists.
