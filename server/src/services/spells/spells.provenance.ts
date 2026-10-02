import { isDeepStrictEqual } from "node:util";
import type { SpellFieldProvenance } from "@dnd/contracts";
import { ApiError } from "#server/utils/errors";

const record = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const index = (v: unknown) => Number.isInteger(v) && Number(v) >= 0;
const revision = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
const accepted = (v: unknown) => v === "accepted" || v === "accepted-with-source-issues";
function pages(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0 && v.every(p => record(p) && text(p.sourceId)
    && index(p.pageIndex) && (p.printedPage === null || (index(p.printedPage) && p.printedPage > 0))
    && Array.isArray(p.spanRefs) && p.spanRefs.length > 0
    && p.spanRefs.every((span: unknown) => Array.isArray(span) && span.length === 3 && span.every(index)));
}

/** Validate the stored writer envelope, never re-adjudicate source quality or expose locators. */
export function mapFieldProvenance(raw: string | null, field: "name" | "body",
  row: { spellId: number; rulebookId: number; lang: string; name: string | null;
    descriptionText?: string | null },
  target: { id: number; rulebookId: number }): SpellFieldProvenance {
  const fail = (): never => { throw new ApiError(500, "Invalid effective spell provenance",
    "The effective spell field has invalid provenance", "INVALID_EFFECTIVE_PROVENANCE"); };
  let v: unknown;
  try { v = raw === null ? null : JSON.parse(raw); } catch { return fail(); }
  if (!record(v) || v.schemaVersion !== 1 || v.targetId !== target.id || v.field !== field
    || !text(field === "name" ? row.name : row.descriptionText)
    || row.spellId !== target.id || row.rulebookId !== target.rulebookId || row.lang !== "zh"
    || !revision(v.acceptedRevision)
    || !record(v.origin) || !record(v.input) || !record(v.evidence)) return fail();
  const o = v.origin;
  let input = v.input, evidence = v.evidence;
  let amendment: SpellFieldProvenance["amendment"];
  if ("activeAmendment" in o) {
    const a = o.activeAmendment;
    if (field !== "body" || !["native", "independent"].includes(o.kind)
      || v.language !== "zh" || !record(a) || !record(a.prior)
      || !record(a.prior.acceptedRow) || a.prior.owner !== o.kind
      || a.revision !== v.acceptedRevision || !revision(a.prior.revision)
      || a.prior.revision === a.revision || !text(a.path) || !text(a.prior.path)
      || a.path === a.prior.path || !text(a.sourceRef) || !pages(a.sourcePages)
      || !accepted(a.status) || !record(v.originalInput) || !record(v.originalEvidence)
      || !isDeepStrictEqual(input, { revision: a.revision, path: a.path,
        targetId: target.id, field: "descriptionText", sourceKey: null })
      || !isDeepStrictEqual(evidence, { revision: a.revision, path: a.path,
        sourceRef: a.sourceRef, pages: a.sourcePages, status: a.status })
      || v.originalInput.revision !== a.prior.revision
      || v.originalInput.path !== a.prior.path) return fail();
    const prior = a.prior.acceptedRow;
    if (prior.targetId !== target.id || prior.rulebookId !== target.rulebookId
      || prior.sourceKey !== o.sourceKey) return fail();
    if (o.kind === "native") {
      if (!text(prior.descriptionHtml)) return fail();
    } else if (prior.field !== "descriptionText" || !text(prior.after)
      || !accepted(prior.status) || prior.status !== o.status
      || prior.sourceRef !== o.sourceRef || !isDeepStrictEqual(prior.sourcePages, o.sourcePages)) return fail();
    amendment = { kind: "accepted-body-amendment", acceptedRevision: a.revision,
      priorAcceptedRevision: a.prior.revision, status: a.status };
    input = v.originalInput; evidence = v.originalEvidence;
  } else if ("originalInput" in v || "originalEvidence" in v) return fail();
  if (!["native", "independent", "chm", "english"].includes(o.kind)
    || v.language !== (o.kind === "english" ? "en" : "zh")
    || !text(input.path) || input.targetId !== target.id) return fail();
  const acceptedField = field === "name" ? "name" : o.kind === "native" ? "descriptionHtml" : "descriptionText";
  if (o.kind === "native" || o.kind === "chm") {
    if (!text(o.sourceKey)) return fail();
  } else if (o.sourceKey !== null) return fail();
  if (o.kind === "native" || o.kind === "independent") {
    if (input.field !== acceptedField || input.sourceKey !== o.sourceKey) return fail();
    if (o.kind === "native") {
      if (!text(evidence.path) || evidence.targetId !== target.id || evidence.field !== acceptedField
        || evidence.sourceKey !== o.sourceKey) return fail();
    } else if (!text(o.sourceRef) || !pages(o.sourcePages)
      || !accepted(o.status)
      || evidence.sourceRef !== o.sourceRef || !isDeepStrictEqual(evidence.pages, o.sourcePages)) return fail();
  } else if (o.kind === "chm") {
    if (input.field !== `chinese.${field === "name" ? "name" : "descriptionText"}`
      || evidence.table !== "I18nSpellText" || evidence.spellId !== target.id
      || evidence.lang !== "zh" || evidence.variant !== "chm" || evidence.sourceKey !== o.sourceKey) return fail();
  } else if (input.field !== `english.${field === "name" ? "name" : "description"}`
    || evidence.table !== "dnd_spell" || evidence.id !== target.id
    || evidence.field !== (field === "name" ? "name" : "description")) return fail();
  return { schemaVersion: 1, language: v.language, acceptedRevision: v.acceptedRevision,
    ...(amendment ? { amendment } : {}),
    origin: o.kind === "native" || o.kind === "chm"
      ? { kind: o.kind, sourceKey: o.sourceKey } : { kind: o.kind, sourceKey: null } };
}
