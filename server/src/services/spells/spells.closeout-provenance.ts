import {isDeepStrictEqual as equal} from "node:util";
import {DICE_CLOSEOUT_REVISION, type SpellFieldProvenance} from "@dnd/contracts";

const record = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const revision = (v: unknown) => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
const key = (v: unknown) => text(v) && !/[\\/\r\n]/.test(v);
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const path = (v: unknown) => text(v) && !v.startsWith("/") && !v.includes("\\") && !v.split("/").includes("..") && !v.includes(":");
const keys = (v: Record<string, unknown>, expected: string[]) => equal(Object.keys(v).sort(), expected.sort());

/** Validate only the fixed non-SC writer envelope. Return safe metadata, never evidence locators. */
export function mapCloseoutProvenance(v: Record<string, any>, field: "name" | "body",
  target: {id: number; rulebookId: number}, fail: () => never): SpellFieldProvenance {
  if (target.rulebookId === 86 || v.acceptedRevision !== DICE_CLOSEOUT_REVISION
    || !equal(v.closeout, {issue: 586, revision: DICE_CLOSEOUT_REVISION})
    || !keys(v.origin, ["kind", "sourceKey"])) return fail();
  const common = ["schemaVersion", "acceptedRevision", "targetId", "field", "language", "origin", "input", "evidence", "closeout"];
  const o = v.origin, i = v.input, e = v.evidence;
  if ("review" in v) {
    const r = v.review;
    if (!keys(v, [...common, "review"]) || !record(r) || v.language !== "zh"
      || !["native", "independent"].includes(o.kind)
      || (o.kind === "native" ? !key(o.sourceKey) : o.sourceKey !== null)
      || !keys(i, ["revision", "path", "row", "targetId", "field", "sourceKey"])
      || !revision(i.revision) || !path(i.path) || !positive(i.row) || i.targetId !== target.id
      || i.field !== (field === "name" ? "name" : "descriptionHtml")
      || !keys(e, ["issue", "pr", "publicHead", "historicalRevision", "historicalContinuityAuthenticated", "residuals"])
      || !positive(e.issue) || !positive(e.pr) || !revision(e.publicHead)
      || !(e.historicalRevision === null || revision(e.historicalRevision))
      || typeof e.historicalContinuityAuthenticated !== "boolean" || !Array.isArray(e.residuals)
      || !e.residuals.every((q: any) => record(q) && keys(q, ["ownerIssue", "path", "row"])
        && positive(q.ownerIssue) && path(q.path) && positive(q.row))) return fail();
    if (!["native-db-english", "recovered-db-english", "independent-db-english"].includes(r.authority)
      || (r.authority === "independent-db-english") !== (o.kind === "independent")
      || (o.kind === "native" && i.sourceKey !== o.sourceKey)
      || !(i.sourceKey === null || key(i.sourceKey))
      || (r.authority === "recovered-db-english"
        ? e.historicalContinuityAuthenticated || !revision(e.historicalRevision)
        : e.historicalRevision !== null || e.historicalContinuityAuthenticated !== true)) return fail();
    const expected = {kind: "DB-English" as const, disposition: "DB-English-reviewed" as const, acceptedRevision: DICE_CLOSEOUT_REVISION,
      authority: r.authority, ...(e.residuals.length ? {unresolved: {ownerIssues: [...new Set<number>(e.residuals.map((q: any) => q.ownerIssue))].sort((a,b) => a-b)}} : {}),
      ...(field === "body" ? {composition: r.composition} : {})};
    if (!equal(r, expected) || (field === "body" && !["Chinese", "mixed"].includes(r.composition))) return fail();
    return {schemaVersion: 1, acceptedRevision: DICE_CLOSEOUT_REVISION, language: "zh", origin: o,
      review: expected};
  }
  if (!keys(v, common) || !["chm", "english"].includes(o.kind)
    || v.language !== (o.kind === "english" ? "en" : "zh")) return fail();
  const chm = o.kind === "chm";
  if (chm ? !key(o.sourceKey) : o.sourceKey !== null) return fail();
  if (!equal(i, {targetId: target.id, field: `${chm ? "chinese" : "english"}.${field === "name" ? "name" : chm ? "descriptionText" : "description"}`})) return fail();
  if (chm ? !text(e.id) || !equal(e, {table: "I18nSpellText", id: e.id, spellId: target.id, lang: "zh", variant: "chm", sourceKey: o.sourceKey})
    : !equal(e, {table: "dnd_spell", id: target.id, field: field === "name" ? "name" : "description"})) return fail();
  return {schemaVersion: 1, acceptedRevision: DICE_CLOSEOUT_REVISION, language: v.language, origin: o};
}
