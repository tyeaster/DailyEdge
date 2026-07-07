# Next 100 Tasks

This document lists the next 100 development tasks in priority order, grouped by Production, Data, Models, UI, Infrastructure, and Future Sports.

Priority scale:

- P0: Required before Production V1.
- P1: High-value soon after foundation.
- P2: Important but can follow production basics.
- P3: Future expansion.

Effort scale:

- S: Small.
- M: Medium.
- L: Large.
- XL: Multi-sprint.

## Production

| # | Task | Priority | Effort | Dependencies | Expected Impact |
|---:|---|---|---|---|---|
| 1 | Choose production persistence technology | P0 | M | Product/deployment target | Establishes foundation for results, odds history, calibration, and accounts. |
| 2 | Design database schema for predictions | P0 | M | Task 1 | Makes generated recommendations durable. |
| 3 | Design database schema for odds snapshots | P0 | M | Task 1 | Enables CLV and movement history. |
| 4 | Design database schema for settled results | P0 | M | Task 1 | Enables real calibration and backtesting. |
| 5 | Add repository interfaces for persistence | P0 | M | Tasks 1-4 | Keeps storage vendor-agnostic. |
| 6 | Implement prediction persistence | P0 | L | Task 5 | Stores model outputs for evaluation. |
| 7 | Implement odds snapshot persistence | P0 | L | Task 5 | Stores market movement. |
| 8 | Implement result persistence | P0 | L | Task 5 | Enables settled performance analytics. |
| 9 | Add environment variable validation | P0 | S | None | Prevents silent production misconfiguration. |
| 10 | Add authentication provider decision | P0 | M | Product requirements | Starts admin/security foundation. |
| 11 | Implement authentication | P0 | L | Task 10 | Protects users/admin areas. |
| 12 | Implement authorization roles | P0 | M | Task 11 | Separates admin/internal/user capabilities. |
| 13 | Protect `/admin/backtesting` | P0 | S | Task 12 | Prevents public internal analytics access. |
| 14 | Protect `/admin/calibration` | P0 | S | Task 12 | Prevents public calibration access. |
| 15 | Protect `/admin/odds-intelligence` | P0 | S | Task 12 | Prevents public market intelligence access. |
| 16 | Add provider health checks | P0 | M | Env validation | Makes live data reliability visible. |
| 17 | Add structured error logging | P0 | M | Deployment target | Improves debugging and monitoring. |
| 18 | Add user-facing data freshness indicators | P0 | M | Provider health | Prevents stale-data confusion. |
| 19 | Review API licensing | P0 | M | Provider inventory | Reduces commercial launch risk. |
| 20 | Create production runbook | P0 | S | Tasks 1-19 | Gives operators deployment/debug guidance. |

## Data

