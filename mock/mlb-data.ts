import type {
  BetRecommendation,
  Game,
  Injury,
  Pitcher,
  Player,
  PlayerProp,
  PlayerPropCategory,
  Prediction,
  Team,
  Weather,
} from "@/src/models/mlb";
import type { DashboardNavItem, KpiMetric, SlateMeta } from "@/src/types/mlb-dashboard";

export const slateMeta: SlateMeta = {
  averageConfidence: "74%",
  currentDate: "Monday, June 22",
  firstPitchCountdown: "2h 18m",
  gamesToday: 6,
  lastUpdated: "11:42 AM ET",
};

export const teams: Team[] = [
  { abbreviation: "LAD", city: "Los Angeles", division: "West", id: "team-lad", league: "NL", name: "Dodgers" },
  { abbreviation: "ATL", city: "Atlanta", division: "East", id: "team-atl", league: "NL", name: "Braves" },
  { abbreviation: "NYY", city: "New York", division: "East", id: "team-nyy", league: "AL", name: "Yankees" },
  { abbreviation: "BOS", city: "Boston", division: "East", id: "team-bos", league: "AL", name: "Red Sox" },
  { abbreviation: "PHI", city: "Philadelphia", division: "East", id: "team-phi", league: "NL", name: "Phillies" },
  { abbreviation: "NYM", city: "New York", division: "East", id: "team-nym", league: "NL", name: "Mets" },
  { abbreviation: "TEX", city: "Texas", division: "West", id: "team-tex", league: "AL", name: "Rangers" },
  { abbreviation: "HOU", city: "Houston", division: "West", id: "team-hou", league: "AL", name: "Astros" },
  { abbreviation: "SEA", city: "Seattle", division: "West", id: "team-sea", league: "AL", name: "Mariners" },
  { abbreviation: "LAA", city: "Los Angeles", division: "West", id: "team-laa", league: "AL", name: "Angels" },
  { abbreviation: "SD", city: "San Diego", division: "West", id: "team-sd", league: "NL", name: "Padres" },
  { abbreviation: "SF", city: "San Francisco", division: "West", id: "team-sf", league: "NL", name: "Giants" },
];

export const players: Player[] = [
  { bats: "L", fullName: "Freddie Freeman", id: "player-freeman", position: "1B", teamId: "team-lad", throws: "R" },
  { bats: "R", fullName: "Mookie Betts", id: "player-betts", position: "2B", teamId: "team-lad", throws: "R" },
  { bats: "L", fullName: "Shohei Ohtani", id: "player-ohtani", position: "DH", teamId: "team-lad", throws: "R" },
  { bats: "R", fullName: "Austin Riley", id: "player-riley", position: "3B", teamId: "team-atl", throws: "R" },
  { bats: "S", fullName: "Ozzie Albies", id: "player-albies", position: "2B", teamId: "team-atl", throws: "R" },
  { bats: "R", fullName: "Aaron Judge", id: "player-judge", position: "RF", teamId: "team-nyy", throws: "R" },
  { bats: "L", fullName: "Juan Soto", id: "player-soto", position: "LF", teamId: "team-nyy", throws: "L" },
  { bats: "L", fullName: "Rafael Devers", id: "player-devers", position: "3B", teamId: "team-bos", throws: "R" },
  { bats: "R", fullName: "Julio Rodriguez", id: "player-rodriguez", position: "CF", teamId: "team-sea", throws: "R" },
  { bats: "L", fullName: "Corey Seager", id: "player-seager", position: "SS", teamId: "team-tex", throws: "R" },
  { bats: "R", fullName: "Adolis Garcia", id: "player-garcia", position: "RF", teamId: "team-tex", throws: "R" },
  { bats: "R", fullName: "Jose Altuve", id: "player-altuve", position: "2B", teamId: "team-hou", throws: "R" },
  { bats: "R", fullName: "Pete Alonso", id: "player-alonso", position: "1B", teamId: "team-nym", throws: "R" },
  { bats: "L", fullName: "Bryce Harper", id: "player-harper", position: "1B", teamId: "team-phi", throws: "R" },
];

