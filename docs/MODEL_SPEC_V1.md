# DailyEdge MLB Prediction Model V1

This document defines the Version 1 design specification for the DailyEdge MLB Prediction Model.

It is a planning template, not an implementation. Do not treat any placeholder as a finalized formula. Detailed calculations, coefficients, training methods, validation thresholds, and production rules should be added only after model research and review.

Related documents:

- [Project Principles](../PROJECT_PRINCIPLES.md)
- [Model Spec](MODEL_SPEC.md)
- [Scoring](SCORING.md)

## 1. Purpose

Define the initial MLB prediction model that powers DailyEdge recommendations.

V1 should establish:

- The model's decision-making scope.
- The inputs required to produce reliable MLB predictions.
- The feature engineering plan.
- The prediction pipeline.
- The expected outputs for games and player props.
- The relationship between model probability, fair line, market edge, confidence, and recommendation strength.

The model must follow the DailyEdge principle that the prediction model is the product and the UI exists to present it. V1 should prioritize accuracy, explainability, deterministic calculations, and testability over visual expansion.

### To Be Completed

- Model objective:
- Target markets:
- Supported bet types:
- Minimum data requirements:
- Validation standard:
- Release criteria:

## 2. Inputs

V1 inputs should be normalized before entering the prediction pipeline. External provider details must remain outside the model layer.

Input groups should include:

- Schedule and game metadata.
- Probable starting pitchers.
- Team statistics.
- Player statistics.
- Sportsbook odds.
- Weather.
- Injuries and lineup availability.
- Bullpen context.
- Park factors.
- Line movement.

Reference the broader input taxonomy in [MODEL_SPEC.md](MODEL_SPEC.md).

### To Be Completed

- Required inputs:
- Optional inputs:
- Input freshness requirements:
- Missing-data fallback rules:
- Provider normalization requirements:
- Data quality checks:

## 3. Feature Engineering

Feature engineering transforms normalized inputs into model-ready signals. V1 should keep features documented, deterministic, and reproducible.

Potential feature groups:

- Pitcher quality and workload features.
- Batter and lineup strength features.
- Team offensive and defensive features.
- Bullpen fatigue and availability features.
- Weather-adjusted run environment features.
- Park-adjusted scoring features.
- Injury impact features.
- Market movement features.
- Prop-specific player features.

Do not add production formulas here until they have been researched, validated, and reviewed.

### To Be Completed

- Feature list:
- Feature definitions:
- Transformation rules:
- Normalization method:
- Missing-value strategy:
- Outlier handling:
- Feature ownership:
- Test coverage requirements:

## 4. Prediction Pipeline

The prediction pipeline should describe how DailyEdge turns inputs and features into model outputs.

V1 should make each pipeline step observable and testable:

1. Load normalized inputs.
2. Validate input completeness and freshness.
3. Generate model features.
4. Run prediction model.
5. Produce model outputs.
6. Calculate fair lines.
7. Calculate edge versus market.
8. Calculate confidence separately from odds.
9. Generate recommendation and reasoning.
10. Return typed outputs to services.

Business logic belongs in services and model utilities, never React components.

### To Be Completed

- Pipeline diagram:
- Runtime ownership:
- Batch versus request-time behavior:
- Error handling:
- Replay and fixture strategy:
- Observability requirements:
- Deterministic test scenarios:

## 5. Outputs

V1 outputs should be strongly typed and suitable for the recommendation engine, service layer, and UI presentation.

Expected output categories:

- Win probability.
- Fair line.
- Projected runs.
- Strikeout projection.
- Home run probability.
- Player prop projection.
- Confidence score.
- Edge score.
- Explainable reasoning.

Outputs should align with [SCORING.md](SCORING.md) and the future model outputs listed in [MODEL_SPEC.md](MODEL_SPEC.md).

### To Be Completed

- Output schema:
- Required fields:
- Optional fields:
- Precision and rounding rules:
- Explanation format:
- Consumer contracts:
- Versioning strategy:

## 6. Fair Line Calculation

Fair line calculation converts model probability into a DailyEdge price that can be compared against sportsbook odds.

This section should eventually define the approved formula, rounding behavior, probability bounds, and handling for two-sided markets.

Do not finalize formulas until model probability calibration has been validated.

### To Be Completed

- Probability input requirements:
- American odds conversion rules:
- Rounding rules:
- Probability bounds:
- Two-sided market handling:
- Push or void handling:
- Test cases:

## 7. Edge Calculation

Edge calculation compares DailyEdge model probability against sportsbook implied probability.

DailyEdge exists to find market value, not simply predict winners. Edge should remain distinct from confidence and should be calculated consistently across supported markets.

This section should eventually define how edge is calculated, displayed, thresholded, and tested.

### To Be Completed

- Sportsbook implied probability method:
- Vig removal policy:
- Model probability comparison:
- Edge percentage formula:
- Expected value formula:
- Display rounding:
- Market-specific edge rules:
- Test cases:

## 8. Confidence Calculation

Confidence calculation describes the model's certainty in its own projection. It must remain separate from sportsbook odds.

Confidence should account for input quality, model agreement, historical reliability, volatility, and known uncertainty. It should not be a disguised market price.

### To Be Completed

- Confidence inputs:
- Confidence labels:
- Confidence score range:
- Data completeness impact:
- Model agreement method:
- Volatility adjustments:
- Historical validation inputs:
- Test cases:

## 9. Recommendation Engine

The recommendation engine converts model outputs, edge, confidence, and bankroll rules into user-facing recommendations.

V1 should support the value ratings defined in [SCORING.md](SCORING.md):

- No Edge
- Lean
- Play
- Strong Play
- Elite

Recommended units should remain conservative until the model is validated against historical results.

### To Be Completed

- Recommendation thresholds:
- Value rating rules:
- Unit sizing rules:
- Market eligibility rules:
- Risk controls:
- Correlation handling:
- Explanation requirements:
- Test cases:

## 10. Future Improvements

This section should track improvements that are intentionally outside V1.

Potential future work:

- Historical backtesting framework.
- Automated model training pipeline.
- Model calibration dashboards.
- Closing-line value tracking.
- Live lineup adjustment.
- Umpire integration.
- Advanced weather and park interaction models.
- Multi-sport shared prediction framework.
- User-specific bankroll and risk settings.
- Automated monitoring for model drift.

### To Be Completed

- V2 candidates:
- Research backlog:
- Data provider needs:
- Testing infrastructure needs:
- Operational monitoring:
- Documentation updates:
