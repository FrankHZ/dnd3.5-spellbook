import request from "supertest";
import { app } from "~/app";
import type { MetaI18nResponse } from "@dnd/contracts";

describe("GET /api/meta/i18n", () => {
  it("returns empty maps for lang=en", async () => {
    const res = await request(app).get("/api/meta/i18n").query({ lang: "en" });

    expect(res.status).toBe(200);

    const body = res.body as MetaI18nResponse;

    expect(body.i18n.lang).toBe("en");
    expect(body.rulebooks).toEqual({});
    expect(body.classes).toEqual({});
    expect(body.domains).toEqual({});
    expect(body.schools).toEqual({});
    expect(body.subschools).toEqual({});
    expect(body.descriptors).toEqual({});
  });

  it("returns zh translation maps for lang=zh", async () => {
    const res = await request(app).get("/api/meta/i18n").query({ lang: "zh" });

    expect(res.status).toBe(200);

    const body = res.body as MetaI18nResponse;

    expect(body.i18n.lang).toBe("zh");

    // Do not assert exact contents — just shape
    expect(typeof body.rulebooks).toBe("object");
    expect(typeof body.classes).toBe("object");
    expect(typeof body.domains).toBe("object");
    expect(typeof body.schools).toBe("object");
    expect(typeof body.subschools).toBe("object");
    expect(typeof body.descriptors).toBe("object");

    // Optional: assert at least one known id if you have fixtures
    // expect(body.classes[1]?.name).toBeDefined();
  });
});