export const pitchers: Pitcher[] = [
  { arsenal: ["Four-seam", "Splitter", "Curve"], bats: "R", era: 3.08, fullName: "Yoshinobu Yamamoto", handedness: "R", id: "pitcher-yamamoto", inningsPitched: 82.2, position: "SP", strikeoutRate: 27.6, teamId: "team-lad", throws: "R", whip: 1.04 },
  { arsenal: ["Four-seam", "Slider", "Changeup"], bats: "R", era: 3.21, fullName: "Spencer Strider", handedness: "R", id: "pitcher-strider", inningsPitched: 76.1, position: "SP", strikeoutRate: 35.2, teamId: "team-atl", throws: "R", whip: 1.09 },
  { arsenal: ["Four-seam", "Slider", "Knuckle curve"], bats: "R", era: 3.34, fullName: "Gerrit Cole", handedness: "R", id: "pitcher-cole", inningsPitched: 79.0, position: "SP", strikeoutRate: 28.4, teamId: "team-nyy", throws: "R", whip: 1.11 },
  { arsenal: ["Sinker", "Changeup", "Slider"], bats: "R", era: 4.12, fullName: "Brayan Bello", handedness: "R", id: "pitcher-bello", inningsPitched: 70.2, position: "SP", strikeoutRate: 21.7, teamId: "team-bos", throws: "R", whip: 1.32 },
  { arsenal: ["Four-seam", "Sweeper", "Sinker"], bats: "R", era: 2.72, fullName: "Zack Wheeler", handedness: "R", id: "pitcher-wheeler", inningsPitched: 91.1, position: "SP", strikeoutRate: 30.1, teamId: "team-phi", throws: "R", whip: 0.98 },
  { arsenal: ["Ghost fork", "Four-seam", "Cutter"], bats: "R", era: 3.49, fullName: "Kodai Senga", handedness: "R", id: "pitcher-senga", inningsPitched: 64.0, position: "SP", strikeoutRate: 27.3, teamId: "team-nym", throws: "R", whip: 1.22 },
  { arsenal: ["Splitter", "Four-seam", "Curve"], bats: "R", era: 3.55, fullName: "Nathan Eovaldi", handedness: "R", id: "pitcher-eovaldi", inningsPitched: 74.1, position: "SP", strikeoutRate: 24.5, teamId: "team-tex", throws: "R", whip: 1.18 },
  { arsenal: ["Sinker", "Curve", "Changeup"], bats: "L", era: 3.38, fullName: "Framber Valdez", handedness: "L", id: "pitcher-valdez", inningsPitched: 86.0, position: "SP", strikeoutRate: 23.9, teamId: "team-hou", throws: "L", whip: 1.20 },
  { arsenal: ["Four-seam", "Slider", "Splitter"], bats: "R", era: 3.02, fullName: "George Kirby", handedness: "R", id: "pitcher-kirby", inningsPitched: 88.2, position: "SP", strikeoutRate: 26.8, teamId: "team-sea", throws: "R", whip: 1.01 },
  { arsenal: ["Slider", "Four-seam", "Curve"], bats: "L", era: 4.35, fullName: "Reid Detmers", handedness: "L", id: "pitcher-detmers", inningsPitched: 69.1, position: "SP", strikeoutRate: 25.0, teamId: "team-laa", throws: "L", whip: 1.36 },
  { arsenal: ["Slider", "Four-seam", "Curve"], bats: "R", era: 3.91, fullName: "Joe Musgrove", handedness: "R", id: "pitcher-musgrove", inningsPitched: 68.2, position: "SP", strikeoutRate: 23.5, teamId: "team-sd", throws: "R", whip: 1.24 },
  { arsenal: ["Sinker", "Changeup", "Sweeper"], bats: "R", era: 3.10, fullName: "Logan Webb", handedness: "R", id: "pitcher-webb", inningsPitched: 93.0, position: "SP", strikeoutRate: 20.9, teamId: "team-sf", throws: "R", whip: 1.12 },
  { arsenal: ["Four-seam", "Slider", "Changeup"], bats: "R", era: 3.72, fullName: "Logan Gilbert", handedness: "R", id: "pitcher-gilbert", inningsPitched: 87.1, position: "SP", strikeoutRate: 25.7, teamId: "team-sea", throws: "R", whip: 1.08 },
  { arsenal: ["Four-seam", "Slider", "Changeup"], bats: "R", era: 0, fullName: "Jacob deGrom", handedness: "R", id: "pitcher-degrom", inningsPitched: 0, position: "SP", strikeoutRate: 0, teamId: "team-tex", throws: "R", whip: 0 },
];

