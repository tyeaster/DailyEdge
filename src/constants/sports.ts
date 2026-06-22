export const supportedSports = ["MLB"] as const;

export type SupportedSport = (typeof supportedSports)[number];
