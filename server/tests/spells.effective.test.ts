import request from "supertest";
import { app } from "#server/app";
import { contentPrisma } from "#server/lib/content-prisma-client";

const revision = "a".repeat(40);
const sourcePages = [{ sourceId: "synthetic", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]] }];
function provenance(id: number, field: "name" | "body", kind: string) {
  const sourceKey = kind === "native" || kind === "chm" ? "synthetic-source" : null;
  const acceptedField = field === "name" ? "name" : kind === "native" ? "descriptionHtml" : "descriptionText";
  return { schemaVersion: 1, acceptedRevision: revision, targetId: id, field,
    language: kind === "english" ? "en" : "zh",
    origin: { kind, sourceKey, ...(kind === "independent" ? {
      sourceRef: "private/review", sourcePages, status: "accepted-with-source-issues" } : {}) },
    input: { path: "private/input", targetId: id,
      field: kind === "native" || kind === "independent" ? acceptedField
        : `${kind === "english" ? "english" : "chinese"}.${field === "name" ? "name" : kind === "english" ? "description" : "descriptionText"}`,
      ...(kind === "native" || kind === "independent" ? { sourceKey } : {}) },
    evidence: kind === "native" ? { path: "private/evidence", targetId: id, field: acceptedField, sourceKey }
      : kind === "independent" ? { sourceRef: "private/review", pages: sourcePages }
      : kind === "chm" ? { table: "I18nSpellText", spellId: id, lang: "zh", variant: "chm", sourceKey }
      : { table: "dnd_spell", id, field: field === "name" ? "name" : "description" } };
}
async function seed(id = 100, book = 6, nameKind = "native", bodyKind = "english") {
  await contentPrisma.i18nSpellText.create({ data: {
    spellId: id, rulebookId: book, lang: "zh", variant: "effective", name: "Synthetic shared name",
    descriptionText: "Synthetic table and unresolved source note", descriptionHtml: "<table><tr><td>Synthetic</td></tr></table><p>Unresolved source note</p>",
    sourceKey: null, nameProvenanceJson: JSON.stringify(provenance(id, "name", nameKind)),
    bodyProvenanceJson: JSON.stringify(provenance(id, "body", bodyKind)),
  } });
}
const query = { lang: "zh", variant: "effective" };
const previous = process.env.SPELL_READ_SOURCE;
afterEach(async () => {
  await contentPrisma.i18nSpellSummaryText.deleteMany({ where: { spellId: 100, lang: "zh", variant: "chm" } });
  await contentPrisma.i18nSpellText.deleteMany({ where: { variant: "effective" } });
  if (previous === undefined) delete process.env.SPELL_READ_SOURCE;
  else process.env.SPELL_READ_SOURCE = previous;
});