export const weatherReports: Weather[] = [
  { gameId: "game-nyy-bos", hitterFriendlyRating: 88, humidityPercent: 58, id: "weather-fenway", pitcherFriendlyRating: 32, rainChancePercent: 18, stadium: "Fenway Park", summary: "78F, wind out to LF 12 mph", temperatureF: 78, windDirection: "Out to LF", windMph: 12 },
  { gameId: "game-lad-atl", hitterFriendlyRating: 76, humidityPercent: 64, id: "weather-truist", pitcherFriendlyRating: 41, rainChancePercent: 15, stadium: "Truist Park", summary: "82F, wind out to RF 7 mph", temperatureF: 82, windDirection: "Out to RF", windMph: 7 },
  { gameId: "game-phi-nym", hitterFriendlyRating: 36, humidityPercent: 51, id: "weather-citi", pitcherFriendlyRating: 82, rainChancePercent: 4, stadium: "Citi Field", summary: "70F, wind in from CF 10 mph", temperatureF: 70, windDirection: "In from CF", windMph: 10 },
  { gameId: "game-tex-hou", hitterFriendlyRating: 55, humidityPercent: null, id: "weather-minute-maid", pitcherFriendlyRating: 56, rainChancePercent: 0, stadium: "Minute Maid Park", summary: "Roof likely closed, neutral air", temperatureF: 74, windDirection: "Roof likely closed", windMph: 0 },
  { gameId: "game-sea-laa", hitterFriendlyRating: 42, humidityPercent: 67, id: "weather-angel", pitcherFriendlyRating: 78, rainChancePercent: 2, stadium: "Angel Stadium", summary: "68F, marine layer settling in", temperatureF: 68, windDirection: "In from RF", windMph: 6 },
  { gameId: "game-sd-sf", hitterFriendlyRating: 30, humidityPercent: 71, id: "weather-oracle", pitcherFriendlyRating: 86, rainChancePercent: 6, stadium: "Oracle Park", summary: "61F, wind across 14 mph", temperatureF: 61, windDirection: "Across from RF", windMph: 14 },
];