| # | Task | Priority | Effort | Dependencies | Expected Impact |
|---:|---|---|---|---|---|
| 21 | Add live injury provider interface | P0 | M | None | Starts injury impact system. |
| 22 | Select live injury data source | P0 | M | Licensing review | Determines provider implementation. |
| 23 | Implement live injury provider | P0 | L | Tasks 21-22 | Adds missing production input. |
| 24 | Implement injury replay provider | P0 | S | Task 23 | Keeps tests/development deterministic. |
| 25 | Implement injury mock provider | P0 | S | Task 21 | Maintains fallback behavior. |
| 26 | Add injury impact normalization | P0 | M | Task 23 | Converts reports into model-ready context. |
| 27 | Integrate injuries into Daily Slate | P0 | M | Task 26 | Improves slate accuracy. |
| 28 | Integrate injuries into market services | P1 | L | Task 26 | Improves recommendations across markets. |
| 29 | Add live strikeout prop odds | P0 | L | Odds provider | Makes Strikeout Lab production useful. |
| 30 | Add live hits prop odds | P0 | L | Odds provider | Makes Hits Lab production useful. |
| 31 | Add live total-bases prop odds | P0 | L | Odds provider | Makes Total Bases Lab production useful. |
| 32 | Add live home-run prop odds | P0 | L | Odds provider | Makes Home Run Lab production useful. |
| 33 | Add live team-total odds | P0 | M | Odds provider | Improves Team Totals market. |
| 34 | Add full two-sided game total odds | P0 | M | Odds provider | Improves Game Totals EV. |
| 35 | Add full two-sided run line odds | P0 | M | Odds provider | Improves Run Line EV. |
| 36 | Add schedule replay provider | P1 | M | Schedule service | Completes replay strategy. |
| 37 | Add historical MLB game results ingestion | P0 | L | Persistence | Enables calibration/backtesting. |
| 38 | Add player prop settlement ingestion | P0 | XL | Persistence + prop odds | Enables prop calibration. |
| 39 | Add durable odds recorder job | P0 | L | Persistence + odds | Enables real CLV. |
| 40 | Add line movement attribution fields | P1 | M | Odds history | Improves Odds Intelligence explanations. |
| 41 | Add defense provider placeholder implementation | P1 | M | Data source decision | Improves Moneyline/Run Line. |
| 42 | Add travel/rest provider | P1 | M | Schedule data | Improves team markets. |
| 43 | Add umpire provider decision | P2 | M | Data audit | Improves strikeouts/totals if source is reliable. |
| 44 | Add lineup protection metric from confirmed lineups | P1 | S | Existing lineups | Improves hitter props. |
| 45 | Add expected plate appearances refinement | P1 | M | Lineups + team offense | Improves hits/TB/HR markets. |

## Models

| # | Task | Priority | Effort | Dependencies | Expected Impact |
|---:|---|---|---|---|---|
| 46 | Calibrate Moneyline probabilities | P0 | L | Historical results | Improves trust in game predictions. |
| 47 | Calibrate Run Line cover probabilities | P1 | L | Historical results + odds | Improves spread recommendations. |
| 48 | Calibrate Game Totals probabilities | P1 | L | Historical totals | Improves over/under recommendations. |
| 49 | Calibrate Team Totals probabilities | P1 | L | Team total results | Improves run-scoring markets. |
| 50 | Calibrate Strikeout prop probabilities | P0 | L | Prop settlement | Improves Strikeout Lab. |
| 51 | Calibrate Hits prop probabilities | P1 | L | Prop settlement | Improves Hits Lab. |
| 52 | Calibrate Total Bases probabilities | P1 | L | Prop settlement | Improves Total Bases Lab. |
| 53 | Calibrate Home Run probabilities | P1 | L | Prop settlement | Improves HR Lab. |
| 54 | Add model version registry | P0 | M | Persistence | Tracks model changes over time. |
| 55 | Add model output audit trail | P0 | M | Persistence | Enables debugging and compliance. |
| 56 | Add confidence calibration buckets by market | P0 | M | Historical results | Measures confidence reliability. |
| 57 | Add recommendation-tier performance tracking | P0 | M | Historical results | Validates tier quality. |
| 58 | Add data-quality tier performance tracking | P1 | M | Historical results | Shows whether data quality affects outcomes. |
| 59 | Add CLV-adjusted ranking signal | P1 | M | Odds history | Improves RankingEngine quality. |
| 60 | Add market-specific variance estimates | P1 | M | Historical results | Improves risk tiers. |
| 61 | Add correlation calibration | P2 | L | Historical portfolios | Improves portfolio recommendations. |
| 62 | Add alternate line probability framework | P2 | L | Prop settlement | Enables alt props. |
| 63 | Add injury impact model | P1 | M | Injury data | Improves market context. |
| 64 | Add defense impact model | P2 | M | Defense provider | Improves team markets. |
| 65 | Add weather sensitivity calibration | P2 | L | Historical weather/results | Improves totals and HR predictions. |

## UI

