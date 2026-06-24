import type {
  Game,
  GameStatus,
  MlbDivision,
  MlbLeague,
  Pitcher,
  Player,
  Prediction,
  Team,
  Weather,
} from "@/src/models/mlb";
import { formatAmericanOdds } from "@/src/lib/odds";
import { predictionEngine } from "@/src/services/predictions";
import type { SlateMeta } from "@/src/types/mlb-dashboard";

import { mockDataProvider } from "./mock-data-provider";
import type {
  BetsProvider,
  DailyEdgeDataProvider,
  DataProvider,
  GamesProvider,
  InjuriesProvider,
  PlayersProvider,
  PredictionsProvider,
  PropsProvider,
  TeamsProvider,
  WeatherProvider,
} from "./types";

const MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule";
const SPORT_ID_MLB = 1;
const REFRESH_SECONDS = 300;

type MlbScheduleTeam = {
  id: number;
  name: string;
};

type MlbScheduleRecord = {
  losses?: number;
  pct?: string;
  wins?: number;
};

type MlbSchedulePitcher = {
  fullName: string;
  id: number;
};

type MlbScheduleGame = {
  gameDate: string;
  gamePk: number;
  status: {
    abstractGameState?: string;
    detailedState?: string;
    statusCode?: string;
  };
  teams: {
    away: {
      leagueRecord?: MlbScheduleRecord;
      probablePitcher?: MlbSchedulePitcher;
      team: MlbScheduleTeam;
    };
    home: {
      leagueRecord?: MlbScheduleRecord;
      probablePitcher?: MlbSchedulePitcher;
      team: MlbScheduleTeam;
    };
  };
  venue: {
    name: string;
  };
};

type MlbScheduleResponse = {
  dates?: Array<{
    date: string;
    games: MlbScheduleGame[];
  }>;
  totalGames?: number;
};

type LiveSchedule = {
  games: Game[];
  pitchers: Pitcher[];
  slateMeta: SlateMeta;
  teams: Team[];
  weather: Weather[];
};

class LiveScheduleProvider<TData extends { id: string }> implements DataProvider<TData> {
  constructor(
    private readonly loadSchedule: () => Promise<LiveSchedule>,
    private readonly selectRecords: (schedule: LiveSchedule) => TData[],
  ) {}

  async getById(id: string) {
    const records = await this.list();

    return records.find((record) => record.id === id);
  }

  async list() {
    return this.selectRecords(await this.loadSchedule());
  }
}

class LivePlayersProvider
  extends LiveScheduleProvider<Player | Pitcher>
  implements PlayersProvider
{
  constructor(
    loadSchedule: () => Promise<LiveSchedule>,
    private readonly fallbackPlayers: PlayersProvider,
  ) {
    super(loadSchedule, (schedule) => [...schedule.pitchers]);
  }

  async getById(id: string) {
    return (await super.getById(id)) ?? this.fallbackPlayers.getById(id);
  }

  async getPitcherById(id: string) {
    const pitchers = await this.listPitchers();

    return pitchers.find((pitcher) => pitcher.id === id);
  }

  async list() {
    const [livePlayers, fallbackPlayers] = await Promise.all([
      super.list(),
      this.fallbackPlayers.list(),
    ]);

    return mergeById(livePlayers, fallbackPlayers);
  }

  async listPitchers() {
    const [schedule, fallbackPitchers] = await Promise.all([
      super.list(),
      this.fallbackPlayers.listPitchers(),
    ]);

    return mergeById(
      schedule.filter(isPitcher),
      fallbackPitchers,
    );
  }
}

class LiveTeamsProvider extends LiveScheduleProvider<Team> implements TeamsProvider {
  constructor(
    loadSchedule: () => Promise<LiveSchedule>,
    private readonly fallbackTeams: TeamsProvider,
  ) {
    super(loadSchedule, (schedule) => schedule.teams);
  }

  async getById(id: string) {
    return (await super.getById(id)) ?? this.fallbackTeams.getById(id);
  }

