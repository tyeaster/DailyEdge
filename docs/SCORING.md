# Scoring

DailyEdge scoring turns model outputs and market prices into simple, ranked decisions.

## Daily Edge Score

The Daily Edge Score is the top-level ranking signal for recommendations. It should combine model edge, confidence, market quality, data freshness, and risk.

Future inputs may include:

- Edge percentage
- Expected value
- Confidence score
- Odds freshness
- Injury or weather certainty
- Line movement
- Market liquidity
- Bankroll exposure

## Confidence Score

Confidence score communicates how reliable the model believes a recommendation is.

Current labels:

- Low
- Medium
- High
- Elite

Confidence should be based on signal strength, input completeness, model agreement, and risk factors. It is not the same as edge.

## Edge Percentage

Edge percentage compares DailyEdge model probability to sportsbook implied probability.

Example:

```text
edgePercent = modelProbability - sportsbookImpliedProbability
```

A positive edge means the model sees more probability than the market price implies.

## Expected Value

Expected value estimates the long-term value of a bet at the current price.

Expected value should consider:

- Model probability
- Sportsbook price
- Payout
- Stake size
- Vig-adjusted market context when available

EV should be used with confidence and bankroll rules, not as the only decision input.

## Value Ratings

DailyEdge uses five value ratings:

- No Edge
- Lean
- Play
- Strong Play
- Elite

Suggested interpretation:

- No Edge: price is not better than the model number.
- Lean: small model advantage, usually watchlist only.
- Play: actionable value with acceptable confidence.
- Strong Play: clear value with strong supporting signals.
- Elite: rare, high-edge recommendation with high confidence and clean inputs.

## Recommended Units

Recommended units translate value and confidence into stake sizing.

Unit recommendations should account for:

- Value rating
- Edge percentage
- Confidence score
- Market type
- Bankroll limits
- Correlated exposure
- User risk settings

Recommended units should remain conservative until the prediction engine is validated against historical results.
