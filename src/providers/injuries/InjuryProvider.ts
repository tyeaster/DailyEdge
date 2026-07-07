export type InjuryProviderMode = "live" | "mock" | "replay";

export type InjuryRequest = {
  /** ISO date (YYYY-MM-DD). Live provider queries a window ending on this date. */
  date: string;
  /** How many days back from `date` to include. Live provider defaults this reasonably. */
  lookbackDays?: number;
};

/**
 * Only "10-day IL" / "15-day IL" are derivable from a transactions feed
 * alone. "Probable" / "Questionable" / "Day-to-day" are game-day lineup
 * calls that would need a different, boxscore/lineup-card data source -
 * out of scope here, so the live provider never produces those statuses.
 */
export type NormalizedInjury = {
  description: string;
  effectiveDate: string;
  expectedReturn: string;
  id: string;
  impactRating: number;
  playerId: string;
  playerName: string;
  status: "10-day IL" | "15-day IL";
  teamId: string;
};

export type InjuryProviderResponse = {
  fetchedAt: string;
  injuries: NormalizedInjury[];
  mode: InjuryProviderMode;
  provider: string;
};

export interface InjuryProvider {
  readonly id: string;
  getInjuries(request: InjuryRequest): Promise<InjuryProviderResponse>;
}
