import type { OddsHistoryRecord } from "./types.ts";

export class OddsHistoryRecorder {
  record(input: OddsHistoryRecord): OddsHistoryRecord {
    return {
      ...input,
      probability: clampProbability(input.probability),
      timestamp: input.timestamp || new Date().toISOString(),
    };
  }
}

function clampProbability(value: number) {
  return Math.max(0, Math.min(1, value));
}
