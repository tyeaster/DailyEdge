# Repository Walkthrough

This document walks a new Lead Engineer through the TrueLine repository. It explains why each major folder exists, what belongs there, important files, common extension points, and mistakes to avoid.

Related documents:

- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md)
- [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md)
- [`CODING_STANDARDS.md`](CODING_STANDARDS.md)
- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md)

## Repository Root

### Why It Exists

The root contains project configuration, package metadata, public documentation, and top-level product principles.

### What Belongs There

- Project configuration.
- Package scripts.
- Top-level engineering philosophy.
- Global README.
- Tooling config.

### Important Files

- `package.json`: scripts and dependencies.
- `tsconfig.json`: TypeScript configuration.
- `next.config.ts`: Next.js configuration.
- `eslint.config.mjs`: lint configuration.
- `README.md`: high-level docs index.
- `PROJECT_PRINCIPLES.md`: engineering constitution.
- `AGENTS.md`: AI/agent-specific repository instructions.
- `CLAUDE.md`: prior Claude-oriented context if used by future tools.

### Extension Points

- Add scripts only when they are broadly useful.
- Add root docs only for project-wide principles. More specific docs belong under `docs/`.

### Mistakes to Avoid

- Do not put feature docs at the root.
- Do not add secrets to config or README.
- Do not change package scripts casually; CI and AI workflows may depend on them.

## `app/`

### Why It Exists

This is the Next.js App Router entrypoint. It defines routes, metadata, layouts, loading states, and top-level page composition.

### What Belongs There

- Route folders.
- `page.tsx` files.
- `layout.tsx`.
- Route metadata.
- Minimal route-level composition.

### Important Files and Folders

- `app/layout.tsx`: root layout.
- `app/page.tsx`: Daily Slate homepage.
- `app/best-bets/page.tsx`: Best Bets route.
- `app/analysis/correlation/page.tsx`: Correlation route.
- `app/betting/*`: betting market routes.
- `app/hitting/*`: hitter market/research routes.
- `app/pitching/strikeouts/page.tsx`: strikeout workflow.
- `app/matchups/*`: matchup intelligence routes.
- `app/admin/*`: internal analytics/admin dashboards.
- `app/team/*`: legacy placeholder routes.

### Extension Points

To add a page:

1. Create a route folder under `app/`.
2. Import a feature page from `src/features/**`.
3. Add metadata.
4. Keep the route file thin.

### Mistakes to Avoid

- Do not put business logic in `app/**/page.tsx`.
- Do not import providers into route files.
- Do not fetch vendors directly here.
- Do not assume App Router behavior from memory; inspect local Next docs in `node_modules/next/dist/docs/` before framework-sensitive changes.

## `src/features/`

### Why It Exists

Feature folders own product experiences, market-specific services, view models, and pages. This is where user-facing workflows are assembled.

### What Belongs There

- Feature services.
- Feature page components.
- Market scoring config.
- View model types.
- Product-specific UI composition.

### Important Folders

- `daily-slate-intelligence/`: homepage orchestration and Daily Slate view model.
- `best-bets/`: unified cross-market recommendation board.
- `correlation/`: correlation and exposure product page/service.
- `pitcher-research/`: pitcher/strikeout research experience.
- `hitter-research/`: hitter hits/total-bases research experience.
- `zone-intelligence/`: pitcher-vs-batter zone intelligence page.
- `home-run-intelligence/`: HR market service/page/config.
- `total-bases-intelligence/`: dedicated Total Bases market service/page/config.
- `moneyline-intelligence/`: Moneyline market service/page/config.
- `run-line-intelligence/`: Run Line market service/page/config.
- `team-totals-intelligence/`: Team Totals market service/page/config.
- `game-totals-intelligence/`: Game Totals market service/page/config.
- `backtesting-admin/`: admin backtesting dashboard.
- `calibration-admin/`: admin calibration dashboard.
- `odds-intelligence-admin/`: admin odds intelligence dashboard.
- `coming-soon/`: placeholder page service.

### Extension Points

Use `src/features/total-bases-intelligence/` as the current best market template:

- `config.ts`
- `service.ts`
- `total-bases-intelligence-page.tsx`

New markets should generally:

- Create a dedicated feature folder.
- Build a typed candidate model.
- Build a typed view model.
- Integrate RankingEngine.
- Add a page route.
- Add tests.
- Add docs.

### Mistakes to Avoid

- Do not duplicate provider calls in features.
- Do not calculate betting math in React.
- Do not skip RankingEngine for ranked markets.
- Do not create broad shared abstractions too early; extract only after duplication is clearly harmful.

## `src/services/`

### Why It Exists

Services own shared business logic, domain orchestration, analytics engines, and normalized data access. This is the core backend-style layer inside the frontend application.

### What Belongs There

- Prediction logic.
- Ranking logic.
- Calibration logic.
- Backtesting logic.
- Odds intelligence logic.
- Matchup intelligence logic.
- Player intelligence logic.
- Domain service wrappers around providers.
- Shared types and utilities.

### Important Folders and Files