  async list() {
    const [liveTeams, fallbackTeams] = await Promise.all([
      super.list(),
      this.fallbackTeams.list(),
    ]);

    return mergeById(liveTeams, fallbackTeams);
  }
}

class LivePredictionsProvider
  extends LiveScheduleProvider<Prediction>
  implements PredictionsProvider
{
  constructor(loadSchedule: () => Promise<LiveSchedule>) {
    super(loadSchedule, (schedule) => {
      const teamById = toRecord(schedule.teams);
      const pitcherById = toRecord(schedule.pitchers);

      return predictionEngine
        .predictSlate({
          games: schedule.games,
          pitcherById,
          teamById,
        })
        .map((prediction): Prediction => ({
          confidence: toConfidenceScore(prediction.confidenceScore),
          edge: {
            percentage: prediction.edgePercent,
            rating:
              prediction.edgePercent >= 8
                ? "S"
                : prediction.edgePercent >= 5
                  ? "A"
                  : prediction.edgePercent >= 3
                    ? "B"
                    : "C",
          },
          gameId: prediction.gameId,
          id: `prediction-${prediction.gameId}-${prediction.selectedTeamId}-moneyline`,
          market: "moneyline",
          projection: formatAmericanOdds(prediction.selectedFairMoneyline),
          reasoning: prediction.explanations.join(". "),
          teamId: prediction.selectedTeamId,
        }));
    });
  }
}

export class LiveMLBProvider implements DailyEdgeDataProvider {
  readonly bets: BetsProvider = mockDataProvider.bets;

  readonly games: GamesProvider = new LiveScheduleProvider(
    () => this.loadSchedule(),
    (schedule) => schedule.games,
  );

  readonly injuries: InjuriesProvider = mockDataProvider.injuries;

  readonly players: PlayersProvider = new LivePlayersProvider(
    () => this.loadSchedule(),
    mockDataProvider.players,
  );

  readonly predictions: PredictionsProvider = new LivePredictionsProvider(
    () => this.loadSchedule(),
  );

  readonly props: PropsProvider = mockDataProvider.props;

  readonly teams: TeamsProvider = new LiveTeamsProvider(
    () => this.loadSchedule(),
    mockDataProvider.teams,
  );

  readonly weather: WeatherProvider = new LiveScheduleProvider(
    () => this.loadSchedule(),
    (schedule) => schedule.weather,
  );

  private schedulePromise?: Promise<LiveSchedule>;

  async getSlateMeta() {
    return (await this.loadSchedule()).slateMeta;
  }

  private async loadSchedule() {
    this.schedulePromise ??= fetchSchedule();

    return this.schedulePromise;
  }
}

export const liveMLBProvider = new LiveMLBProvider();

