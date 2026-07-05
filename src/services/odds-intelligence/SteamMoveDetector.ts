import type { OddsTimelinePoint } from "./types.ts";

export class SteamMoveDetector {
  detect(timeline: OddsTimelinePoint[]) {
    if (timeline.length < 2) return undefined;

    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    const movement = Math.abs(last.movementPercent - first.movementPercent);

    if (movement >= 12) {
      return `Steam move detected: ${movement.toFixed(1)}% odds movement.`;
    }

    return undefined;
  }
}
