# TrueLine Phase 2 Data Plan

Phase 2 improves the completeness and freshness of model inputs. It does not
add prediction formulas or redesign the Prediction Engine.

## Source Audit

| Category | Official MLB source | Free source | Paid option | Scraping option | Replay | Cache | Missing-data confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bullpen quality | MLB Stats API relief-pitcher season and date-range stats | Official endpoint | SportsDataIO or Sportradar | Not needed | Raw and normalized fixtures | 30 minutes | Neutral bullpen factor; Data Quality decreases |
| Confirmed lineups | MLB schedule hydration plus active-roster season hitting stats | Official endpoint | SportsDataIO or Sportradar | MLB game page is possible but unnecessary | Raw schedule/roster and normalized fixtures | 1 minute confirmed; 5 minutes projected; roster 1 hour | Project latest official lineup at 65 confidence; neutral if unavailable |
| Weather | MLB game feed supplies basic game weather; venue endpoint supplies coordinates and roof | OpenWeather forecast allowance | OpenWeather paid, SportsDataIO, Sportradar | Avoid weather-site scraping | Record provider forecast payloads | 10–15 minutes | Neutral weather input; preserve roof and venue facts |
| Ballpark factors | MLB Baseball Savant Statcast Park Factors | Official Baseball Savant data | SportsDataIO or proprietary model | Savant table/CSV extraction if no stable JSON endpoint | Record normalized season table | Daily during season; weekly for three-year factors | Neutral park factor |
| Injury impact | MLB transactions, roster status, and injured-list assignments | Official endpoints, but impact detail is limited | SportsDataIO or Sportradar injuries/news | Team transaction pages are a fallback | Record transaction and normalized injury payloads | 5–15 minutes | Unknown impact; do not infer severity |
| Umpire data | MLB schedule/game feed supplies assignments | Official assignments | Sportradar or specialist umpire data vendor | Historical MLB boxscore aggregation; UmpScorecards only if terms permit | Record assignments and derived history | Assignment: 5 minutes; historical profile: daily | Omit umpire factor |

## Implementation Order

1. Live bullpen quality. Complete.
2. Confirmed starting lineups. Complete.
3. Stadium-level weather and roof state. Next.
4. Baseball Savant park factors.
5. Injury status and explicit impact mapping.
6. Umpire assignments and optional historical profile.

Every provider should preserve live, replay, and mock modes, normalize data
before it reaches services, use the shared cache abstraction, and degrade to an
unavailable neutral value rather than inventing data.

## Bullpen Decision

The selected source is the official MLB Stats API:

```text
/api/v1/stats
  ?stats=season
  &group=pitching
  &sportIds=1
  &season={season}
  &gameType=R
  &position=RP
  &playerPool=ALL
  &limit=1000

/api/v1/stats
  ?stats=byDateRange
  &group=pitching
  &sportIds=1
  &season={season}
  &gameType=R
  &position=RP
  &playerPool=ALL
  &startDate={threeDaysAgo}
  &endDate={yesterday}
  &limit=1000
```

These two aggregate responses cover all MLB teams. TrueLine sums component
counts by team before calculating ERA, WHIP, and strikeout rate.

## Lineup Decision

The selected source is the official MLB Stats API. The current-day schedule
with `hydrate=lineups` supplies submitted batting orders, while the active
roster endpoint supplies handedness, positions, and season hitting statistics.

Before lineup submission, TrueLine projects the latest official lineup from the
previous seven days at reduced confidence. See
[LINEUP_MODEL.md](LINEUP_MODEL.md) for the source audit, cache policy,
normalization rules, and limitations.