export const games: Game[] = [
  {
    awayPitcherId: "pitcher-yamamoto",
    awayTeamId: "team-lad",
    confidence: { label: "High", value: 78 },
    detail: "Dodgers grade stronger in bullpen availability and late-game contact quality.",
    homePitcherId: "pitcher-strider",
    homeTeamId: "team-atl",
    id: "game-lad-atl",
    odds: {
      moneyline: { displayLine: "LAD -118 / ATL +100", id: "odds-lad-atl-ml", line: -118, market: "moneyline", movement: "+9 cents", openingLine: -127, price: -118, sportsbook: "Consensus" },
      spread: { displayLine: "LAD -1.5 (+142)", id: "odds-lad-atl-spread", line: -1.5, market: "spread", movement: "+4 cents", openingLine: -1.5, price: 142, sportsbook: "Consensus" },
      total: { displayLine: "8.0", id: "odds-lad-atl-total", line: 8, market: "total", movement: "Flat", openingLine: 8, price: -110, sportsbook: "Consensus" },
    },
    scheduledAt: "2026-06-22T19:20:00-04:00",
    status: "confirmed",
    venue: "Truist Park",
    weatherId: "weather-truist",
  },
  {
    awayPitcherId: "pitcher-cole",
    awayTeamId: "team-nyy",
    confidence: { label: "High", value: 73 },
    detail: "Run environment is elevated, but New York owns the cleaner relief path.",
    homePitcherId: "pitcher-bello",
    homeTeamId: "team-bos",
    id: "game-nyy-bos",
    odds: {
      moneyline: { displayLine: "NYY -104 / BOS -112", id: "odds-nyy-bos-ml", line: -104, market: "moneyline", movement: "+3 cents", openingLine: -107, price: -104, sportsbook: "Consensus" },
      spread: { displayLine: "NYY -1.5 (+158)", id: "odds-nyy-bos-spread", line: -1.5, market: "spread", movement: "-2 cents", openingLine: -1.5, price: 158, sportsbook: "Consensus" },
      total: { displayLine: "8.5", id: "odds-nyy-bos-total", line: 8.5, market: "total", movement: "+0.5 runs", openingLine: 8, price: -110, sportsbook: "Consensus" },
    },
    scheduledAt: "2026-06-22T19:10:00-04:00",
    status: "weather-watch",
    venue: "Fenway Park",
    weatherId: "weather-fenway",
  },
  {
    awayPitcherId: "pitcher-wheeler",
    awayTeamId: "team-phi",
    confidence: { label: "High", value: 76 },
    detail: "Wheeler projects for the slate's best strikeout ceiling against an aggressive order.",
    homePitcherId: "pitcher-senga",
    homeTeamId: "team-nym",
    id: "game-phi-nym",
    odds: {
      moneyline: { displayLine: "PHI +102 / NYM -120", id: "odds-phi-nym-ml", line: 102, market: "moneyline", movement: "+5 cents", openingLine: 97, price: 102, sportsbook: "Consensus" },
      spread: { displayLine: "PHI +1.5 (-184)", id: "odds-phi-nym-spread", line: 1.5, market: "spread", movement: "Flat", openingLine: 1.5, price: -184, sportsbook: "Consensus" },
      total: { displayLine: "7.5", id: "odds-phi-nym-total", line: 7.5, market: "total", movement: "-0.5 runs", openingLine: 8, price: -112, sportsbook: "Consensus" },
    },
    scheduledAt: "2026-06-22T18:40:00-04:00",
    status: "confirmed",
    venue: "Citi Field",
    weatherId: "weather-citi",
  },
  {
    awayPitcherId: "pitcher-eovaldi",
    awayTeamId: "team-tex",
    confidence: { label: "High", value: 75 },
    detail: "Texas has the best team-total gap on the board if the roof stays closed.",
    homePitcherId: "pitcher-valdez",
    homeTeamId: "team-hou",
    id: "game-tex-hou",
    odds: {
      moneyline: { displayLine: "TEX +116 / HOU -136", id: "odds-tex-hou-ml", line: 116, market: "moneyline", movement: "+6 cents", openingLine: 110, price: 116, sportsbook: "Consensus" },
      spread: { displayLine: "TEX +1.5 (-170)", id: "odds-tex-hou-spread", line: 1.5, market: "spread", movement: "-5 cents", openingLine: 1.5, price: -170, sportsbook: "Consensus" },
      total: { displayLine: "9.0", id: "odds-tex-hou-total", line: 9, market: "total", movement: "+0.5 runs", openingLine: 8.5, price: -108, sportsbook: "Consensus" },
    },
    scheduledAt: "2026-06-22T20:10:00-04:00",
    status: "roof-watch",
    venue: "Minute Maid Park",
    weatherId: "weather-minute-maid",
  },
  {
    awayPitcherId: "pitcher-kirby",
    awayTeamId: "team-sea",
    confidence: { label: "High", value: 72 },
    detail: "Kirby gains value from a high chase-rate opponent and a pitcher-friendly setup.",
    homePitcherId: "pitcher-detmers",
    homeTeamId: "team-laa",
    id: "game-sea-laa",
    odds: {
      moneyline: { displayLine: "SEA -126 / LAA +108", id: "odds-sea-laa-ml", line: -126, market: "moneyline", movement: "-4 cents", openingLine: -122, price: -126, sportsbook: "Consensus" },
      spread: { displayLine: "SEA -1.5 (+132)", id: "odds-sea-laa-spread", line: -1.5, market: "spread", movement: "+8 cents", openingLine: -1.5, price: 132, sportsbook: "Consensus" },
      total: { displayLine: "8.0", id: "odds-sea-laa-total", line: 8, market: "total", movement: "Flat", openingLine: 8, price: -110, sportsbook: "Consensus" },
    },
    scheduledAt: "2026-06-22T21:38:00-04:00",
    status: "line-watch",
    venue: "Angel Stadium",
    weatherId: "weather-angel",
  },
  {
    awayPitcherId: "pitcher-musgrove",
    awayTeamId: "team-sd",
    confidence: { label: "Medium", value: 69 },
    detail: "Market is shading San Francisco too heavily for a low-total divisional game.",
    homePitcherId: "pitcher-webb",
    homeTeamId: "team-sf",
    id: "game-sd-sf",
    odds: {
      moneyline: { displayLine: "SD +136 / SF -162", id: "odds-sd-sf-ml", line: 136, market: "moneyline", movement: "+7 cents", openingLine: 129, price: 136, sportsbook: "Consensus" },
      spread: { displayLine: "SD +1.5 (-152)", id: "odds-sd-sf-spread", line: 1.5, market: "spread", movement: "Flat", openingLine: 1.5, price: -152, sportsbook: "Consensus" },
      total: { displayLine: "7.0", id: "odds-sd-sf-total", line: 7, market: "total", movement: "-0.5 runs", openingLine: 7.5, price: -115, sportsbook: "Consensus" },
    },
    scheduledAt: "2026-06-22T21:45:00-04:00",
    status: "confirmed",
    venue: "Oracle Park",
    weatherId: "weather-oracle",
  },
];

