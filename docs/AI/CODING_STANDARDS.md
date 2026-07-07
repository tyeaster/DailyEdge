# Coding Standards

This document defines implementation standards for TrueLine. It is intended for senior engineers and AI coding agents continuing development without prior chat history.

Related:

- [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md)
- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md)
- [`../../PROJECT_PRINCIPLES.md`](../../PROJECT_PRINCIPLES.md)

## Language and Framework

TrueLine uses:

- TypeScript.
- Next.js App Router.
- React server components where possible.
- Tailwind-style utility classes.
- Node's built-in test runner.

Before modifying framework-sensitive files, read local Next docs in:

```text
node_modules/next/dist/docs/
```

This is required because the installed Next.js version may differ from assumptions in older examples.

## File Organization

Use the existing feature-first structure.

For market products:

```text
src/features/<market>-intelligence/
  config.ts
  service.ts
  <market>-intelligence-page.tsx

app/<route>/page.tsx
tests/<market>-intelligence.test.ts
docs/<MARKET>.md
```

For reusable engines:

```text
src/services/<engine>/
  config.ts
  types.ts
  <Engine>Service.ts
  index.ts
  providers.ts if needed
```

For providers:

```text
src/providers/<domain>/
  <Domain>Provider.ts
  LiveProvider.ts
  ReplayProvider.ts
  MockProvider.ts
  index.ts
```

Do not reorganize folders unless explicitly asked.

## TypeScript Standards

Use explicit interfaces for domain models and view models.

Prefer:

```ts
export interface TotalBasesCandidate {
  confidence: number;
  edgePercent: number;
  reasons: string[];
}
```

Avoid loosely typed objects crossing boundaries.

Use type imports:

```ts
import type { DailySlateViewModel } from "../../services/daily-slate/types.ts";
```

Keep type definitions near the feature when they are feature-specific. Promote to `src/models` or `src/services/**/types.ts` only when shared.

## Service Standards

Feature services should:

- Export a class for dependency injection.
- Export a singleton instance for app use.
- Export a convenience function for pages.
- Accept dependencies in the constructor when useful for tests.
- Provide `getXFromSlate(slate)` when the Daily Slate should be reused.

Example pattern:

```ts
export class MarketIntelligenceService {
  constructor(private readonly rankingEngine = new RankingEngineService()) {}

  async getMarketIntelligence(): Promise<MarketViewModel> {
    const { getDailySlate } = await import("../../services/daily-slate/service.ts");
    const slate = await getDailySlate();
    return this.getMarketIntelligenceFromSlate(slate);
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();
```

## React Standards

React pages/components should:

- Render view models.
- Handle presentation.
- Use shared UI primitives where practical.
- Avoid provider imports.
- Avoid calculation logic.
- Avoid duplicating domain decisions.

If React needs new derived data, add it to the service view model.

## Config Standards

All scoring weights and thresholds belong in config files:

```text
src/features/home-run-intelligence/config.ts
src/features/total-bases-intelligence/config.ts
src/services/ranking/config.ts
src/services/predictions/config.ts
```

Avoid magic numbers inside component render logic.

If a number materially affects output, document it in the relevant docs file.

## Calculation Standards

Calculations should:

- Be deterministic.
- Be pure where possible.
- Have tests.
- Use named helper functions.
- Return neutral values for missing data.

Missing data should usually return:

- `50` for neutral 0-100 scores.
- Existing market line for neutral fair line.
- Reduced confidence.
- A clear missing-data diagnostic if applicable.

## Testing Standards

Required commands before meaningful commits:

```bash
npm run lint
npm run build
npm test
npx tsc --noEmit
```

Add tests when changing:

- Odds math.
- Prediction logic.
- Ranking logic.
- Market scoring.
- Provider normalization.
- Replay behavior.
- Calibration/backtesting math.
- Correlation/exposure rules.

Current tests live in:

```text
tests/
```

## Documentation Standards

Every new market, provider domain, or engine needs documentation.

Include:

- Purpose.
- Architecture.
- Inputs.
- Outputs.
- Scoring.
- Replay/mock/live behavior.
- Current limitations.
- V2 roadmap.

Keep docs clear enough for a new engineer to continue without chat history.

## Git Standards

Expected workflow:

1. Check status.
2. Identify unrelated files.
3. Make scoped changes.
4. Run validation.
5. Stage only relevant files.
6. Commit with the requested message.
7. Push only when requested.
8. Update PR only when requested.

Do not stage known unrelated local files:

```text
app/globals.css
screenshots/
```

unless the user explicitly asks.

## Style Standards

Use concise names and explicit domain language.

Prefer:

- `projectedTotalBases`
- `sportsbookLine`
- `fairLine`
- `edgePercent`
- `expectedValuePercent`
- `confidence`
- `recommendation`

Avoid:

- `value`
- `score2`
- `data`
- `stuff`
- `magic`

Comments should explain non-obvious reasoning, not restate code.

