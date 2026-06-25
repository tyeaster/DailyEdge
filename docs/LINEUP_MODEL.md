# TrueLine Confirmed Lineup Model

The confirmed lineup model improves pregame input quality without changing the
Prediction Engine interface. It normalizes official MLB lineup and season
hitting data into a provider-independent `LineupProfile`.

## Source Audit

| Option | Availability | Decision |
| --- | --- | --- |
| Official MLB Stats API | The schedule endpoint with `hydrate=lineups` exposes submitted batting orders. Active-roster hydration supplies handedness, position, and season hitting statistics. | Selected. It is official, free, and already consistent with the schedule provider. |
| Free alternatives | ESPN and public baseball sites may display lineups, but they do not provide a supported, stable contract for this application. | Not selected because unofficial response shapes and scraping increase operational risk. |
| Paid alternatives | SportsDataIO and Sportradar provide lineups and broader player data under commercial terms. | Future provider options behind the same interface. |
| Scraping | MLB game pages can be parsed when necessary. | Not selected while official structured data is available. |

The live provider uses:

```text
/api/v1/schedule
  ?sportId=1
  &startDate={date}
  &endDate={date}
  &hydrate=lineups

/api/v1/teams/{teamId}/roster
  ?rosterType=active
  &hydrate=person(stats(group=[hitting],type=[season],season={season}))
```

## Provider Modes

- `live`: fetches official MLB schedule and roster payloads.
- `replay`: reads recorded raw payloads and returns the recorded normalized
  lineup without network access.
- `mock`: returns a supplied `LineupProfile` using the same provider contract.

Set `LINEUP_RECORD=true` in live mode to record replay fixtures. Replay files
contain the request, raw current schedule, raw recent schedule, raw roster, and
normalized result.

## Confirmation And Fallback

A lineup is `confirmed` when the current game contains at least nine submitted
players for the team.

Before confirmation, the provider searches the previous seven days for the
team's latest official completed batting order and marks it `projected`. This is
a conservative fallback, not a forecast of manager decisions.

If neither source has nine players, the provider returns an `unavailable`
neutral profile. Prediction generation continues.

Players with no official season sample remain neutral in contact, power, and
player-quality calculations. Unknown batting handedness is recorded as unknown
and does not default to a right-handed hitter.

Lineup confidence:

| Status | Confidence |
| --- | ---: |
| Confirmed | 100 |
| Projected from latest official lineup | 65 |
| Unavailable | 0 |

## Cache Strategy

- Confirmed/current-game schedule: 60 seconds.
- Projected/recent schedule: 5 minutes.
- Active roster and season hitting statistics: 1 hour.
- Normalized service result: 60 seconds for confirmed lineups and 5 minutes
  for projected or unavailable lineups.

The live provider shares slate-level schedule requests across teams. Roster
responses are cached by team and season.

## Normalized Model

Each batting-order entry includes:

- Batting order from 1 through 9.
- Player name and MLB identifier.
- Position.
- Batting handedness.
- Starting status.
- Future-ready pinch-hitter status.
- Season batting average, on-base percentage, slugging percentage, OPS, home
  runs, plate appearances, and strikeout rate when available.
- wRC+ as nullable because the official MLB endpoint does not supply it.

The team profile includes:

- Confirmed, projected, or unavailable status.
- Lineup confidence.
- Missing baseline starters.
- Missing star players, where stars are the top three qualified active-roster
  hitters under the transparent V1 player-quality calculation.
- Replacement quality.
- Left-, right-, and switch-hitter balance.
- Average OPS and strikeout rate.
- Average wRC+ when a future provider supplies it.
- Contact, power, and overall lineup ratings from 0 to 100.

## Prediction Integration

Lineup strength is a configurable 10% model factor. The engine compares the two
normalized overall lineup ratings using the same team-rating comparison used by
other team inputs.

Confirmed and projected lineups can affect win probability. Confirmation status
affects Data Quality separately:

- Confirmed inputs receive full lineup quality credit.
- Projected inputs receive 65% lineup quality credit.
- Unavailable inputs receive no lineup quality credit and remain neutral.

Confidence remains capped by total Data Quality. Explanations identify a
stronger confirmed lineup or a projected lineup edge only when the difference
is meaningful and both profiles are available.

## Limitations

- The projected fallback is the latest official lineup, not a dedicated
  projection model.
- Official MLB season data does not provide wRC+.
- The V1 star and replacement ratings are deterministic normalization rules,
  not historically trained coefficients.
- Platoon matchup quality against the probable starter is not yet modeled.
- Late scratches depend on how quickly MLB updates the submitted lineup.
