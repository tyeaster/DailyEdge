# Historical Market Storage V1

Historical Market Storage is TrueLine's canonical market ledger. It stores
resolved sportsbook markets over time and connects them to TrueLine model values
and eventual settlement results.

This layer does not replace PredictionEngine, RankingEngine, Calibration,
Backtesting, or Odds Intelligence. It feeds those systems with durable market
history.

## Purpose

The storage layer enables:

- calibration by market, sportsbook, team, and player
- backtesting against historical opening/current/closing prices
- closing line value analysis
- ranking from stored candidates
- future model optimization and market-level reporting

## Schema

Migration:

`drizzle/0004_adorable_baron_strucker.sql`

Tables:

### `historical_market_snapshots`

One row per resolved market observation.

Fields include:

- `snapshot_id`
- `game_id`
- `player_id`
- `team_id`
- `market`
- `sportsbook`
- `opening_odds`
- `current_odds`
- `closing_odds`
- `true_line_probability`
- `fair_odds`
- `edge_percent`
- `expected_value_percent`
- `line`
- `selection`
- `provider`
- `captured_at`
- `updated_at`

### `historical_market_results`

One settlement row per historical market snapshot.

Fields include:

- `result_id`
- `snapshot_id`
- `market`
- `outcome`
- `actual_stat`
- `final_result`
- `settled_at`

## Supported Markets

The schema supports all current `BetMarketType` values:

- Moneyline
- Run Line
- Game Total
- Team Total
- Strikeouts
- Hits
- Home Runs
- Total Bases

It also preserves future market extensibility for PrizePicks, parlays, and other
market types already represented by the ranking model.

## Service Layer

Primary service:

`src/services/historical-market-storage/HistoricalMarketStorageService.ts`

Provider modes:

- Live: `DurableHistoricalMarketProvider`
- Replay: `ReplayHistoricalMarketProvider`
- Mock: `MockHistoricalMarketProvider`
- Empty fallback: `StaticHistoricalMarketProvider`

Replay fixture:

`replay/historical-market-storage/history.json`

## Persistence

Repository:

`src/persistence/repositories/historical-market-repository.ts`

The repository provides:

- `recordSnapshot()`
- `settleMarket()`
- `findSnapshot()`
- `listSnapshots()`
- `listResults()`

Writes are idempotent by primary key. Recorder failures are logged and do not
break Daily Slate generation.

## Daily Slate Integration

Live Daily Slate now records resolved game-level markets:

- Moneyline
- Run Line
- Game Total

Moneyline snapshots include PredictionEngine values:

- TrueLine probability
- Fair odds
- Edge
- Expected value
- Selected team

Run Line and Game Total are stored odds-first until their market-specific model
values are wired into the central ledger.

## Calibration Integration

`DurableCalibrationProvider` now merges records from Historical Market Storage
with the legacy `predictions` and `prediction_results` tables.

Historical Market Storage records win when IDs overlap, because they contain the
newer market-level structure.

## Backtesting Integration

`DurableHistoricalSlateProvider` now merges historical market predictions and
settlements into daily slates.

This allows stored market snapshots to replay through the existing
`BacktestRunner` and `StrategyEvaluator` without changing bankroll or strategy
logic.

## Odds Intelligence Integration

`DurableOddsIntelligenceProvider` now prefers Historical Market Storage when it
contains odds history.

Snapshots become `OddsHistoryRecord` rows. Snapshots with `closing_odds` also
produce `OddsClosingRecord` rows for CLV calculation.

## Ranking Integration

`RANKING_MODE=live` now resolves to `DurableRankingCandidateProvider`.

When `DATABASE_URL` is configured, ranking candidates can be reconstructed from
historical market snapshots. Without a database, the provider degrades to an
empty static response.

## Replay

Replay mode reads:

`replay/historical-market-storage/history.json`

The fixture includes:

- a settled strikeout market
- a game-total odds-only market

This verifies both full model-backed records and odds-only records.

## Current Limitations

- Settlement automation is not fully wired to live final stats yet.
- Player prop and team-total products must call `recordSnapshot()` from their
  dedicated market services to populate complete market history.
- Run Line and Game Total snapshots are currently odds-only from Daily Slate.
- Historical records reconstructed into RankingEngine use conservative default
  confidence/data-quality values unless captured from a market service.
- There is no foreign-key enforcement yet; IDs remain application-level joins.
- No retention policy, archival job, or warehouse export exists yet.

## V2 Roadmap

1. Add automatic settlement jobs for props and team markets.
2. Record all Best Bets candidates into the historical ledger.
3. Store confidence, data quality, and variance directly on snapshots.
4. Add indexes for market/date/sportsbook/team/player queries.
5. Add closing-line capture tied to game start time.
6. Add historical market exports for model training and calibration notebooks.
