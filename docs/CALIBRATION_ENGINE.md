# TrueLine Calibration Engine V1

## Purpose

The Calibration Engine measures how accurate TrueLine predictions are after games are completed. It is not a prediction model, does not create new recommendations, and does not automatically tune model weights.

Version 1 records predictions, records actual outcomes, calculates model performance, and exposes an admin dashboard for monitoring.

## Architecture

The implementation lives in `src/services/calibration/`.

- `PredictionRecorder` normalizes prediction records at prediction time.
- `ResultRecorder` normalizes actual results after completion.
- `CalibrationCalculator` calculates accuracy, ROI, win rate, expected value accuracy, confidence accuracy, and scorecards.
- `ConfidenceCalibrationEngine` groups predictions into confidence buckets.
- `CalibrationService` orchestrates providers, joins predictions to results, and builds the dashboard view model.
- `MockCalibrationProvider`, `ReplayCalibrationProvider`, and `StaticCalibrationProvider` support mock, replay, and live-normalized flows.

The admin UI lives at `/admin/calibration` and consumes `CalibrationDashboardViewModel`.

## Replay Flow

Replay mode reads historical predictions and results from:

`replay/calibration/history.json`

Set `CALIBRATION_MODE=replay` to use replay data. Set `CALIBRATION_REPLAY_FILE` to point at a different fixture.

Mock mode returns deterministic sample records for local development. Live mode accepts normalized records supplied by future storage or ingestion services.

## Recorded Prediction Data

Each prediction stores:

- Prediction ID
- Player or team ID
- Market
- Sportsbook
- Odds
- Model probability
- Fair odds
- Edge
- Expected value
- Confidence
- Recommendation
- Timestamp
- Game ID
- Model ID

## Result Data

Each result can store:

- Actual strikeouts
- Actual hits
- Actual home runs
- Moneyline winner
- Closing edge
- Outcome
- Recorded timestamp

The model is intentionally expandable for future team totals, game totals, props, and other bet types.

## Metrics

For completed predictions, the engine calculates:

- Correct / incorrect
- Absolute error
- Probability error
- Calibration error
- Expected value accuracy
- Confidence accuracy
- ROI
- Win rate
- Average edge
- Average closing edge

## Confidence Calibration

Predictions are grouped into buckets:

- 50-55%
- 55-60%
- 60-65%
- 65-70%
- 70-75%
- 75-80%
- 80-85%
- 85-90%
- 90%+

Each bucket compares predicted win rate against actual win rate and returns a calibration score.

## Scorecards

The engine generates scorecards by model and market:

- Prediction count
- Win %
- ROI
- Average EV
- Average edge
- Calibration
- Average confidence
- Confidence accuracy

These scorecards are currently informational only.

## Ranking Integration

Ranking candidates and ranked results can expose historical performance fields:

- Historical ROI
- Historical calibration
- Historical win rate

Ranking formulas are not changed in V1. Future versions may use historical performance as a scoring factor after enough outcome data exists.

## Future Automatic Weight Adjustment

Calibration V1 only measures performance. Calibration V2 may add:

- Persistent prediction/result storage
- Closing line tracking
- Market-specific calibration curves
- Sportsbook-specific scorecards
- Model version comparisons
- Automated alerts when confidence buckets drift
- Offline model weight experiments

Automatic weight adjustment should only happen after historical sample sizes are large enough to avoid overfitting.
