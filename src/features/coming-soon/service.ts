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
} satisfies Record<string, ComingSoonViewModel>;

export function getComingSoonPage(key: keyof typeof comingSoonPages) {
  return comingSoonPages[key];
}
