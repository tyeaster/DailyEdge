export interface ComingSoonCard {
  description: string;
  label: string;
  value: string;
}

export interface ComingSoonViewModel {
  cards: ComingSoonCard[];
  eyebrow: string;
  summary: string;
  title: string;
}

const comingSoonPages = {
  ballparks: {
    cards: [
      {
        description: "Run, power, speed, and pitcher-friendly park ratings.",
        label: "Primary use",
        value: "Park factors",
      },
      {
        description: "Weather, roof state, altitude, and historical dimensions.",
        label: "Inputs",
        value: "Environment",
      },
      {
        description: "Moneyline, totals, home runs, and total-base research.",
        label: "Feeds",
        value: "Model context",
      },
    ],
    eyebrow: "Research",
    summary:
      "Ballpark research will centralize park-factor intelligence for game, team, and player prop workflows.",
    title: "Ballparks",
  },
  "game-total": {
    cards: [
      {
        description: "Projected combined runs compared against the market total.",
        label: "Primary market",
        value: "Game Total",
      },
      {
        description: "Weather, ballpark, starting pitching, bullpen, and lineup quality.",
        label: "Core inputs",
        value: "Run environment",
      },
      {
        description: "Over, lean over, pass, lean under, and under.",
        label: "Output",
        value: "Total lean",
      },
    ],
    eyebrow: "Team Betting",
    summary:
      "Game Total Lab will evaluate full-game run environments and compare TrueLine projections against sportsbook totals.",
    title: "Game Total Lab",
  },
  "home-runs": {
    cards: [
      {
        description: "Power, contact quality, park, weather, and pitcher arsenal context.",
        label: "Primary prop",
        value: "Home Runs",
      },
      {
        description: "Home run probability, fair odds, edge, and confidence.",
        label: "Output",
        value: "HR value",
      },
      {
        description: "Matchup Intelligence will drive pitch-type and zone advantages.",
        label: "Dependency",
        value: "Pitch match",
      },
    ],
    eyebrow: "Hitting",
    summary:
      "Home Run Lab will evaluate power props using batter intelligence, pitch matchup context, weather, and ballpark factors.",
    title: "Home Run Lab",
  },
  moneyline: {
    cards: [
      {
        description: "Win probability, fair moneyline, edge, EV, and confidence.",
        label: "Primary market",
        value: "Moneyline",
      },
      {
        description: "Pitchers, team strength, bullpen, lineups, weather, park, and market odds.",
        label: "Core inputs",
        value: "Game model",
      },
      {
        description: "Pass, lean, play, strong play, or best bet.",
        label: "Output",
        value: "Recommendation",
      },
    ],
    eyebrow: "Team Betting",
    summary:
      "Moneyline Lab will isolate win-probability edges and show how TrueLine differs from the sportsbook market.",
    title: "Moneyline Lab",
  },
  "pitch-intelligence": {
    cards: [
      {
        description: "Pitch usage, velocity, movement, whiff, put-away, strike, and zone rates.",
        label: "Primary view",
        value: "Pitch arsenal",
      },
      {
        description: "Pitch-type compatibility between a pitcher arsenal and hitter profile.",
        label: "Core score",
        value: "Pitch Match",
      },
      {
        description: "Strikeout, hits, total bases, home runs, and matchup research.",
        label: "Feeds",
        value: "Player labs",
      },
    ],
    eyebrow: "Matchups",
    summary:
      "Pitch Intelligence will expose pitch-level matchup diagnostics from the existing Matchup Intelligence engine.",
    title: "Pitch Intelligence",
  },
  players: {
    cards: [
      {
        description: "Pitchers and hitters with season, recent form, consistency, and trend data.",
        label: "Primary use",
        value: "Player index",
      },
      {
        description: "Strikeout Lab, Hits Lab, Total Bases Lab, and Matchup Intelligence.",
        label: "Links to",
        value: "Research pages",
      },
      {
        description: "Search, filter, and compare players across markets.",
        label: "Workflow",
        value: "Discovery",
      },
    ],
    eyebrow: "Research",
    summary:
      "Player Research will become the central player index for navigating every player-level betting workflow.",
    title: "Players",
  },
  teams: {
    cards: [
      {
        description: "Offense, pitching, bullpen, recent form, lineups, and injuries.",
        label: "Primary use",
        value: "Team profiles",
      },
      {
        description: "Moneyline, team totals, game totals, and matchup context.",
        label: "Feeds",
        value: "Team betting",
      },
      {
        description: "Season strength, recent form, and market disagreement.",
        label: "Workflow",
        value: "Comparison",
      },
    ],
    eyebrow: "Research",
    summary:
      "Team Research will organize team-level context for market research and model diagnostics.",
    title: "Teams",
  },
  "team-total": {
    cards: [
      {
        description: "Projected team runs compared against sportsbook team totals.",
        label: "Primary market",
        value: "Team Total",
      },
      {
        description: "Offense, opposing pitcher, bullpen, lineup, weather, and ballpark.",
        label: "Core inputs",
        value: "Run context",
      },
      {
        description: "Over, lean over, pass, lean under, and under.",
        label: "Output",
        value: "Total lean",
      },
    ],
    eyebrow: "Team Betting",
    summary:
      "Team Total Lab will focus on run-scoring edges at the team level.",
    title: "Team Total Lab",
  },
  "zone-intelligence": {
    cards: [
      {
        description: "Pitcher location tendencies compared with hitter damage zones.",
        label: "Primary score",
        value: "Zone Match",
      },
      {
        description: "Overlay-ready hot zones, cold zones, and normalized location grids.",
        label: "Display",
        value: "Zone maps",
      },
      {
        description: "Strikeout, hits, total bases, and home run research.",
        label: "Feeds",
        value: "Matchup labs",
      },
    ],
    eyebrow: "Matchups",
    summary:
      "Zone Intelligence will expose location-level advantages from the existing Matchup Intelligence engine.",
    title: "Zone Intelligence",
  },
} satisfies Record<string, ComingSoonViewModel>;

export function getComingSoonPage(key: keyof typeof comingSoonPages) {
  return comingSoonPages[key];
}
