import { mapFieldProvenance } from "#server/services/spells/spells.provenance";
import request from "supertest";
import { app } from "#server/app";
import { contentPrisma } from "#server/lib/content-prisma-client";

const final = "0688739d92a2aa9fb3eceeb444daa7260e711058";
const coverage = "a9cbe07747b1bc908ff4ebcd24244e38e58cb411";
const union = "296903c61e20ce359812148fc0faa234ca2508e7";
const active = "6a73f4d64682325c67e2c40595008344fb5c3be5";
const residual = "00e3c9836be40c878fafe74eb1ad0d915f6d4028";
const prefix = "dice-qa/books/86/";
const pages = [{ sourceId: "synthetic", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]] }];
function envelope(field: "name" | "body", kind = "chm", id = 100): any {
  const sourceKey = kind === "independent" ? null : "synthetic-owner";
  const origin = { kind, sourceKey, ...(kind === "independent" ? { status: "accepted",
    sourceRef: "synthetic-source", sourcePages: pages } : {}) };
  const originalEntry = { revision: coverage, rowRef: prefix + "issue-259/review-a/joint-review-results.jsonl:1",
    sourcePages: pages, englishDisposition: "source-correct" };
  const review = kind === "chm" ? { disposition: "source-reviewed-retention", revision: coverage,
    rowRef: originalEntry.rowRef, sourcePages: pages, priorDisposition: "source-correct", originalEntry,
    ...(field === "body" ? { htmlEvidence: "synthetic representation parity", priorReviewBoundHtml: false, newVisualHtmlReview: false } : {}) }
    : { disposition: kind === "native" ? "accepted-native-source-bound" : "accepted", revision: union,
      rowRef: prefix + `issue-329/${kind === "native" ? "native-accepted" : "independent-proposed-union"}.jsonl:1`,
      sourcePages: pages, originalEntry, originalAcceptedPdfBinding: { revision: union, sourceKey,
        field: field === "name" ? "name" : kind === "native" ? "descriptionHtml" : "descriptionText", sourcePages: pages },
      ...(kind === "independent" ? { sourceQuestionIds: [] } : field === "body" ? {
        originalFullBodyAudit: { revision: coverage, rowRef: prefix + "issue-259/fresh-qa/full-body-audit.jsonl:1" } } : {}) };
  return { schemaVersion: 1, acceptedRevision: final, targetId: id, field, language: "zh", origin,
    input: { revision: final, path: prefix + "issue-365/field-dispositions.jsonl", targetId: id, field }, evidence: review, review };
}
function amended(id = 100, replacement = false): any {
  const v = envelope("body", "native", id);
  const prior = { owner: "native", revision: union, path: prefix + "issue-329/native-accepted.jsonl",
    acceptedRow: { targetId: id, rulebookId: 86, sourceKey: v.origin.sourceKey, descriptionHtml: "<p>synthetic original</p>" } };
  const amendment = { revision: active, path: prefix + "issue-335/validated-amendments.jsonl", prior,
    sourceRef: "synthetic active", sourcePages: pages, status: "accepted" };
  const current = replacement ? { ...amendment, revision: residual, path: prefix + "issue-347/validated-amendments.jsonl",
    prior: { ...prior, currentAmendment: { revision: active, path: amendment.path, acceptedRow: {
      targetId: id, rulebookId: 86, field: "descriptionText", prior, review: { targetId: id, rulebookId: 86,
        field: "descriptionText", sourceKey: null, after: "synthetic prior amendment", proposedHtml: "<p>synthetic prior amendment</p>",
        status: "accepted", sourceRef: "synthetic prior", sourcePages: pages, originalSourceRead: true,
        before: "synthetic before", input: { chinese: { descriptionText: "synthetic before", descriptionHtml: "<p>synthetic before</p>" }, english: { rulebookId: 86 } },
        fullBodyAudit: { effectiveText: "synthetic prior amendment", effectiveHtml: "<p>synthetic prior amendment</p>", beforeHtml: "<p>synthetic before</p>", currentHtmlReviewed: true, proposedHtmlReviewed: true } } } } } }
    : amendment;
  v.origin.activeAmendment = current;
  v.review = { ...v.review, activeAmendment: current, disposition: "accepted", sourceQuestionIds: [] };
  v.evidence = v.review;
  return v;
}
const row = (id = 100) => ({ spellId: id, rulebookId: 86, lang: "zh", name: "Synthetic final name", descriptionText: "Synthetic final body" });
function map(v: any) { return mapFieldProvenance(JSON.stringify(v), v.field, row(v.targetId), { id: v.targetId, rulebookId: 86 }); }

