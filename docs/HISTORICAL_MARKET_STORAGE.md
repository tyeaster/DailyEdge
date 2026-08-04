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

`drizzle/0004_historical_market_storage.sql`

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
- `model_confidence`
- `data_quality`
- `prediction_version`
- `model_version`
- `calibration_version`
- `fair_odds`
- `edge_percent`
- `expected_value_percent`
- `recommendation`
- `variance`
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
- `listSnapshotsByGameId()`
- `listSnapshots()`
- `listResults()`

Writes are idempotent by primary key. Recorder failures are logged and do not
break Daily Slate generation.

## Snapshot Lifecycle

Historical Market Storage receives snapshots from two places:

1. Daily Slate records slate-level markets as soon as live slate data is built.
2. Best Bets records every normalized supported market after market services
   produce candidates.

Daily Slate records:

- Moneyline
- Run Line
- Game Total
- Strikeouts
- Hits
- Home Runs
- Total Bases

Best Bets records:

- Moneyline
- Run Line
- Game Total
- Team Total
- Strikeouts
- Hits
- Home Runs
- Total Bases

Snapshots include model metadata whenever available:

- TrueLine probability
- Model confidence
- Data quality
- Prediction version
- Model version
- Calibration version
- Fair odds
- Edge
- Expected value
- Recommendation
- Variance

Daily Slate moneyline records use PredictionEngine metadata. Best Bets records
use each market service's normalized ranking candidate data.

## Settlement Lifecycle

Official game results ingestion now calls Historical Market Storage settlement
after game results are recorded.

Automatically settled from final game scores:

- Moneyline
- Run Line
- Game Total
- Team Total

Settlement writes `historical_market_results` rows with:

- final result
- win/loss/push
- actual stat where relevant
- settlement timestamp

Player prop settlement remains explicit in V1. The storage layer supports
settling Strikeouts, Hits, Home Runs, and Total Bases through `settleMarket()`
when an actual stat is available, but automatic player-prop settlement requires
a stable official player box-score result keyed to the same game/player IDs.

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

## Daily Slate Reconstruction

`HistoricalMarketStorageService.getDailySlateHistory()` groups snapshots by
date and game. This produces a historical slate-like structure using only
stored snapshots:

- date
- slate ID
- game IDs
- stored market snapshots per game

This is intended for historical review, replay, and future daily slate
reconstruction. It does not rebuild the full live UI view model because the UI
also depends on current team, player, weather, ballpark, and lineup objects.

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

- Automatic player-prop settlement needs a stable official player box-score
  provider keyed by game/player. Existing player game logs are useful for
  research, but they do not expose a stable game ID that can safely settle an
  individual market.
- Run Line and Game Total snapshots recorded directly by Daily Slate are
  odds-first; Best Bets records carry richer market-service metadata.
- There is no foreign-key enforcement yet; IDs remain application-level joins.
- No retention policy, archival job, indexing strategy, or warehouse export
  exists yet.

## V2 Roadmap

1. Add official player box-score settlement for props.
2. Add indexes for market/date/sportsbook/team/player queries.
3. Add dedicated closing-line capture tied to game start time.
4. Add historical market exports for model training and calibration notebooks.
