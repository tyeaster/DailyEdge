# Best Bets Engine V1

Best Bets Engine V1 is the unified recommendation board for TrueLine. It aggregates candidates from every existing market and ranks them through the shared Ranking Engine.

It does not replace PredictionEngine and does not introduce a new prediction formula.

## Architecture

The implementation lives in `src/features/best-bets/`.

- `BestBetsService` loads the Daily Slate once.
- Existing intelligence services produce market-specific candidates.
- Best Bets normalizes each market into a shared candidate format.
- `RankingEngineService` ranks all candidates together.
- Calibration and Odds Intelligence enrich ranked results with historical context.
- React receives a completed `BestBetsViewModel`.

No React component calls providers directly.

## Route

`/best-bets`

## Aggregated Markets

V1 supports:

- Strikeouts
- Hits
- Total Bases
- Home Runs
- Moneyline
- Run Line
- Game Total
- Team Total

## Normalized Candidate Fields

Each candidate includes:

- Market
- Player when available
- Team
- Opponent
- Sportsbook
- Sportsbook line
- Fair line
- Model probability
- Edge
- Expected value
- Confidence
- Recommendation
- Game grade
- Risk tier
- Historical calibration
- Historical ROI
- CLV

## Ranking

All candidates are converted to RankingEngine `BetCandidate` records and ranked across markets.

The Ranking Engine considers:

- Edge
- Expected value
- Confidence
- Data quality
- Matchup strength
- Weather impact
- Bullpen impact
- Lineup certainty
- Recent form
- Market risk
- Variance

RankingEngine behavior is unchanged.

## Filters

Best Bets V1 supports service-level filters:

- Market
- Team
- Player
- Sportsbook
- Minimum confidence
- Minimum edge
- Minimum EV
- Risk tier

The initial UI renders the default unfiltered board.

## Display

The `/best-bets` page shows:

- Top 10
- Top 25
- Top 50
- Market summary cards
- Overall rank
- Market
- Player/team
- Sportsbook
- Odds
- Edge
- EV
- Confidence
- Recommendation
- Reasons
- Expandable scoring breakdown

## Calibration

Best Bets enriches markets with available Calibration Engine scorecards:

- Historical win rate
- ROI
- Confidence calibration
- Historical similar bets

When historical records are missing, the UI displays pending calibration instead of manufacturing data.

## Odds Intelligence

Best Bets attaches CLV from Odds Intelligence when a matching prediction or market movement record exists.

When CLV is unavailable, the board displays neutral/pending CLV.

## Backtesting

Backtesting supports replaying ranked candidate records by market through existing historical slate infrastructure. V1 does not add a new Best Bets-specific historical store.

Recommended backtest views for V2:

- Top 10 daily bets
- Top 25 daily bets
- Top 50 daily bets
- ROI by market
- ROI by risk tier
- ROI by confidence tier
- Actual results by recommendation tier

## Current Limitations

- Prop fair lines use available sportsbook display lines until prop-specific fair-line displays are normalized.
- Best Bets V1 reads market-level calibration, not exact same-bet historical nearest neighbors.
- CLV is attached from available odds intelligence history by prediction ID or market fallback.
- The initial UI shows the default board; interactive client-side filters are deferred.
- Some markets still depend on deterministic V1 probabilities that are not fully calibrated.

## Best Bets V2 Roadmap

- Add interactive filters and saved views.
- Add exact similar-bet matching.
- Add market-specific calibration curves directly on each card.
- Add Best Bets historical replay dashboard.
- Persist daily Best Bets rankings for ROI tracking.
- Add sportsbook-specific CLV and closing price comparison.
- Add confidence bucket performance by market.
- Add portfolio-level bankroll sizing.