describe("final source review contract", () => {
  it.each(["chm", "native", "independent"])("keeps %s ownership separate from original review", kind => {
    for (const field of ["name", "body"] as const) {
      const mapped = map(envelope(field, kind));
      expect(mapped.origin.kind).toBe(kind);
      expect(mapped.review?.originalEntryReviewed).toBe(true);
      expect(mapped.review?.disposition).toBe(kind === "chm" ? "source-reviewed-retention" : kind === "native" ? "accepted-native-source-bound" : "accepted");
      for (const secret of ["dice-qa/", "sourcePages", "rowRef", "originalAcceptedPdfBinding", "evidence"]) expect(JSON.stringify(mapped)).not.toContain(secret);
    }
  });
  it.each([
    ["db04cc54684c8e63407341717cb9e00e883f1203", "issue-343/independent-proposed.jsonl"],
    [residual, "issue-347/validated-proposals.jsonl"],
  ])("validates source-reviewed missing translation package %s", (revision, path) => {
    const v = envelope("body", "independent");
    delete v.review.rowRef; delete v.review.originalAcceptedPdfBinding;
    v.review.revision = revision; v.review.path = prefix + path;
    if (path.includes("343")) v.review.currentInputBinding = prefix + "issue-365/missing-translations-rebound.jsonl";
    expect(map(v).review?.acceptedRevision).toBe(revision);
    v.review.path = prefix + "wrong-package.jsonl";
    expect(() => map(v)).toThrow();
  });
  it.each(["chm", "native", "independent"])("rejects invalid %s review material", kind => {
    for (const mutate of [
      (v: any) => { v.review.disposition = "unreviewed"; },
      (v: any) => { v.review.revision = final; },
      (v: any) => { v.review.originalEntry.englishDisposition = "unreviewed"; },
      (v: any) => { v.review.originalEntry.sourcePages = []; },
      (v: any) => { v.review.rowRef = prefix + "other.jsonl:1"; },
    ]) {
      const v = envelope("body", kind); mutate(v); expect(() => map(v)).toThrow();
    }
    const unsafe = envelope("body", kind);
    unsafe.review.sourceQuestionIds = ["private/source/path"];
    expect(() => map(unsafe)).toThrow();
    const unsafeOwner = envelope("name", "chm"); unsafeOwner.origin.sourceKey = "private/source/path";
    expect(() => map(unsafeOwner)).toThrow();
    const v = envelope("body", kind);
    if (kind === "chm") { v.review.newVisualHtmlReview = true; }
    else if (kind === "native") { v.review.originalFullBodyAudit.revision = union; }
    else { v.review.sourceQuestionIds = ["synthetic-unbound-question"]; }
    expect(() => map(v)).toThrow();
  });
  it("preserves active and prior amendment metadata for 4736 without exposing proof", () => {
    expect(map(amended()).amendment).toMatchObject({ acceptedRevision: active, priorAcceptedRevision: union });
    const result = map(amended(4736, true));
    expect(result.amendment).toEqual({ kind: "accepted-body-amendment", acceptedRevision: residual,
      priorAcceptedRevision: union, status: "accepted", priorAmendment: { acceptedRevision: active, status: "accepted" } });
    expect(JSON.stringify(result)).not.toContain("synthetic prior amendment");
  });
  it("retains source question IDs as notes without adjudicating them", () => {
    const v = envelope("body", "independent");
    v.review.disposition = v.origin.status = "accepted-with-source-issues";
    v.review.sourceQuestionIds = ["synthetic-source-question"];
    expect(map(v).review?.sourceQuestionIds).toEqual(["synthetic-source-question"]);
  });
  it.each([
    ["arbitrary revision", (v: any): void => { v.acceptedRevision = "f".repeat(40); }],
    ["wrong language", (v: any): void => { v.language = "en"; }],
    ["wrong input target", (v: any): void => { v.input.targetId = 101; }],
    ["wrong input field", (v: any): void => { v.input.field = "name"; }],
    ["wrong input path", (v: any): void => { v.input.path = "synthetic-forgery"; }],
    ["stale input revision", (v: any): void => { v.input.revision = union; }],
    ["missing review", (v: any): void => { delete v.review; }],
    ["mismatched evidence", (v: any): void => { v.evidence = {}; }],
    ["wrong origin", (v: any): void => { v.origin.kind = "english"; }],
    ["missing original entry", (v: any): void => { delete v.review.originalEntry; }],
    ["stale original entry", (v: any): void => { v.review.originalEntry.revision = union; }],
    ["missing spans", (v: any): void => { v.review.sourcePages = []; }],
    ["wrong original field", (v: any): void => { v.review.originalAcceptedPdfBinding.field = "name"; }],
    ["wrong original owner", (v: any): void => { v.review.originalAcceptedPdfBinding.sourceKey = "forged"; }],
    ["missing full body audit", (v: any): void => { delete v.review.originalFullBodyAudit; }],
    ["missing prior target", (v: any): void => { delete v.origin.activeAmendment.prior.acceptedRow.targetId; }],
    ["wrong prior book", (v: any): void => { v.origin.activeAmendment.prior.acceptedRow.rulebookId = 9; }],
    ["wrong prior owner", (v: any): void => { v.origin.activeAmendment.prior.owner = "independent"; }],
    ["missing prior body", (v: any): void => { delete v.origin.activeAmendment.prior.acceptedRow.descriptionHtml; }],
    ["missing active proof", (v: any): void => { delete v.review.activeAmendment; }],
    ["wrong active revision", (v: any): void => { v.origin.activeAmendment.revision = final; }],
    ["wrong prior amendment target", (v: any): void => { v.origin.activeAmendment.prior.currentAmendment.acceptedRow.targetId = 1; }],
    ["missing prior amendment", (v: any): void => { delete v.origin.activeAmendment.prior.currentAmendment; }],
    ["wrong prior audit", (v: any): void => { v.origin.activeAmendment.prior.currentAmendment.acceptedRow.review.fullBodyAudit.effectiveText = "forged"; }],
  ] as const)("fails closed on %s", (_label, mutate) => {
    const v = amended(4736, true); mutate(v);
    expect(() => map(v)).toThrow("Invalid effective spell provenance");
  });
  it("rejects cross-book/target rows and a final envelope under historical revision", () => {
    const v = envelope("name");
    for (const target of [{ id: 101, rulebookId: 86 }, { id: 100, rulebookId: 9 }]) {
      expect(() => mapFieldProvenance(JSON.stringify(v), "name", row(), target)).toThrow();
    }
    v.acceptedRevision = union;
    expect(() => map(v)).toThrow();
  });
});