export const predictions: Prediction[] = [
  { confidence: { label: "Elite", value: 84 }, edge: { percentage: 7.1, rating: "S" }, gameId: "game-phi-nym", id: "pred-wheeler-k", market: "player-prop", playerId: "pitcher-wheeler", projection: "7.4 Ks", reasoning: "The Mets' projected lineup carries the highest chase gap on the slate." },
  { confidence: { label: "Elite", value: 80 }, edge: { percentage: 6.4, rating: "A" }, gameId: "game-lad-atl", id: "pred-lad-ml", market: "moneyline", projection: "-134", reasoning: "Los Angeles rates better in bullpen rest and late-inning matchup leverage.", teamId: "team-lad" },
  { confidence: { label: "High", value: 77 }, edge: { percentage: 5.6, rating: "A" }, gameId: "game-tex-hou", id: "pred-tex-tt", market: "team-total", projection: "5.3 runs", reasoning: "Texas has a strong platoon edge if Houston keeps the roof closed.", teamId: "team-tex" },
];

export const playerProps: PlayerProp[] = [
  { category: "Strikeouts", confidence: { label: "Elite", value: 84 }, edge: { percentage: 7.1, rating: "S" }, gameId: "game-phi-nym", id: "prop-wheeler-k", odds: { displayLine: "Over 6.5", id: "odds-wheeler-k", line: 6.5, market: "player-prop", movement: "+6 cents", price: 104, sportsbook: "DraftKings" }, playerId: "pitcher-wheeler", projection: "7.4 Ks", reasoning: "Elite swing-and-miss gap against the Mets' projected bottom half." },
  { category: "Strikeouts", confidence: { label: "High", value: 79 }, edge: { percentage: 5.8, rating: "A" }, gameId: "game-sea-laa", id: "prop-kirby-k", odds: { displayLine: "Over 5.5", id: "odds-kirby-k", line: 5.5, market: "player-prop", movement: "+4 cents", price: -112, sportsbook: "FanDuel" }, playerId: "pitcher-kirby", projection: "6.3 Ks", reasoning: "Angels lineup projects below average against command-first righties." },
  { category: "Hits", confidence: { label: "High", value: 74 }, edge: { percentage: 4.6, rating: "B" }, gameId: "game-lad-atl", id: "prop-freeman-hit", odds: { displayLine: "Over 0.5", id: "odds-freeman-hit", line: 0.5, market: "player-prop", movement: "Flat", price: -185, sportsbook: "BetMGM" }, playerId: "player-freeman", projection: "1.18 H", reasoning: "Stable contact profile against high-velocity four-seam usage." },
  { category: "Hits", confidence: { label: "High", value: 71 }, edge: { percentage: 3.9, rating: "B" }, gameId: "game-tex-hou", id: "prop-seager-hit", odds: { displayLine: "Over 0.5", id: "odds-seager-hit", line: 0.5, market: "player-prop", movement: "+2 cents", price: -170, sportsbook: "Caesars" }, playerId: "player-seager", projection: "1.09 H", reasoning: "Line-drive rate remains elevated versus sinker-heavy lefties." },
  { category: "Runs", confidence: { label: "High", value: 70 }, edge: { percentage: 4.1, rating: "B" }, gameId: "game-sea-laa", id: "prop-rodriguez-run", odds: { displayLine: "Over 0.5", id: "odds-rodriguez-run", line: 0.5, market: "player-prop", movement: "+3 cents", price: -102, sportsbook: "FanDuel" }, playerId: "player-rodriguez", projection: "0.76 R", reasoning: "Leadoff plate appearances add volume in Seattle's top stack." },
  { category: "Runs", confidence: { label: "Medium", value: 69 }, edge: { percentage: 3.7, rating: "B" }, gameId: "game-lad-atl", id: "prop-ohtani-run", odds: { displayLine: "Over 0.5", id: "odds-ohtani-run", line: 0.5, market: "player-prop", movement: "Flat", price: -118, sportsbook: "DraftKings" }, playerId: "player-ohtani", projection: "0.72 R", reasoning: "Dodgers' implied total keeps Ohtani's scoring path live." },
  { category: "RBI", confidence: { label: "High", value: 71 }, edge: { percentage: 4.4, rating: "B" }, gameId: "game-lad-atl", id: "prop-riley-rbi", odds: { displayLine: "Over 0.5", id: "odds-riley-rbi", line: 0.5, market: "player-prop", movement: "+5 cents", price: 125, sportsbook: "BetMGM" }, playerId: "player-riley", projection: "0.71 RBI", reasoning: "Premium lineup slot behind Atlanta's best on-base cluster." },
  { category: "RBI", confidence: { label: "Medium", value: 68 }, edge: { percentage: 3.6, rating: "B" }, gameId: "game-tex-hou", id: "prop-garcia-rbi", odds: { displayLine: "Over 0.5", id: "odds-garcia-rbi", line: 0.5, market: "player-prop", movement: "+4 cents", price: 132, sportsbook: "Caesars" }, playerId: "player-garcia", projection: "0.66 RBI", reasoning: "Garcia benefits from Texas' strongest team-total edge." },
  { category: "Home Runs", confidence: { label: "High", value: 72 }, edge: { percentage: 4.9, rating: "A" }, gameId: "game-nyy-bos", id: "prop-judge-hr", odds: { displayLine: "+285", id: "odds-judge-hr", line: 0.5, market: "player-prop", movement: "+18 cents", price: 285, sportsbook: "DraftKings" }, playerId: "player-judge", projection: "18.4%", reasoning: "Fenway wind lifts the best pull-side power profile in the slate." },
  { category: "Home Runs", confidence: { label: "Medium", value: 67 }, edge: { percentage: 3.3, rating: "C" }, gameId: "game-lad-atl", id: "prop-ohtani-hr", odds: { displayLine: "+360", id: "odds-ohtani-hr", line: 0.5, market: "player-prop", movement: "+9 cents", price: 360, sportsbook: "FanDuel" }, playerId: "player-ohtani", projection: "15.1%", reasoning: "Ohtani's barrel rate keeps him live despite a tougher pitcher matchup." },
  { category: "Total Bases", confidence: { label: "High", value: 76 }, edge: { percentage: 5.4, rating: "A" }, gameId: "game-lad-atl", id: "prop-betts-tb", odds: { displayLine: "Over 1.5", id: "odds-betts-tb", line: 1.5, market: "player-prop", movement: "+7 cents", price: -110, sportsbook: "DraftKings" }, playerId: "player-betts", projection: "2.2 TB", reasoning: "Betts grades highest in hard-contact probability against Atlanta." },
  { category: "Total Bases", confidence: { label: "High", value: 73 }, edge: { percentage: 4.2, rating: "B" }, gameId: "game-nyy-bos", id: "prop-soto-tb", odds: { displayLine: "Over 1.5", id: "odds-soto-tb", line: 1.5, market: "player-prop", movement: "+5 cents", price: 120, sportsbook: "BetMGM" }, playerId: "player-soto", projection: "2.0 TB", reasoning: "Soto's patience creates extra-base upside against Bello's mistakes." },
];

