import type { Game, Player, Team } from "@/src/models";

export type MlbTeam = Team & {
  league: "MLB";
};

export type MlbPlayer = Player;

export type MlbGame = Game & {
  sport: "MLB";
};
