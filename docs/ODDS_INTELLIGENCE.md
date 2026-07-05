# TrueLine Odds Intelligence V1

## Purpose

Odds Intelligence measures sportsbook market movement and closing line value. It does not create predictions and does not change PredictionEngine behavior.

The engine answers:

- Did TrueLine beat the closing market?
- How did odds move from open to close?
- Which markets showed steam moves?
- Where did TrueLine agree or disagree with the market?

## Architecture

The implementation lives in `src/services/odds-intelligence/`.

- `OddsHistoryRecorder` normalizes odds snapshots.
- `ClosingLineCalculator` calculates CLV, opening edge, closing edge, market drift, line movement, and expected closing edge.
- `MarketMovementAnalyzer` classifies movement types.
- `SteamMoveDetector` flags large fast moves.
- `OddsIntelligenceService` builds `OddsMovementViewModel` and the dashboard view model.
- Mock, replay, and live-normalized providers support deterministic local testing and future storage.

The admin dashboard lives at `/admin/odds-intelligence`.

## CLV

Closing Line Value compares the price available when TrueLine identifies a bet against the final closing price.

In V1, CLV is measured as:

`current implied probability - closing implied probability`

Positive CLV means the recorded price was better than the closing market.

## Market Movement

V1 detects:

- Steam moves
- Reverse line movement
- Sharp agreement
- Sharp disagreement
- Late injury movement
- Weather movement placeholder
- Stable markets

Movement classification is deterministic and based on odds timeline changes.

## Calibration Integration

Calibration summaries now expose:

- Average CLV
- Closing accuracy
- Prediction vs market

These are informational metrics only.

## Backtesting Integration

Backtesting outputs now include ROI comparison by line source:

- Opening lines
- Current lines
- Closing lines

V1 does not optimize strategy based on this comparison.

## Future Sportsbook Expansion

Odds Intelligence V2 should add:

- Persistent odds-history storage
- Multi-sportsbook consensus lines
- Closing line snapshots from live providers
- Sportsbook-specific CLV scorecards
- Injury/weather tagged movement sources
- Market liquidity weighting
- Alerts when TrueLine gets stale against the market

Prediction weights should not be adjusted automatically until enough historical CLV and result data exists.