export const betRecommendations: BetRecommendation[] = [
  { confidence: { label: "Elite", value: 84 }, edge: { percentage: 7.1, rating: "S" }, gameId: "game-phi-nym", id: "bet-wheeler-k", odds: playerProps[0].odds, playerId: "pitcher-wheeler", prediction: predictions[0], rank: 1, recommendedUnits: 1.15, selection: "Over 6.5 strikeouts" },
  { confidence: { label: "Elite", value: 80 }, edge: { percentage: 6.4, rating: "A" }, gameId: "game-lad-atl", id: "bet-lad-ml", odds: games[0].odds.moneyline, prediction: predictions[1], rank: 2, recommendedUnits: 1.2, selection: "Moneyline", teamId: "team-lad" },
  { confidence: { label: "High", value: 77 }, edge: { percentage: 5.6, rating: "A" }, gameId: "game-tex-hou", id: "bet-tex-tt", odds: { displayLine: "Over 4.5", id: "odds-tex-tt", line: 4.5, market: "team-total", movement: "-4 cents", price: -105, sportsbook: "Consensus" }, prediction: predictions[2], rank: 3, recommendedUnits: 1, selection: "Over 4.5 team runs", teamId: "team-tex" },
  { confidence: { label: "High", value: 76 }, edge: { percentage: 5.4, rating: "A" }, gameId: "game-lad-atl", id: "bet-betts-tb", odds: playerProps[10].odds, playerId: "player-betts", prediction: { confidence: playerProps[10].confidence, edge: playerProps[10].edge, gameId: "game-lad-atl", id: "pred-betts-tb", market: "player-prop", playerId: "player-betts", projection: "2.2 TB", reasoning: playerProps[10].reasoning }, rank: 4, recommendedUnits: 0.9, selection: "Over 1.5 total bases" },
  { confidence: { label: "High", value: 72 }, edge: { percentage: 4.9, rating: "A" }, gameId: "game-nyy-bos", id: "bet-judge-hr", odds: playerProps[8].odds, playerId: "player-judge", prediction: { confidence: playerProps[8].confidence, edge: playerProps[8].edge, gameId: "game-nyy-bos", id: "pred-judge-hr", market: "player-prop", playerId: "player-judge", projection: "18.4%", reasoning: playerProps[8].reasoning }, rank: 5, recommendedUnits: 0.45, selection: "Home run" },
  { confidence: { label: "High", value: 72 }, edge: { percentage: 4.7, rating: "B" }, gameId: "game-sd-sf", id: "bet-gilbert-ha", odds: { displayLine: "Under 5.5", id: "odds-gilbert-ha", line: 5.5, market: "player-prop", movement: "-3 cents", price: -118, sportsbook: "DraftKings" }, playerId: "pitcher-gilbert", prediction: { confidence: { label: "High", value: 72 }, edge: { percentage: 4.7, rating: "B" }, gameId: "game-sd-sf", id: "pred-gilbert-ha", market: "player-prop", playerId: "pitcher-gilbert", projection: "4.7 H", reasoning: "San Francisco's contact model falls below market expectation in cold air." }, rank: 6, recommendedUnits: 0.7, selection: "Under 5.5 hits allowed" },
  { confidence: { label: "High", value: 71 }, edge: { percentage: 4.4, rating: "B" }, gameId: "game-lad-atl", id: "bet-riley-rbi", odds: playerProps[6].odds, playerId: "player-riley", prediction: { confidence: playerProps[6].confidence, edge: playerProps[6].edge, gameId: "game-lad-atl", id: "pred-riley-rbi", market: "player-prop", playerId: "player-riley", projection: "0.71 RBI", reasoning: playerProps[6].reasoning }, rank: 7, recommendedUnits: 0.65, selection: "Over 0.5 RBI" },
  { confidence: { label: "High", value: 70 }, edge: { percentage: 4.1, rating: "B" }, gameId: "game-sea-laa", id: "bet-rodriguez-run", odds: playerProps[4].odds, playerId: "player-rodriguez", prediction: { confidence: playerProps[4].confidence, edge: playerProps[4].edge, gameId: "game-sea-laa", id: "pred-rodriguez-run", market: "player-prop", playerId: "player-rodriguez", projection: "0.76 R", reasoning: playerProps[4].reasoning }, rank: 8, recommendedUnits: 0.55, selection: "Over 0.5 runs" },
  { confidence: { label: "Medium", value: 69 }, edge: { percentage: 3.8, rating: "B" }, gameId: "game-sd-sf", id: "bet-sd-ml", odds: games[5].odds.moneyline, prediction: { confidence: { label: "Medium", value: 69 }, edge: { percentage: 3.8, rating: "B" }, gameId: "game-sd-sf", id: "pred-sd-ml", market: "moneyline", projection: "+118", reasoning: "The model prices this as closer to a coin-flip than the market suggests.", teamId: "team-sd" }, rank: 9, recommendedUnits: 0.5, selection: "Moneyline", teamId: "team-sd" },
  { confidence: { label: "Medium", value: 68 }, edge: { percentage: 3.5, rating: "C" }, gameId: "game-sea-laa", id: "bet-kirby-er", odds: { displayLine: "Under 2.5", id: "odds-kirby-er", line: 2.5, market: "player-prop", movement: "+1 cent", price: -108, sportsbook: "FanDuel" }, playerId: "pitcher-kirby", prediction: { confidence: { label: "Medium", value: 68 }, edge: { percentage: 3.5, rating: "C" }, gameId: "game-sea-laa", id: "pred-kirby-er", market: "player-prop", playerId: "pitcher-kirby", projection: "2.1 ER", reasoning: "Kirby's command profile limits free passes against a thin Angels lineup." }, rank: 10, recommendedUnits: 0.45, selection: "Under 2.5 earned runs" },
];

