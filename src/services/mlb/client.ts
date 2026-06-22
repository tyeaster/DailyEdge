import type { ServiceResult } from "@/src/services/shared/types";

import type { MlbGame } from "./types";

export async function getMlbSlate(): Promise<ServiceResult<MlbGame[]>> {
  return {
    data: [],
    ok: true,
  };
}