async function fetchSchedule(): Promise<LiveSchedule> {
  const date = new Date();
  const dateParam = formatDateParam(date);
  const response = await fetch(
    `${MLB_SCHEDULE_URL}?sportId=${SPORT_ID_MLB}&date=${dateParam}&hydrate=probablePitcher`,
    { next: { revalidate: REFRESH_SECONDS } },
  );

  if (!response.ok) {
    throw new Error(`MLB schedule request failed with ${response.status}`);
  }

  const data = (await response.json()) as MlbScheduleResponse;
  const apiGames = data.dates?.flatMap((scheduleDate) => scheduleDate.games) ?? [];

  if (apiGames.length === 0) {
    throw new Error("MLB schedule returned no games for today");
  }

  const teams = uniqueById(
    apiGames.flatMap((game) => [
      normalizeTeam(game.teams.away.team, game.teams.away.leagueRecord),
      normalizeTeam(game.teams.home.team, game.teams.home.leagueRecord),
    ]),
  );
  const pitchers = uniqueById(
    apiGames.flatMap((game) => [
      normalizePitcher(game.teams.away.probablePitcher, game.teams.away.team),
      normalizePitcher(game.teams.home.probablePitcher, game.teams.home.team),
    ]),
  );
  const weather = apiGames.map(normalizeWeather);
  const games = apiGames.map((game): Game => {
    const awayTeam = normalizeTeam(game.teams.away.team, game.teams.away.leagueRecord);
    const homeTeam = normalizeTeam(game.teams.home.team, game.teams.home.leagueRecord);

    return {
      awayPitcherId: normalizePitcher(
        game.teams.away.probablePitcher,
        game.teams.away.team,
      ).id,
      awayTeamId: awayTeam.id,
      confidence: { label: "Medium", value: 66 },
      detail:
        "Live schedule data is loaded. Betting signals continue to use the mock model layer.",
      homePitcherId: normalizePitcher(
        game.teams.home.probablePitcher,
        game.teams.home.team,
      ).id,
      homeTeamId: homeTeam.id,
      id: `game-${game.gamePk}`,
      modelProbability: 0.5,
      odds: {
        moneyline: {
          displayLine: "Pending",
          id: `odds-${game.gamePk}-moneyline`,
          line: 0,
          market: "moneyline",
          movement: "Pending",
          price: 0,
          sportsbook: "Live schedule",
        },
        spread: {
          displayLine: "Pending",
          id: `odds-${game.gamePk}-spread`,
          line: 0,
          market: "spread",
          movement: "Pending",
          price: 0,
          sportsbook: "Live schedule",
        },
        total: {
          displayLine: "Pending",
          id: `odds-${game.gamePk}-total`,
          line: 0,
          market: "total",
          movement: "Pending",
          price: 0,
          sportsbook: "Live schedule",
        },
      },
      scheduledAt: game.gameDate,
      status: normalizeStatus(game),
      venue: game.venue.name,
      weatherId: `weather-${game.gamePk}`,
    };
  });

  return {
    games,
    pitchers,
    slateMeta: {
      averageConfidence: "Live",
      currentDate: new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
      }).format(date),
      dataSource: "live",
      firstPitchCountdown: getFirstPitchCountdown(games),
      gamesToday: games.length,
      lastUpdated: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date),
    },
    teams,
    weather,
  };
}

function normalizeTeam(team: MlbScheduleTeam, record?: MlbScheduleRecord): Team {
  const metadata = teamMetadata[team.id] ?? {
    abbreviation: getAbbreviation(team.name),
    division: "East" satisfies MlbDivision,
    league: "AL" satisfies MlbLeague,
  };

  return {
    abbreviation: metadata.abbreviation,
    city: getCity(team.name),
    division: metadata.division,
    id: `mlb-team-${team.id}`,
    league: metadata.league,
    name: getNickname(team.name),
    record: normalizeRecord(record),
  };
}

function normalizePitcher(
  pitcher: MlbSchedulePitcher | undefined,
  team: MlbScheduleTeam,
): Pitcher {
  const teamId = normalizeTeam(team).id;

  if (!pitcher) {
    return {
      arsenal: [],
      bats: "R",
      era: 0,
      fullName: "Probable starter TBD",
      handedness: "R",
      id: `mlb-pitcher-tbd-${team.id}`,
      inningsPitched: 0,
      position: "SP",
      strikeoutRate: 0,
      teamId,
      throws: "R",
      whip: 0,
    };
  }

  return {
    arsenal: [],
    bats: "R",
    era: 0,
    fullName: pitcher.fullName,
    handedness: "R",
    id: `mlb-pitcher-${pitcher.id}`,
    inningsPitched: 0,
    position: "SP",
    strikeoutRate: 0,
    teamId,
    throws: "R",
    whip: 0,
  };
}

function normalizeRecord(record: MlbScheduleRecord | undefined) {
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const parsedPct = record?.pct ? Number(record.pct) : Number.NaN;
  const winPercentage =
    Number.isFinite(parsedPct) ? parsedPct : wins + losses > 0 ? wins / (wins + losses) : 0.5;

  return {
    losses,
    winPercentage,
    wins,
  };
}

function normalizeWeather(game: MlbScheduleGame): Weather {
  return {
    gameId: `game-${game.gamePk}`,
    hitterFriendlyRating: 50,
    humidityPercent: null,
    id: `weather-${game.gamePk}`,
    pitcherFriendlyRating: 50,
    rainChancePercent: 0,
    stadium: game.venue.name,
    summary: "Weather pending",
    temperatureF: 0,
    windDirection: "Pending",
    windMph: 0,
  };
}