export const injuries: Injury[] = [
  { expectedReturn: "Day-to-day", id: "injury-freeman", impactRating: 82, playerId: "player-freeman", status: "Questionable", teamId: "team-lad" },
  { expectedReturn: "Late June", id: "injury-albies", impactRating: 76, playerId: "player-albies", status: "10-day IL", teamId: "team-atl" },
  { expectedReturn: "Tonight", id: "injury-soto", impactRating: 68, playerId: "player-soto", status: "Probable", teamId: "team-nyy" },
  { expectedReturn: "Game-time decision", id: "injury-devers", impactRating: 73, playerId: "player-devers", status: "Questionable", teamId: "team-bos" },
  { expectedReturn: "Next series", id: "injury-altuve", impactRating: 63, playerId: "player-altuve", status: "Day-to-day", teamId: "team-hou" },
  { expectedReturn: "July", id: "injury-degrom", impactRating: 88, playerId: "pitcher-degrom", status: "15-day IL", teamId: "team-tex" },
  { expectedReturn: "Available", id: "injury-alonso", impactRating: 61, playerId: "player-alonso", status: "Probable", teamId: "team-nym" },
  { expectedReturn: "Late June", id: "injury-harper", impactRating: 79, playerId: "player-harper", status: "Questionable", teamId: "team-phi" },
];

