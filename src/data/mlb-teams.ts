import type { MlbDivision, MlbLeague, Team } from "../models/mlb.ts";

/**
 * Static identity catalog for all 30 MLB franchises - team id, division,
 * league, and home venue id rarely change within a season, so this is
 * safe reference data rather than something requiring a live fetch.
 * Enrichment (offense/pitching/bullpen ratings, lineup, record) is
 * layered on top via TeamStrengthService, not stored here.
 */
export interface MlbTeamCatalogEntry {
  abbreviation: string;
  city: string;
  division: MlbDivision;
  league: MlbLeague;
  mlbTeamId: number;
  name: string;
  venueId: number;
  venueName: string;
}

export const mlbTeamCatalog: MlbTeamCatalogEntry[] = [
  { abbreviation: "LAA", city: "Los Angeles", division: "West", league: "AL", mlbTeamId: 108, name: "Angels", venueId: 1, venueName: "Angel Stadium" },
  { abbreviation: "AZ", city: "Arizona", division: "West", league: "NL", mlbTeamId: 109, name: "Diamondbacks", venueId: 15, venueName: "Chase Field" },
  { abbreviation: "BAL", city: "Baltimore", division: "East", league: "AL", mlbTeamId: 110, name: "Orioles", venueId: 2, venueName: "Oriole Park at Camden Yards" },
  { abbreviation: "BOS", city: "Boston", division: "East", league: "AL", mlbTeamId: 111, name: "Red Sox", venueId: 3, venueName: "Fenway Park" },
  { abbreviation: "CHC", city: "Chicago", division: "Central", league: "NL", mlbTeamId: 112, name: "Cubs", venueId: 17, venueName: "Wrigley Field" },
  { abbreviation: "CIN", city: "Cincinnati", division: "Central", league: "NL", mlbTeamId: 113, name: "Reds", venueId: 2602, venueName: "Great American Ball Park" },
  { abbreviation: "CLE", city: "Cleveland", division: "Central", league: "AL", mlbTeamId: 114, name: "Guardians", venueId: 5, venueName: "Progressive Field" },
  { abbreviation: "COL", city: "Colorado", division: "West", league: "NL", mlbTeamId: 115, name: "Rockies", venueId: 19, venueName: "Coors Field" },
  { abbreviation: "DET", city: "Detroit", division: "Central", league: "AL", mlbTeamId: 116, name: "Tigers", venueId: 2394, venueName: "Comerica Park" },
  { abbreviation: "HOU", city: "Houston", division: "West", league: "AL", mlbTeamId: 117, name: "Astros", venueId: 2392, venueName: "Daikin Park" },
  { abbreviation: "KC", city: "Kansas City", division: "Central", league: "AL", mlbTeamId: 118, name: "Royals", venueId: 7, venueName: "Kauffman Stadium" },
  { abbreviation: "LAD", city: "Los Angeles", division: "West", league: "NL", mlbTeamId: 119, name: "Dodgers", venueId: 22, venueName: "Dodger Stadium" },
  { abbreviation: "WSH", city: "Washington", division: "East", league: "NL", mlbTeamId: 120, name: "Nationals", venueId: 3309, venueName: "Nationals Park" },
  { abbreviation: "NYM", city: "New York", division: "East", league: "NL", mlbTeamId: 121, name: "Mets", venueId: 3289, venueName: "Citi Field" },
  { abbreviation: "OAK", city: "Athletics", division: "West", league: "AL", mlbTeamId: 133, name: "Athletics", venueId: 2529, venueName: "Sutter Health Park" },
  { abbreviation: "PIT", city: "Pittsburgh", division: "Central", league: "NL", mlbTeamId: 134, name: "Pirates", venueId: 31, venueName: "PNC Park" },
  { abbreviation: "SD", city: "San Diego", division: "West", league: "NL", mlbTeamId: 135, name: "Padres", venueId: 2680, venueName: "Petco Park" },
  { abbreviation: "SEA", city: "Seattle", division: "West", league: "AL", mlbTeamId: 136, name: "Mariners", venueId: 680, venueName: "T-Mobile Park" },
  { abbreviation: "SF", city: "San Francisco", division: "West", league: "NL", mlbTeamId: 137, name: "Giants", venueId: 2395, venueName: "Oracle Park" },
  { abbreviation: "STL", city: "St. Louis", division: "Central", league: "NL", mlbTeamId: 138, name: "Cardinals", venueId: 2889, venueName: "Busch Stadium" },
  { abbreviation: "TB", city: "Tampa Bay", division: "East", league: "AL", mlbTeamId: 139, name: "Rays", venueId: 12, venueName: "Tropicana Field" },
  { abbreviation: "TEX", city: "Texas", division: "West", league: "AL", mlbTeamId: 140, name: "Rangers", venueId: 5325, venueName: "Globe Life Field" },
  { abbreviation: "TOR", city: "Toronto", division: "East", league: "AL", mlbTeamId: 141, name: "Blue Jays", venueId: 14, venueName: "Rogers Centre" },
  { abbreviation: "MIN", city: "Minnesota", division: "Central", league: "AL", mlbTeamId: 142, name: "Twins", venueId: 3312, venueName: "Target Field" },
  { abbreviation: "PHI", city: "Philadelphia", division: "East", league: "NL", mlbTeamId: 143, name: "Phillies", venueId: 2681, venueName: "Citizens Bank Park" },
  { abbreviation: "ATL", city: "Atlanta", division: "East", league: "NL", mlbTeamId: 144, name: "Braves", venueId: 4705, venueName: "Truist Park" },
  { abbreviation: "CWS", city: "Chicago", division: "Central", league: "AL", mlbTeamId: 145, name: "White Sox", venueId: 4, venueName: "Rate Field" },
  { abbreviation: "MIA", city: "Miami", division: "East", league: "NL", mlbTeamId: 146, name: "Marlins", venueId: 4169, venueName: "loanDepot park" },
  { abbreviation: "NYY", city: "New York", division: "East", league: "AL", mlbTeamId: 147, name: "Yankees", venueId: 3313, venueName: "Yankee Stadium" },
  { abbreviation: "MIL", city: "Milwaukee", division: "Central", league: "NL", mlbTeamId: 158, name: "Brewers", venueId: 32, venueName: "American Family Field" },
];

export function buildTeamFromCatalog(entry: MlbTeamCatalogEntry): Team {
  return {
    abbreviation: entry.abbreviation,
    city: entry.city,
    division: entry.division,
    externalIds: { mlb: entry.mlbTeamId },
    id: `mlb-team-${entry.mlbTeamId}`,
    league: entry.league,
    name: entry.name,
  };
}
