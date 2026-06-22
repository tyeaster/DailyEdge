import type { ServiceResult } from "@/src/services/shared/types";

import type { VenueWeather } from "./types";

export async function getVenueWeather(): Promise<ServiceResult<VenueWeather[]>> {
  return {
    data: [],
    ok: true,
  };
}