export const dashboardNavItems: DashboardNavItem[] = [
  { active: true, href: "#daily-slate", icon: "⌂", label: "Slate", badge: String(games.length) },
  { href: "#games", icon: "◆", label: "Games", badge: String(games.length) },
  { href: "#best-bets", icon: "↗", label: "Best Bets", badge: String(betRecommendations.length) },
  { href: "#player-props", icon: "◎", label: "Props" },
  { href: "#weather", icon: "☁", label: "Weather", badge: "3" },
  { href: "#injuries", icon: "!", label: "Injuries" },
];

export const kpiMetrics: KpiMetric[] = [
  { label: "Games Today", meta: "Primary slate markets", value: String(games.length), tone: "blue" },
  { label: "Highest Confidence Bet", meta: "Wheeler over 6.5 Ks", value: "84%", tone: "emerald" },
  { label: "Highest EV Bet", meta: "Dodgers ML -118", value: "+6.4%", tone: "emerald" },
  { label: "Best Pitcher Prop", meta: "Zack Wheeler Ks", value: "+7.1%", tone: "blue" },
  { label: "Best Home Run Pick", meta: "Aaron Judge +285", value: "18.4%", tone: "amber" },
  { label: "Avg Model Confidence", meta: "Across top signals", value: slateMeta.averageConfidence, tone: "blue" },
];

export const propCategories: Array<{ label: PlayerPropCategory; props: PlayerProp[] }> = [
  { label: "Strikeouts", props: playerProps.filter((prop) => prop.category === "Strikeouts") },
  { label: "Hits", props: playerProps.filter((prop) => prop.category === "Hits") },
  { label: "Runs", props: playerProps.filter((prop) => prop.category === "Runs") },
  { label: "RBI", props: playerProps.filter((prop) => prop.category === "RBI") },
  { label: "Home Runs", props: playerProps.filter((prop) => prop.category === "Home Runs") },
  { label: "Total Bases", props: playerProps.filter((prop) => prop.category === "Total Bases") },
];

export function getTeam(teamId: string) {
  return findRequired(teams, teamId, "team");
}

export function getPlayer(playerId: string) {
  return findRequired([...players, ...pitchers], playerId, "player");
}

export function getPitcher(pitcherId: string) {
  return findRequired(pitchers, pitcherId, "pitcher");
}

export function getWeather(weatherId: string) {
  return findRequired(weatherReports, weatherId, "weather");
}

export function getGame(gameId: string) {
  return findRequired(games, gameId, "game");
}

function findRequired<T extends { id: string }>(items: T[], id: string, label: string) {
  const item = items.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Missing mock ${label}: ${id}`);
  }

  return item;
}
