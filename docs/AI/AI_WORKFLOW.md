# AI Workflow

This document defines how AI coding agents should work in this repository.

Related:

- [`CLAUDE_HANDOFF.md`](CLAUDE_HANDOFF.md)
- [`LEAD_ENGINEER_PROMPT.md`](LEAD_ENGINEER_PROMPT.md)
- [`CODING_STANDARDS.md`](CODING_STANDARDS.md)

## Default Workflow

1. Read the user's request carefully.
2. Check `git status --short --branch`.
3. Identify unrelated changes.
4. Read relevant docs and source files.
5. Make the smallest scoped change that satisfies the request.
6. Avoid application code if the task is documentation-only.
7. Run required validation if code changed or user requested validation.
8. Stage only relevant files when committing.
9. Do not commit or push unless explicitly requested.
10. Summarize what changed and what was not changed.

## Repository Context First

Before substantial coding, read:

- `docs/AI/CLAUDE_HANDOFF.md`
- `PROJECT_PRINCIPLES.md`
- Relevant feature docs under `docs/`
- Existing implementation matching the requested pattern

Examples:

- For a new market, inspect `src/features/total-bases-intelligence/`.
- For provider work, inspect a matching provider folder under `src/providers/`.
- For ranking work, inspect `src/services/ranking/`.
- For prediction work, inspect `src/services/predictions/`.

## Do Not Violate Architecture

AI agents must not:

- Put provider calls in React components.
- Put betting math in UI components.
- Bypass RankingEngine for ranked betting markets.
- Remove replay/mock compatibility.
- Hardcode vendor response details outside providers.
- Refactor folders without explicit instruction.
- Stage unrelated local files.

## Known Local Workspace Caveat

At handoff, these untracked files were present:

```text
app/globals.css
screenshots/
```

Treat them as unrelated unless the user explicitly asks about them.

## Documentation-Only Tasks

If the user says not to modify code:

- Only create/update requested docs.
- Do not run formatters that modify application code.
- Do not commit unless asked.
- Do not push.
- Final response should clearly state that no app code was modified.

## Coding Tasks

For code tasks:

1. Read existing pattern.
2. Add service/config/page/test/doc as needed.
3. Keep business logic in services.
4. Keep weights in config.
5. Keep React components presentational.
6. Add tests.
7. Run validation.

Validation:

```bash
npm run lint
npm run build
npm test
npx tsc --noEmit
```

## Commit Workflow

Only commit when requested.

Before committing:

```bash
git status --short
git diff --check
```

Stage only relevant files. Avoid:

```text
app/globals.css
screenshots/
```

unless requested.

Use the exact commit message if the user provides one.

## Pull Request Workflow

Only push/update PR when requested.

Current active branch:

```text
codex/trueline-rebrand
```

Existing draft PR:

```text
https://github.com/tyeaster/DailyEdge/pull/5
```

Do not merge.

## Response Standard

Final responses should include:

- Files created/updated.
- Validation results if run.
- Commit/push/PR status if requested.
- Any known limitations.

Do not overexplain implementation internals unless the user asks.

## When to Challenge the Request

Politely flag requests that would:

- Add model complexity before data quality.
- Expose secrets to the client.
- Skip replay/mock support.
- Put logic into React.
- Bypass provider interfaces.
- Claim calibration without historical data.
- Ship admin pages without auth.

Then propose the safer implementation path.