function normalizeStatus(game: MlbScheduleGame): GameStatus {
  if (game.status.abstractGameState === "Live") {
    return "confirmed";
  }

  if (game.status.detailedState?.toLowerCase().includes("postponed")) {
    return "weather-watch";
  }

  return game.status.abstractGameState === "Preview" ? "scheduled" : "confirmed";
}

function getFirstPitchCountdown(games: Game[]) {
  const now = Date.now();
  const firstPitch = games
    .map((game) => new Date(game.scheduledAt).getTime())
    .filter((time) => time > now)
    .sort((left, right) => left - right)[0];

  if (!firstPitch) {
    return "In progress";
  }

  const totalMinutes = Math.max(0, Math.round((firstPitch - now) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCity(name: string) {
  const parts = name.split(" ");

  return parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
}

function getNickname(name: string) {
  const parts = name.split(" ");

  return parts.at(-1) ?? name;
}

function getAbbreviation(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function isPitcher(player: Player | Pitcher): player is Pitcher {
  return "handedness" in player;
}

function mergeById<TData extends { id: string }>(primary: TData[], fallback: TData[]) {
  return uniqueById([...primary, ...fallback]);
}

function uniqueById<TData extends { id: string }>(items: TData[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function toRecord<TData extends { id: string }>(items: TData[]) {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<
    string,
    TData
  >;
}

function toConfidenceScore(value: number): Prediction["confidence"] {
  if (value >= 82) {
    return { label: "Elite", value };
  }

  if (value >= 72) {
    return { label: "High", value };
  }

  if (value >= 58) {
    return { label: "Medium", value };
  }

  return { label: "Low", value };
}

const teamMetadata: Record<
  number,
  { abbreviation: string; division: MlbDivision; league: MlbLeague }
> = {
  108: { abbreviation: "LAA", division: "West", league: "AL" },
  109: { abbreviation: "AZ", division: "West", league: "NL" },
  110: { abbreviation: "BAL", division: "East", league: "AL" },
  111: { abbreviation: "BOS", division: "East", league: "AL" },
  112: { abbreviation: "CHC", division: "Central", league: "NL" },
  113: { abbreviation: "CIN", division: "Central", league: "NL" },
  114: { abbreviation: "CLE", division: "Central", league: "AL" },
  115: { abbreviation: "COL", division: "West", league: "NL" },
  116: { abbreviation: "DET", division: "Central", league: "AL" },
  117: { abbreviation: "HOU", division: "West", league: "AL" },
  118: { abbreviation: "KC", division: "Central", league: "AL" },
  119: { abbreviation: "LAD", division: "West", league: "NL" },
  120: { abbreviation: "WSH", division: "East", league: "NL" },
  121: { abbreviation: "NYM", division: "East", league: "NL" },
  133: { abbreviation: "OAK", division: "West", league: "AL" },
  134: { abbreviation: "PIT", division: "Central", league: "NL" },
  135: { abbreviation: "SD", division: "West", league: "NL" },
  136: { abbreviation: "SEA", division: "West", league: "AL" },
  137: { abbreviation: "SF", division: "West", league: "NL" },
  138: { abbreviation: "STL", division: "Central", league: "NL" },
  139: { abbreviation: "TB", division: "East", league: "AL" },
  140: { abbreviation: "TEX", division: "West", league: "AL" },
  141: { abbreviation: "TOR", division: "East", league: "AL" },
  142: { abbreviation: "MIN", division: "Central", league: "AL" },
  143: { abbreviation: "PHI", division: "East", league: "NL" },
  144: { abbreviation: "ATL", division: "East", league: "NL" },
  145: { abbreviation: "CWS", division: "Central", league: "AL" },
  146: { abbreviation: "MIA", division: "East", league: "NL" },
  147: { abbreviation: "NYY", division: "East", league: "AL" },
  158: { abbreviation: "MIL", division: "Central", league: "NL" },
};
