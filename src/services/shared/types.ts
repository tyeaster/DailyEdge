export type ServiceResult<TData> =
  | {
      data: TData;
      error?: never;
      ok: true;
    }
  | {
      data?: never;
      error: string;
      ok: false;
    };

export type ServiceStatus = "idle" | "loading" | "success" | "error";