- `predictions/`: PredictionEngine V1 and diagnostics.
- `ranking/`: shared BetCandidate ranking system.
- `calibration/`: prediction/result calibration records and dashboards.
- `backtesting/`: historical strategy simulation and bankroll math.
- `odds-intelligence/`: CLV, line movement, steam/reverse movement.
- `matchup/`: pitch/zone/recent matchup intelligence.
- `player-intelligence/`: pitcher and batter logs, trends, consistency, recent form.
- `daily-slate/`: base Daily Slate service and types.
- `mlb/`: MLB client and types.
- `odds/`: odds client and normalized game odds helpers.
- `weather/`: weather client/types.
- `providers/`: early schedule-oriented provider service layer.
- `shared/`: shared service types.
- `WeatherService.ts`, `BallparkService.ts`, `BullpenService.ts`, `LineupService.ts`, `PitcherService.ts`, `RecentFormService.ts`, `TeamStrengthService.ts`, `OddsService.ts`: service wrappers over provider domains.

### Extension Points

Add reusable engines here when multiple feature pages or markets will consume them.

Good candidates:

- Persistence repositories.
- Auth/session service.
- Injury impact service.
- Search service.
- Portfolio optimization service.
- Production provider health service.

### Mistakes to Avoid

- Do not mix React concerns into services.
- Do not let services return vendor-shaped responses.
- Do not mutate global hidden state except through explicit cache abstractions.
- Do not change PredictionEngine formulas casually.

## `src/providers/`

### Why It Exists

Providers isolate live, replay, and mock data access from product logic.

### What Belongs There

- Provider interfaces.
- Live provider implementations.
- Replay provider implementations.
- Mock provider implementations.
- Provider-specific normalization and rating helpers.

### Important Folders

- `odds/`: OddsPipe, replay, and mock odds providers.
- `weather/`: Open-Meteo, replay, and mock weather providers.
- `ballparks/`: MLB/Savant, replay, and mock ballpark providers.
- `bullpen/`: MLB bullpen provider and rating logic.
- `lineups/`: MLB confirmed/projected lineup provider and rating logic.
- `pitchers/`: MLB pitcher stats provider.
- `player-intelligence/`: pitcher and batter game-log providers.
- `team-strength/`: MLB team stat providers.
- `recent-form/`: rolling team recent-form providers.
- `matchup/`: Statcast, replay, and mock matchup providers.

### Extension Points

To add a provider:

1. Add or update interface.
2. Add live provider.
3. Add replay provider.
4. Add mock provider.
5. Add fixtures under `replay/`.
6. Add tests.
7. Update docs.

### Mistakes to Avoid

- Do not import providers into React.
- Do not leak provider-specific field names into feature services.
- Do not skip replay/mock.
- Do not expose API keys to the client.

## `src/models/`

### Why It Exists

Models define shared domain types.

### What Belongs There

- Core MLB models.
- Betting models.
- Sport abstractions.
- Re-export index files.

### Important Files

- `mlb.ts`: core MLB domain model.
- `betting.ts`: betting-related model types.
- `sports.ts`: shared sport concepts.
- `index.ts`: model exports.

### Extension Points

Promote types here only when multiple services/features need them.

### Mistakes to Avoid

- Do not put feature-only view models here.
- Do not let vendor response shapes become models.
- Do not overgeneralize MLB-specific concepts into shared sports types.

## `src/cache/`

### Why It Exists

Defines cache abstractions and the current in-memory cache implementation.

### What Belongs There

- Cache provider interface.
- Memory cache.
- Future Redis/Vercel KV/Cloudflare KV adapters.

### Important Files

- `CacheProvider.ts`
- `MemoryCache.ts`
- `index.ts`

### Extension Points

Add production cache implementations here.

### Mistakes to Avoid

- Do not couple services directly to Redis/Vercel KV without going through the cache interface.
- Do not assume in-memory cache is production-sufficient.

## `src/components/`

### Why It Exists

Contains shared UI primitives and layout components.

### What Belongs There

- App shell.
- Research cards/metrics.
- Dashboard cards.
- UI primitives.
- Layout components.

### Important Folders

- `app-shell/`: persistent navigation and responsive shell.
- `research/`: reusable research UI components such as cards and metrics.
- `dashboard/`: older dashboard-specific card components.
- `ui/`: primitive UI components.
- `layout/`: older layout components.

### Extension Points

Create shared components when multiple feature pages repeat the same structure.

### Mistakes to Avoid

- Do not put domain calculations in components.
- Do not over-extract one-off UI.
- Do not redesign the whole shell for isolated market work.

## `src/lib/`

### Why It Exists

Contains small shared utilities.

### Important Files

- `odds.ts`: odds conversion, fair line, vig, edge, formatting.
- `cn.ts`: class name helper.
- `format-section-id.ts`: formatting utility.

### Extension Points

Add pure, broadly shared utilities here.

### Mistakes to Avoid

- Do not add feature-specific business logic here.
- Do not duplicate odds math elsewhere.

## `src/constants/`

### Why It Exists

Contains shared constants.

### Important Files

