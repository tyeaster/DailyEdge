import type { SupportedSport } from "@/src/constants/sports";

export type Team = {
  abbreviation: string;
  id: string;
  league: SupportedSport;
  name: string;
};

export type Player = {
  id: string;
  name: string;
  position?: string;
  teamId?: string;
};

export type Game = {
  awayTeamId: string;
  homeTeamId: string;
  id: string;
  scheduledAt: string;
  sport: SupportedSport;
};
