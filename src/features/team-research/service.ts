import { buildTeamFromCatalog, mlbTeamCatalog } from "../../data/mlb-teams.ts";
import type { Team } from "../../models/mlb.ts";
import { teamStrengthService, TeamStrengthService } from "../../services/TeamStrengthService.ts";

export interface TeamDirectoryEntry {
  team: Team;
}

export async function getTeamDirectory({
  season = new Date().getUTCFullYear(),
  strengthService = teamStrengthService,
}: {
  season?: number;
  strengthService?: TeamStrengthService;
} = {}): Promise<TeamDirectoryEntry[]> {
  const teams = mlbTeamCatalog.map(buildTeamFromCatalog);
  const enriched = await strengthService.enrichTeams(teams, season);

  return enriched
    .map((team) => ({ team }))
    .sort((a, b) => a.team.name.localeCompare(b.team.name));
}