- `app.ts`
- `routes.ts`
- `sports.ts`
- `index.ts`

### Extension Points

Use for stable app-wide constants.

### Mistakes to Avoid

- Do not use constants as a dumping ground for config that should be feature-specific.

## `src/design-system/`

### Why It Exists

Defines design tokens and theme concepts.

### Important Files

- `colors.ts`
- `spacing.ts`
- `typography.ts`
- `theme.ts`
- `shadows.ts`
- `animations.ts`

### Extension Points

Use when consolidating visual consistency.

### Mistakes to Avoid

- Do not redesign the product through token changes unless explicitly requested.

## `src/types/`

### Why It Exists

Contains shared UI/app type definitions.

### Important Files

- `mlb-dashboard.ts`
- `navigation.ts`

### Extension Points

Use for shared UI-facing types that are not domain models.

### Mistakes to Avoid

- Do not duplicate domain models from `src/models`.

## `src/styles/`

### Why It Exists

Contains style assets.

### Important Files

- `globals.css`

### Mistakes to Avoid

- Be careful: there is also an untracked `app/globals.css` in the current workspace. Do not stage or overwrite it unless explicitly directed.

## `mock/`

### Why It Exists

Contains deterministic mock MLB data used by mock providers and fallback flows.

### Important Files

- `mlb-data.ts`
- `index.ts`

### Extension Points

Add mock records when new models or providers need synthetic fallback data.

### Mistakes to Avoid

- Do not make mock data look like live truth in UI copy.
- Keep mock data realistic enough for layouts and tests.

## `replay/`

### Why It Exists

Contains replay fixtures for deterministic local development and tests.

### Important Folders

- `backtesting/`
- `ballparks/`
- `calibration/`
- `lineups/`
- `matchup/`
- `odds-intelligence/`
- `player-intelligence/`
- `ranking/`
- `weather/`

### Extension Points

Add replay fixtures whenever adding a provider.

### Mistakes to Avoid

- Do not store secrets or paid raw data that cannot be committed.
- Do not let replay fixtures drift from provider contracts.

## `tests/`

### Why It Exists

Contains deterministic tests using Node's built-in test runner.

### What Belongs There

- Unit tests.
- Service tests.
- Provider normalization tests.
- Replay tests.
- Market scoring tests.
- Engine tests.

### Important Patterns

Test files follow:

```text
tests/<domain>.test.ts
```

Examples:

- `tests/prediction-engine.test.ts`
- `tests/ranking-engine.test.ts`
- `tests/best-bets.test.ts`
- `tests/total-bases-intelligence.test.ts`
- `tests/matchup.test.ts`

### Extension Points

Add tests for every important calculation and provider contract.

### Mistakes to Avoid

- Do not rely on live network calls for normal tests.
- Do not make tests depend on test execution order.
- Do not skip tests for scoring changes.

## `docs/`

### Why It Exists

Contains product, architecture, provider, model, scoring, market, and AI handoff documentation.

### Important Existing Docs

- `ARCHITECTURE.md`
- `API_PROVIDERS.md`
- `PROJECT_STATE.md`
- `PRODUCT_BLUEPRINT.md`
- `PREDICTION_ENGINE_V1.md`
- `RANKING_ENGINE.md`
- `BEST_BETS.md`
- `TOTAL_BASES.md`
- `CORRELATION_ENGINE.md`
- `BACKTEST_ENGINE.md`
- `CALIBRATION_ENGINE.md`

### `docs/AI/`

AI and lead-engineer handoff docs:

- `CLAUDE_HANDOFF.md`
- `ENGINEERING_PRINCIPLES.md`
- `CODING_STANDARDS.md`
- `ARCHITECTURE_DECISIONS.md`
- `PRODUCT_VISION.md`
- `BETTING_PHILOSOPHY.md`
- `AI_WORKFLOW.md`
- `LEAD_ENGINEER_PROMPT.md`
- `ROADMAP_MASTER.md`
- `PROJECT_STATE_TEMPLATE.md`
- `GLOSSARY.md`
- `FUTURE_SPORTS.md`
- `REPOSITORY_WALKTHROUGH.md`
- `PROJECT_MEMORY.md`
- `NEXT_100_TASKS.md`

### Extension Points

Add a doc when adding a system, market, provider, or major workflow.

### Mistakes to Avoid

- Do not let docs drift after behavior changes.
- Do not duplicate whole documents unnecessarily; cross-link instead.

## `public/`

### Why It Exists

Contains static public assets.

### Current Contents

Default SVG assets such as:

- `file.svg`
- `globe.svg`
- `next.svg`
- `vercel.svg`
- `window.svg`

### Extension Points

Add static images/icons only when they are actually used.

### Mistakes to Avoid

- Do not store secrets or generated screenshots here unless they are product assets.

## `.next/`

### Why It Exists

Generated Next.js build output.

### What Belongs There

Nothing manually authored.

### Mistakes to Avoid

- Do not edit.
- Do not commit.

## `node_modules/`

### Why It Exists

Installed dependencies.

### Mistakes to Avoid

- Do not edit.
- Do not commit.