describe.each(["rules", "content"])("explicit effective API (%s)", source => {
  beforeEach(async () => {
    process.env.SPELL_READ_SOURCE = source;
    await contentPrisma.i18nSpellSummaryText.create({ data: {
      spellId: 100, rulebookId: 6, lang: "zh", variant: "chm",
      summaryText: "Synthetic legacy summary", sourceKey: "synthetic-chm-summary",
    } });
  });
  it.each([["native", "english"], ["english", "independent"], ["chm", "native"], ["independent", "chm"]])(
    "maps mixed %s/%s fields and keeps CHM summaries and legacy responses", async (nameKind, bodyKind) => {
      const legacy = await request(app).get("/api/spells/100").query({ lang: "zh" });
      const en = await request(app).get("/api/spells/100");
      await seed(100, 6, nameKind, bodyKind);
      const res = await request(app).get("/api/spells/100").query(query);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(100);
      expect(res.body.i18n.nameProvenance).toEqual({ schemaVersion: 1, acceptedRevision: revision,
        language: nameKind === "english" ? "en" : "zh", origin: { kind: nameKind,
          sourceKey: ["native", "chm"].includes(nameKind) ? "synthetic-source" : null } });
      expect(res.body.i18n.bodyProvenance.language).toBe(bodyKind === "english" ? "en" : "zh");
      expect(res.body.i18n.bodyProvenance.origin.kind).toBe(bodyKind);
      expect(res.body.i18n.sourceKey).toBeUndefined();
      expect(res.body.i18n.description.html).toContain("<table>");
      expect(res.body.i18n.description.text).toContain("unresolved source note");
      expect(res.body.i18n.summary).toEqual(legacy.body.i18n.summary);
      expect(JSON.stringify(res.body)).not.toContain("private/");
      for (const q of [{ lang: "zh" }, { lang: "zh", variant: "chm" }]) {
        expect((await request(app).get("/api/spells/100").query(q)).body).toEqual(legacy.body);
      }
      expect((await request(app).get("/api/spells/100").query({ lang: "en", variant: "effective" })).body).toEqual(en.body);
    });
  it("maps name-only consumers, same-name cross-book IDs and summaries", async () => {
    await seed(); await seed(1, 4, "independent", "chm");
    const batch = await request(app).post("/api/spells/batch").query(query).send({ ids: [100, 1] });
    expect(batch.status).toBe(200);
    expect(batch.body.items.map((s: any) => s.id)).toEqual([100, 1]);
    expect(batch.body.items[0].i18n.nameProvenance.origin.kind).toBe("native");
    expect(batch.body.items[0].i18n.bodyProvenance).toBeUndefined();
    const byLevel = await request(app).get("/api/spells/by-level").query({ ...query, classIds: "1", level: 3, rulebookIds: "6" });
    expect(byLevel.status).toBe(200);
    expect(byLevel.body.groups.flatMap((g: any) => g.items).find((s: any) => s.id === 100).i18n.nameProvenance.origin.kind).toBe("native");
    const resolve = await request(app).post("/api/spells/resolve").query(query).send({ names: ["Synthetic shared name"], rulebookIds: [4, 6] });
    expect(resolve.status).toBe(200);
    expect(resolve.body.results[0].status).toBe("ambiguous");
    expect(resolve.body.results[0].candidates.map((s: any) => s.id).sort((a: number,b: number) => a-b)).toEqual([1,100]);
    expect(resolve.body.results[0].candidates.every((s: any) => s.i18n.nameProvenance)).toBe(true);
  });
  it("keeps absent-effective English fallback and summary-only overlays", async () => {
    const legacy = await request(app).get("/api/spells/100").query({ lang: "zh" });
    const res = await request(app).get("/api/spells/100").query(query);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(legacy.body.name);
    expect(legacy.body.i18n.summary).toBeDefined();
    expect(res.body.i18n).toEqual({ summary: legacy.body.i18n.summary });
    const resolve = await request(app).post("/api/spells/resolve").query(query).send({ names: ["火球术", "Fireball"], rulebookIds: [6] });
    expect(resolve.body.results[0].status).toBe("not_found");
    expect(resolve.body.results[1]).toMatchObject({ status: "resolved", matchedOn: "en", spellId: 100 });
  });
  it.each([null, "{", "{}", ...[
    { targetId: 101 }, { field: "body" }, { language: "en" }, { schemaVersion: 2 },
    { acceptedRevision: "bad" }, { origin: { kind: "forged", sourceKey: null } },
    { input: { path: "private/input", targetId: 101, field: "name" } },
    { evidence: { path: "private/evidence", targetId: 100, field: "name", sourceKey: "wrong" } },
  ].map(patch => JSON.stringify({ ...provenance(100, "name", "native"), ...patch }))])(
    "rejects invalid name provenance %s without leaking evidence", async invalid => {
      await seed();
      await contentPrisma.i18nSpellText.updateMany({ where: { spellId: 100, variant: "effective" }, data: { nameProvenanceJson: invalid } });
      for (const res of [await request(app).get("/api/spells/100").query(query),
        await request(app).post("/api/spells/batch").query(query).send({ ids: [100] }),
        await request(app).post("/api/spells/resolve").query(query).send({ names: ["Synthetic shared name"], rulebookIds: [6] })]) {
        expect(res.status).toBe(500);
        expect(res.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
        expect(JSON.stringify(res.body)).not.toContain("private/");
      }
    });
  it.each([
    { bodyProvenanceJson: null },
    { bodyProvenanceJson: "{" },
    { bodyProvenanceJson: JSON.stringify({ ...provenance(100, "body", "english"), language: "zh" }) },
    { bodyProvenanceJson: JSON.stringify({ ...provenance(100, "body", "independent"),
      origin: { kind: "independent", sourceKey: null, sourceRef: "private/review", sourcePages: [], status: "accepted" } }) },
    { bodyProvenanceJson: JSON.stringify({ ...provenance(100, "body", "chm"),
      evidence: { table: "I18nSpellText", spellId: 101, lang: "zh", variant: "chm", sourceKey: "synthetic-source" } }) },
    { rulebookId: 4 }, { name: null }, { descriptionText: null },
  ])("rejects incomplete/wrong body or row binding %j", async data => {
    await seed();
    await contentPrisma.i18nSpellText.updateMany({ where: { spellId: 100, variant: "effective" }, data });
    const res = await request(app).get("/api/spells/100").query(query);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
    expect(JSON.stringify(res.body)).not.toContain("private/");
  });
  it("preserves the English summary path", async () => {
    const before = await request(app).get("/api/spells/2441");
    const effective = await request(app).get("/api/spells/2441").query({ lang: "en", variant: "effective" });
    expect(effective.status).toBe(200);
    expect(effective.body).toEqual(before.body);
    expect(effective.body.i18n.summary).toMatchObject({ lang: "en", variant: "imarvin" });
  });
  it("requires detail body provenance but allows name-only reads", async () => {
    await seed();
    await contentPrisma.i18nSpellText.updateMany({ where: { spellId: 100, variant: "effective" }, data: { bodyProvenanceJson: null } });
    expect((await request(app).get("/api/spells/100").query(query)).status).toBe(500);
    expect((await request(app).post("/api/spells/batch").query(query).send({ ids: [100] })).status).toBe(200);
  });
});