describe("final default normalized API", () => {
  beforeEach(async () => {
    process.env.SPELL_READ_SOURCE = "content";
    const book = await contentPrisma.rulebookContent.findUniqueOrThrow({ where: { legacyRulebookId: 6 } });
    await contentPrisma.rulebookContent.create({ data: { ...book, id: "rulebook:86", legacyRulebookId: 86, slug: "synthetic-sc" } });
    await contentPrisma.spellContent.update({ where: { legacySpellId: 100 }, data: { sourceRulebookId: 86 } });
    await contentPrisma.spellListEntry.updateMany({ where: { spellId: "spell:100" }, data: { rulebookId: 86 } });
    await contentPrisma.i18nSpellText.updateMany({ where: { spellId: 100, variant: "chm" }, data: { rulebookId: 86 } });
    await contentPrisma.i18nSpellText.create({ data: { spellId: 100, rulebookId: 86, lang: "zh", variant: "effective",
      name: "Synthetic final name", descriptionText: "Synthetic final body with faithful unresolved note",
      descriptionHtml: "<table><tr><td>Synthetic table</td></tr></table><p>faithful unresolved note</p>",
      nameProvenanceJson: JSON.stringify(envelope("name")), bodyProvenanceJson: JSON.stringify(envelope("body", "independent")) } });
    await contentPrisma.i18nSpellSummaryText.create({ data: { spellId: 100, rulebookId: 86, lang: "zh", variant: "chm", summaryText: "maintainedsummary", reviewStatus: "accepted" } });
    await contentPrisma.i18nSpellSummaryText.create({ data: { spellId: 100, rulebookId: 86, lang: "zh", variant: "effective", summaryText: "unselectedsummary", reviewStatus: "accepted" } });
    await contentPrisma.i18nSpellText.create({ data: { spellId: 100, rulebookId: 86, lang: "zh", variant: "other",
      name: "Other variant name", descriptionText: "othervariantbody" } });
    await contentPrisma.i18nSpellSummaryText.create({ data: { spellId: 100, rulebookId: 86, lang: "zh", variant: "other", summaryText: "othervariantsummary" } });
    await contentPrisma.$executeRawUnsafe(`INSERT INTO SpellSearchDocument (spellId,lang,variant,name,aliases,summary,mechanics,body) VALUES (100,'zh','other','Other variant name','fireball','othervariantsummary','','othervariantbody')`);
    await contentPrisma.$executeRawUnsafe(`UPDATE SpellSearchDocument SET summary='maintainedsummary' WHERE spellId=100 AND lang='zh' AND variant='chm'`);
    await contentPrisma.$executeRawUnsafe(`INSERT INTO SpellSearchDocument (spellId,lang,variant,name,aliases,summary,mechanics,body) VALUES (100,'zh','effective','Synthetic final name','','maintainedsummary','','finalbodyterm')`);
  });
  afterEach(async () => {
    await contentPrisma.$executeRawUnsafe("DELETE FROM SpellSearchDocument WHERE variant IN ('effective','other')");
    await contentPrisma.$executeRawUnsafe(`UPDATE SpellSearchDocument SET summary='' WHERE spellId=100 AND lang='zh' AND variant='chm'`);
    await contentPrisma.i18nSpellText.deleteMany({ where: { spellId: 100, variant: { in: ["effective", "other"] } } });
    await contentPrisma.i18nSpellText.updateMany({ where: { spellId: 100, variant: "chm" }, data: { rulebookId: 6 } });
    await contentPrisma.i18nSpellSummaryText.deleteMany({ where: { spellId: 100 } });
    await contentPrisma.spellListEntry.updateMany({ where: { spellId: "spell:100" }, data: { rulebookId: 6 } });
    await contentPrisma.spellContent.update({ where: { legacySpellId: 100 }, data: { sourceRulebookId: 6 } });
    await contentPrisma.rulebookContent.delete({ where: { legacyRulebookId: 86 } });
    process.env.SPELL_READ_SOURCE = "rules";
  });
  it("agrees across detail, batch, browse, name/full search and resolve, preserving explicit CHM and non-SC", async () => {
    const detail = await request(app).get("/api/spells/100").query({ lang: "zh" });
    expect(detail.status).toBe(200);
    expect(detail.body.i18n).toMatchObject({ variant: "effective", name: "Synthetic final name",
      nameProvenance: { origin: { kind: "chm" }, review: { disposition: "source-reviewed-retention" } },
      bodyProvenance: { origin: { kind: "independent" } }, summary: { variant: "chm", shortDescription: "maintainedsummary" } });
    expect(detail.body.i18n.description.html).toContain("<table>");
    expect(detail.body.i18n.description.text).toContain("faithful unresolved note");
    expect((await request(app).get("/api/spells/100").query({ lang: "zh", variant: "effective" })).body).toEqual(detail.body);
    const batch = await request(app).post("/api/spells/batch").query({ lang: "zh" }).send({ ids: [100, 1] });
    const browse = await request(app).get("/api/spells/by-level").query({ lang: "zh", classIds: "1", level: 3, rulebookIds: "86" });
    const search = await request(app).get("/api/spells/search").query({ lang: "zh", q: "Synthetic final name", rulebookIds: "86" });
    const full = await request(app).get("/api/spells/search").query({ lang: "zh", q: "finalbodyterm", mode: "full", rulebookIds: "86" });
    const resolve = await request(app).post("/api/spells/resolve").query({ lang: "zh" }).send({ names: ["Synthetic final name", "火球术"], rulebookIds: [86] });
    for (const response of [batch, browse, search, full, resolve]) expect(response.status).toBe(200);
    const selected = [batch.body.items[0], browse.body.groups.flatMap((g: any) => g.items).find((s: any) => s.id === 100), search.body.items[0], full.body.items[0], resolve.body.results[0].spell];
    for (const item of selected) {
      expect(item).toBeDefined();
      expect(item.i18n.name).toBe(detail.body.i18n.name);
      expect(item.i18n.nameProvenance).toEqual(detail.body.i18n.nameProvenance);
      expect(item.i18n.summary).toEqual(detail.body.i18n.summary);
      expect(JSON.stringify(item)).not.toContain("dice-qa/");
    }
    expect(resolve.body.results[1].status).toBe("not_found");
    expect((await request(app).get("/api/spells/search").query({ lang: "zh", q: "火球术", rulebookIds: "86" })).body.total).toBe(0);
    for (const variant of ["chm", "synthetic-other"]) {
      const old = await request(app).get("/api/spells/100").query({ lang: "zh", variant });
      expect(old.status).toBe(200); expect(old.body.i18n?.nameProvenance).toBeUndefined();
      expect(old.body.i18n?.name).toBe(variant === "chm" ? "火球术" : undefined);
    }
    const other = await request(app).get("/api/spells/1").query({ lang: "zh" });
    expect(other.body).toEqual((await request(app).get("/api/spells/1").query({ lang: "zh", variant: "chm" })).body);
    expect(batch.body.items[1].i18n.variant).toBe("chm");
  });
  it("isolates variant names/bodies/summaries and retains canonical aliases in full search", async () => {
    for (const context of [{ lang: "zh" }, { lang: "zh", variant: "chm" }, { lang: "zh", variant: "effective" }, { lang: "zh", variant: "other" }, { lang: "en" }]) {
      for (const [q, expected] of [
        ["Other variant name", context.variant === "other" ? 1 : 0],
        ["othervariantbody", context.variant === "other" ? 1 : 0],
        ["othervariantsummary", context.variant === "other" ? 1 : 0],
        ["maintainedsummary", context.lang === "zh" && context.variant !== "other" ? 1 : 0],
        ["unselectedsummary", 0],
        ["fireball", 1],
      ] as const) {
        const res = await request(app).get("/api/spells/search").query({ ...context, q, mode: "full", rulebookIds: "86" });
        expect(res.status).toBe(200); expect(res.body.total, `${context.lang}/${context.variant}/${q}`).toBe(expected);
        if (expected) expect(res.body.items[0].i18n?.summary?.variant).toBe(context.lang === "en" ? undefined : context.variant === "other" ? "other" : "chm");
      }
    }
  });
  it("fails closed on malformed effective instead of selecting CHM", async () => {
    await contentPrisma.i18nSpellText.updateMany({ where: { spellId: 100, variant: "effective" }, data: { nameProvenanceJson: null } });
    for (const response of [await request(app).get("/api/spells/100").query({ lang: "zh" }),
      await request(app).post("/api/spells/batch").query({ lang: "zh" }).send({ ids: [100] }),
      await request(app).post("/api/spells/resolve").query({ lang: "zh" }).send({ names: ["Synthetic final name"], rulebookIds: [86] })]) {
      expect(response.status).toBe(500); expect(response.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
    }
    expect((await request(app).get("/api/spells/100").query({ lang: "zh", variant: "chm" })).status).toBe(200);
  });
});
