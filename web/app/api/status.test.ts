import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet } from "./http";
import { getAppStatus, getDbStatus } from "./status";

vi.mock("./http", () => ({
  apiGet: vi.fn(),
}));

describe("status API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads backend app status", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      backend: { versionLabel: "local", source: "local" },
    } as any);

    await getAppStatus();

    expect(apiGet).toHaveBeenCalledWith("/api/status/app", undefined);
  });

  it("loads database status", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      activeSpellReadSource: "content",
      databases: {},
      content: { status: "ok" },
    } as any);

    await getDbStatus();

    expect(apiGet).toHaveBeenCalledWith("/api/status/db", undefined);
  });
});