| # | Task | Priority | Effort | Dependencies | Expected Impact |
|---:|---|---|---|---|---|
| 66 | Add Best Bets market filter UI | P0 | M | Existing service filters | Makes recommendation board usable. |
| 67 | Add Best Bets confidence/edge/EV filters | P0 | M | Existing service filters | Improves research workflow. |
| 68 | Add Best Bets sorting controls | P0 | S | Existing ranking sort | Improves comparison workflow. |
| 69 | Add team/player/sportsbook filters | P1 | M | Search/filter components | Improves user navigation. |
| 70 | Add global search | P1 | L | Search service | Helps navigate players/teams/markets. |
| 71 | Build player research index | P1 | M | Search + player data | Makes `/research/players` useful. |
| 72 | Build team research page | P1 | M | Team strength/recent form | Makes `/research/teams` useful. |
| 73 | Build ballpark research page | P1 | M | Ballpark data | Makes `/research/ballparks` useful. |
| 74 | Add line movement timeline UI | P1 | M | Odds history | Improves Odds Intelligence. |
| 75 | Add calibration detail drilldowns | P1 | M | Historical calibration | Improves model trust. |
| 76 | Add backtest strategy builder UI | P1 | L | Backtesting + persistence | Makes backtesting usable. |
| 77 | Add correlation details to Best Bets cards | P1 | M | Existing correlation data | Improves portfolio awareness. |
| 78 | Add responsive QA pass for all routes | P1 | M | Stable pages | Improves product quality. |
| 79 | Remove or redirect legacy `/team/*` routes | P1 | S | Route decision | Reduces navigation confusion. |
| 80 | Extract reusable market candidate card | P2 | M | Existing market pages | Reduces UI duplication. |

## Infrastructure

| # | Task | Priority | Effort | Dependencies | Expected Impact |
|---:|---|---|---|---|---|
| 81 | Add production cache provider interface implementation | P0 | M | Cache vendor decision | Reduces API usage at scale. |
| 82 | Add Redis/Vercel KV adapter | P0 | M | Task 81 | Makes cache durable/shared. |
| 83 | Add cache metrics | P1 | M | Task 82 | Improves observability. |
| 84 | Add provider rate-limit handling | P0 | M | Provider audit | Prevents API failures. |
| 85 | Add provider fallback telemetry | P1 | M | Logging | Makes degraded data visible. |
| 86 | Add CI validation workflow | P0 | M | GitHub Actions | Protects main branch. |
| 87 | Add coverage script | P1 | S | Test runner | Measures test quality. |
| 88 | Add coverage thresholds | P1 | M | Task 87 | Prevents regression. |
| 89 | Add e2e smoke tests | P1 | M | Test framework decision | Protects key routes. |
| 90 | Add visual regression screenshots | P2 | M | E2E setup | Protects dense dashboards. |
| 91 | Add deployment docs | P0 | S | Deployment target | Enables production operations. |
| 92 | Add incident runbook | P1 | S | Observability | Improves support response. |
| 93 | Add API key rotation process | P1 | S | Secrets management | Improves security. |
| 94 | Refresh README doc index | P1 | S | Current docs | Improves onboarding. |
| 95 | Refresh `docs/PROJECT_STATE.md` | P1 | S | Current audit | Improves current-state accuracy. |

## Future Sports

| # | Task | Priority | Effort | Dependencies | Expected Impact |
|---:|---|---|---|---|---|
| 96 | Define shared sport abstraction boundaries | P3 | M | MLB Production V1 | Prevents MLB assumptions leaking. |
| 97 | Audit WNBA data providers | P3 | M | Shared abstractions | Prepares next sport. |
| 98 | Prototype WNBA schedule/odds providers | P3 | L | WNBA provider audit | Tests multi-sport architecture. |
| 99 | Define basketball player prop model requirements | P3 | M | WNBA/NBA roadmap | Guides future models. |
| 100 | Create multi-sport migration plan | P3 | L | Tasks 96-99 | Enables expansion without rewrite. |

