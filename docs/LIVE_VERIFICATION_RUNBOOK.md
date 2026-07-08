# Live Verification Runbook (first unrestricted-network session)

Every prior session ran in a sandbox that blocks `statsapi.mlb.com`,
`baseballsavant.mlb.com`, `open-meteo.com`, and `api.oddspipe.com` — so live
mode has never actually been exercised end to end. This is the ordered
checklist for the first run on a machine with real internet. Work top to
bottom; each step builds on the last.

## 1. Setup (5 minutes)

```
git pull origin claude/trueline-development
npm install
```

Create/verify `.env.local`:

- **Delete or blank any `*_MODE=mock` lines** (blank falls through to the
  default, which is live for every data domain). The old `.env.example`
  pinned everything to mock — if your `.env.local` was copied from it before
  2026-07-08, this is why you only ever saw mock data.
- `ODDSPIPE_API_KEY=<real key>` — first-ever validity check of this key.
- Optional but recommended: `DATABASE_URL` (any Postgres) so live
  predictions/odds snapshots get durably recorded; run
  `npx drizzle-kit migrate` once after setting it.
- Optional: `ADMIN_PASSWORD` + `AUTH_SECRET` if you want the /admin pages.

## 2. First live smoke (2 minutes)

```
npm run dev
```

Open the home page. Expectation: header pill says **Source live**, no yellow
"Live data fallback" banner, and the Lock Zone shows real games/pitchers for
today. If the banner appears, its message names the exact failing provider —
capture it verbatim; that is the diagnosis.

Note: a prior bug where one live injury crashed the whole slate into mock
was fixed 2026-07-08 (MASTER_CHECKLIST Section 8u). If you still see mock
with the banner, the cause is something new — read the banner.

## 3. Record real responses as replay fixtures (10 minutes)

This is the highest-value step: recorded fixtures let every future session —
including network-restricted ones — run against **real data** in replay mode.

Add to `.env.local`, then restart `npm run dev`:

```
ODDS_RECORD=true
WEATHER_RECORD=true
BALLPARK_RECORD=true
BULLPEN_RECORD=true
LINEUP_RECORD=true
PITCHER_RECORD=true
TEAM_STRENGTH_RECORD=true
RECENT_FORM_RECORD=true
PLAYER_INTELLIGENCE_RECORD=true
MATCHUP_RECORD=true
```

Visit each page once so every provider fires: home, /best-bets,
/pitching/strikeouts, /hitting/hits, /hitting/total-bases,
/hitting/home-runs, /betting/moneyline, /betting/run-line,
/betting/team-totals, /betting/game-totals, /matchups/zone-intelligence,
/matchups/pitch-intelligence, /research/teams, /research/ballparks.

Then check `replay/` — each domain dir should have new JSON files. Commit
them (they're fixtures, not secrets — but skim the odds files once to
confirm OddsPipe doesn't echo your API key into response bodies before
committing). Afterwards, turn the `*_RECORD` flags back off.

## 4. Known network-unverified items to confirm (from MASTER_CHECKLIST)

In priority order — each has a checklist section with full context:

1. **OddsPipe key + player-prop market keys** (Section 8s): does the real
   API accept the key, and do its player-prop market keys match
   `playerPropMarketKeys` in `src/providers/odds/normalize-oddspipe.ts`
   (`player_strikeouts`, `batter_hits`, ...)? If the names differ, that map
   is the one place to fix. Check whether prop categories on /best-bets
   show sportsbook lines with `movement: "Live"`.
2. **Injuries parser** (Section 8f): real MLB transactions response shape —
   home page should show real IL entries under Risk Flags/injuries rather
   than erroring (degrades to empty list on failure, so "no injuries shown"
   + an `injuries-service` error log means the parser needs adjusting).
3. **Game-results parser** (Section 8e): not wired to any trigger; verify
   manually with a one-off script calling `ingestGameResults()` for
   yesterday's date and checking the `game_results` table.
4. **Statcast/matchup live fetch** (Zone/Pitch Intelligence): loads real
   pitch arsenals for today's probable pitchers instead of the neutral
   50/100 empty state.
5. **Team strength / ballpark live ratings**: /research/teams and
   /research/ballparks should show real ratings instead of "-".

## 5. Report back

Whatever the outcome, paste into the session: the home page source pill
state, any fallback banner text, one screenshot of the Lock Zone with real
data, and `ls -R replay/` after step 3. That's enough to fix anything that
didn't work and to lock in real-data replay fixtures for all future work.
