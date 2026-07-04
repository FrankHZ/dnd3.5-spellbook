import type { AppStatusResponse, DbStatusResponse } from "@dnd/contracts";

import { apiGet } from "~/api/http";

export const getAppStatus = (signal?: AbortSignal) =>
  apiGet<AppStatusResponse>("/api/status/app", signal);

export const getDbStatus = (signal?: AbortSignal) =>
  apiGet<DbStatusResponse>("/api/status/db", signal);
