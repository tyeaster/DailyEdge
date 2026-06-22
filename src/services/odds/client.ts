import type { ServiceResult } from "@/src/services/shared/types";

import type { OddsQuote } from "./types";

export async function getOddsQuotes(): Promise<ServiceResult<OddsQuote[]>> {
  return {
    data: [],
    ok: true,
  };
}
