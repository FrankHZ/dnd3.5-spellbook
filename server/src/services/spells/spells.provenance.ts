import { isDeepStrictEqual } from "node:util";
import type { SpellFieldProvenance } from "@dnd/contracts";
import { ApiError } from "#server/utils/errors";

const record = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const index = (v: unknown) => Number.isInteger(v) && Number(v) >= 0;
const revision = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
const sourceKey = (v: unknown): v is string => text(v) && !/[\\/\r\n]/.test(v);
const questionId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(v);
const accepted = (v: unknown) => v === "accepted" || v === "accepted-with-source-issues";
function pages(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0 && v.every(p => record(p) && text(p.sourceId)
    && index(p.pageIndex) && (p.printedPage === null || (index(p.printedPage) && p.printedPage > 0))
    && Array.isArray(p.spanRefs) && p.spanRefs.length > 0
    && p.spanRefs.every((span: unknown) => Array.isArray(span) && span.length === 3 && span.every(index)));
}

// The selected final writer contract is bound to these reviewed packages, not an arbitrary revision.
const finalRevision = "0688739d92a2aa9fb3eceeb444daa7260e711058";
const noteRevision = "c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4";
const coverageRevision = "a9cbe07747b1bc908ff4ebcd24244e38e58cb411";
const unionRevision = "296903c61e20ce359812148fc0faa234ca2508e7";
const missingRevision = "db04cc54684c8e63407341717cb9e00e883f1203";
const amendmentRevision = "6a73f4d64682325c67e2c40595008344fb5c3be5";
const residualRevision = "00e3c9836be40c878fafe74eb1ad0d915f6d4028";
const bookPath = "dice-qa/books/86/";
const rowRef = (v: unknown, path: string) => typeof v === "string"
  && v.startsWith(bookPath + path + ":") && /^[1-9][0-9]*$/.test(v.slice((bookPath + path + ":").length));

function finalAmendment(a: any, o: any, target: { id: number; rulebookId: number }, fail: () => never) {
  const prior = a?.prior;
  if (!record(a) || !record(prior) || !record(prior.acceptedRow)
    || !["native", "independent"].includes(o.kind) || prior.owner !== o.kind
    || prior.revision !== unionRevision
    || prior.path !== bookPath + `issue-329/${o.kind === "native" ? "native-accepted" : "independent-proposed-union"}.jsonl`
    || !text(a.sourceRef) || !pages(a.sourcePages) || !accepted(a.status)
    || !((a.revision === amendmentRevision && a.path === bookPath + "issue-335/validated-amendments.jsonl")
      || (target.id === 4736 && a.revision === residualRevision && a.path === bookPath + "issue-347/validated-amendments.jsonl"))) return fail();
  const original = prior.acceptedRow;
  if (original.targetId !== target.id || original.rulebookId !== target.rulebookId || original.sourceKey !== o.sourceKey) return fail();
  if (o.kind === "native") {
    if (!text(original.descriptionHtml)) return fail();
  } else if (original.field !== "descriptionText" || !text(original.after) || !text(original.proposedHtml)
    || !accepted(original.status) || original.status !== o.status || original.sourceRef !== o.sourceRef
    || !isDeepStrictEqual(original.sourcePages, o.sourcePages)
    || !record(original.input) || !record(original.input.english) || original.input.english.rulebookId !== target.rulebookId
    || !record(original.fullBodyAudit) || original.fullBodyAudit.effectiveText !== original.after
    || original.fullBodyAudit.effectiveHtml !== original.proposedHtml) return fail();
  let priorAmendment: NonNullable<SpellFieldProvenance["amendment"]>["priorAmendment"];
  if (a.revision === residualRevision) {
    const previous = prior.currentAmendment;
    const previousRow = previous?.acceptedRow;
    const review = previousRow?.review;
    if (!record(previous) || previous.revision !== amendmentRevision
      || previous.path !== bookPath + "issue-335/validated-amendments.jsonl"
      || !record(previousRow) || previousRow.targetId !== target.id || previousRow.rulebookId !== target.rulebookId
      || previousRow.field !== "descriptionText"
      || !isDeepStrictEqual(previousRow.prior, { owner: prior.owner, revision: prior.revision,
        path: prior.path, acceptedRow: original })
      || !record(review) || review.targetId !== target.id || review.rulebookId !== target.rulebookId
      || review.field !== "descriptionText" || review.sourceKey !== null || !text(review.after) || !text(review.proposedHtml)
      || !accepted(review.status) || !text(review.sourceRef) || !pages(review.sourcePages)
      || review.originalSourceRead !== true || !record(review.input) || !record(review.input.chinese)
      || !record(review.input.english) || review.input.english.rulebookId !== target.rulebookId
      || review.before !== review.input.chinese.descriptionText || !record(review.fullBodyAudit)
      || review.fullBodyAudit.beforeHtml !== review.input.chinese.descriptionHtml
      || review.fullBodyAudit.currentHtmlReviewed !== true || review.fullBodyAudit.proposedHtmlReviewed !== true
      || review.fullBodyAudit.effectiveText !== review.after || review.fullBodyAudit.effectiveHtml !== review.proposedHtml) return fail();
    priorAmendment = { acceptedRevision: previous.revision, status: review.status };
  } else if ("currentAmendment" in prior) return fail();
  return { kind: "accepted-body-amendment" as const, acceptedRevision: a.revision,
    priorAcceptedRevision: prior.revision, status: a.status as "accepted" | "accepted-with-source-issues",
    ...(priorAmendment ? { priorAmendment } : {}) };
}

function mapFinalProvenance(v: Record<string, any>, field: "name" | "body",
  target: { id: number; rulebookId: number }, bodyText: string | null | undefined,
  fail: () => never): SpellFieldProvenance {
  const o = v.origin, r = v.review;
  if (v.acceptedRevision !== finalRevision || target.rulebookId !== 86 || v.language !== "zh"
    || !["native", "independent", "chm"].includes(o.kind)
    || (o.kind === "independent" ? o.sourceKey !== null : !sourceKey(o.sourceKey))
    || "originalInput" in v || "originalEvidence" in v
    || !isDeepStrictEqual(v.input, { revision: finalRevision,
      path: bookPath + "issue-365/field-dispositions.jsonl", targetId: target.id, field })
    || !record(r) || !isDeepStrictEqual(v.evidence, r) || !pages(r.sourcePages)
    || ("sourceQuestionIds" in r && (!Array.isArray(r.sourceQuestionIds) || !r.sourceQuestionIds.every(questionId)))
    || !record(r.originalEntry) || r.originalEntry.revision !== coverageRevision
    || !/^dice-qa\/books\/86\/issue-259\/review-[abcd]\/joint-review-results\.jsonl:[1-9][0-9]*$/.test(r.originalEntry.rowRef)
    || !pages(r.originalEntry.sourcePages) || !["source-correct", "corrected", "unresolved"].includes(r.originalEntry.englishDisposition)) return fail();
  let amendment: SpellFieldProvenance["amendment"];
  if ("activeAmendment" in o || "activeAmendment" in r) {
    if (field !== "body" || !isDeepStrictEqual(o.activeAmendment, r.activeAmendment)
      || r.revision !== unionRevision || r.disposition !== o.activeAmendment?.status
      || !isDeepStrictEqual(r.sourcePages, o.activeAmendment?.sourcePages)) return fail();
    amendment = finalAmendment(o.activeAmendment, o, target, fail);
  }
  if (o.kind === "chm") {
    if (r.disposition !== "source-reviewed-retention" || r.revision !== coverageRevision
      || r.rowRef !== r.originalEntry.rowRef || r.priorDisposition !== "source-correct"
      || !isDeepStrictEqual(r.sourcePages, r.originalEntry.sourcePages)
      || "originalAcceptedPdfBinding" in r || "originalFullBodyAudit" in r || "sourceQuestionIds" in r
      || (field === "body" && (!text(r.htmlEvidence) || typeof r.priorReviewBoundHtml !== "boolean" || r.newVisualHtmlReview !== false))) return fail();
  } else {
    if (r.revision === unionRevision) {
      const binding = r.originalAcceptedPdfBinding;
      const ownerField = field === "name" ? "name" : o.kind === "native" ? "descriptionHtml" : "descriptionText";
      if (!rowRef(r.rowRef, `issue-329/${o.kind === "native" ? "native-accepted" : "independent-proposed-union"}.jsonl`)
        || !record(binding) || binding.revision !== unionRevision || binding.sourceKey !== o.sourceKey
        || binding.field !== ownerField || !pages(binding.sourcePages)
        || (!amendment && !isDeepStrictEqual(r.sourcePages, binding.sourcePages))) return fail();
    } else if (o.kind !== "independent" || amendment || "originalAcceptedPdfBinding" in r
      || !((r.revision === missingRevision && r.path === bookPath + "issue-343/independent-proposed.jsonl"
          && r.currentInputBinding === bookPath + "issue-365/missing-translations-rebound.jsonl")
        || (r.revision === residualRevision && r.path === bookPath + "issue-347/validated-proposals.jsonl"
          && !("currentInputBinding" in r)))) return fail();
    if (o.kind === "native") {
      if (r.revision !== unionRevision || (!amendment && (r.disposition !== "accepted-native-source-bound" || "sourceQuestionIds" in r))) return fail();
      if (field === "body" && (!record(r.originalFullBodyAudit) || r.originalFullBodyAudit.revision !== coverageRevision
        || !rowRef(r.originalFullBodyAudit.rowRef, "issue-259/fresh-qa/full-body-audit.jsonl"))) return fail();
    } else if (!text(o.sourceRef) || !pages(o.sourcePages) || !accepted(o.status)
      || (!amendment && (r.disposition !== o.status || !isDeepStrictEqual(r.sourcePages, o.sourcePages)))) return fail();
    if ((o.kind === "independent" || amendment) && (!Array.isArray(r.sourceQuestionIds)
      || !r.sourceQuestionIds.every(questionId) || new Set(r.sourceQuestionIds).size !== r.sourceQuestionIds.length
      || (r.disposition === "accepted-with-source-issues") !== (r.sourceQuestionIds.length > 0))) return fail();
  }
  let review: NonNullable<SpellFieldProvenance["review"]> = {disposition: r.disposition,
    acceptedRevision: r.revision, originalEntryReviewed: true, sourceQuestionIds: r.sourceQuestionIds ?? []};
  if ("sourceCorrection" in v) {
    const correction = v.sourceCorrection, prior = correction?.prior;
    if (field !== "body" || ![3930,4033,4349].includes(target.id) || "readerNoteAddendum" in v
      || !record(correction) || correction.targetId !== target.id
      || !(target.id === 3930 ? correction.revision === "ebc3a6615002de6dac1f1c4a636e19757d7b0c8f"
        && correction.acceptanceRevision === "5f05fad7df5256a9c3c998d3be77aac238445107" && correction.path === bookPath + "issue-461/candidate.json"
        : correction.revision === "996a41671f7cb61e9f7fa6cce48a912695694c7c"
        && correction.acceptanceRevision === "775005e96a5caa9a83bbf523f716946b2fe890a0" && correction.path === bookPath + "issue-467/candidate.json")
      || !record(prior) || prior.targetId !== target.id || prior.rulebookId !== 86 || prior.field !== "body"
      || "sourceCorrection" in prior || "readerNoteAddendum" in prior
      || !isDeepStrictEqual(prior.origin, o) || !isDeepStrictEqual(prior.review, r)
      || !text(prior.text) || !text(prior.html) || !text(bodyText)) return fail();
    let start = 0;
    while (start < bodyText.length && prior.text[start] === bodyText[start]) start++;
    const length = target.id === 3930 ? 29 : 17;
    const removed = prior.text.slice(start, start + length);
    if (target.id === 4349 ? prior.text.split("”相同").length !== 2 || bodyText !== prior.text.replace("”相同", "”（PH 217）相同")
      : [...removed].length !== length || /\s/.test(removed)
      || bodyText !== prior.text.slice(0, start) + prior.text.slice(start + length)) return fail();
    review = {...review, disposition: "accepted", acceptedRevision: correction.revision};
  }
  if ("readerNoteAddendum" in v) {
    const a = v.readerNoteAddendum, amendment = a?.amendment, prior = amendment?.prior;
    const before = prior?.acceptedRow, note = amendment?.review;
    const line = [4088, 4111, 4229].indexOf(target.id) + 1;
    if (field !== "body" || !line || !record(a) || a.revision !== noteRevision
      || a.path !== bookPath + "issue-407/amendments.jsonl" || a.rowRef !== a.path + ":" + line
      || !record(amendment) || amendment.targetId !== target.id || amendment.rulebookId !== 86
      || amendment.field !== "descriptionText" || !record(prior) || prior.revision !== finalRevision
      || prior.path !== v.input.path || prior.owner !== o.kind || !record(before)
      || before.targetId !== target.id || before.rulebookId !== 86 || before.field !== "body"
      || !isDeepStrictEqual(before.origin, o) || !isDeepStrictEqual(before.review, r)
      || !text(before.text) || !text(before.html) || !record(prior.nameRow)
      || prior.nameRow.targetId !== target.id || prior.nameRow.rulebookId !== 86 || prior.nameRow.field !== "name"
      || !record(note) || note.targetId !== target.id || note.rulebookId !== 86 || note.field !== "descriptionText"
      || note.status !== "accepted-with-source-issues" || !pages(note.sourcePages) || !text(note.sourceRef)
      || note.originalSourceRead !== true || note.before !== before.text || note.after !== bodyText
      || !text(note.after) || !note.after.startsWith(before.text + "\n\n原文疑义备注（本项目说明，非官方勘误）\n")
      || !record(note.input) || !record(note.input.chinese) || note.input.chinese.descriptionHtml !== before.html
      || !before.html.endsWith("</pre>") || note.proposedHtml !== before.html.slice(0, -6)
        + note.after.slice(before.text.length).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") + "</pre>"
      || !record(note.fullBodyAudit) || note.fullBodyAudit.beforeHtml !== before.html
      || note.fullBodyAudit.effectiveText !== note.after || note.fullBodyAudit.effectiveHtml !== note.proposedHtml
      || note.fullBodyAudit.currentHtmlReviewed !== true || note.fullBodyAudit.proposedHtmlReviewed !== true
      || !record(note.retainedSourceIssues) || note.retainedSourceIssues.bodyText !== before.text
      || !Array.isArray(note.retainedSourceIssues.issues) || note.retainedSourceIssues.issues.length !== 1
      || !note.retainedSourceIssues.issues.every((q: any) => record(q) && questionId(q.id)
        && q.id.startsWith(target.id + ":") && q.status === "source-unresolved")) return fail();
    review = {disposition: note.status, acceptedRevision: noteRevision, originalEntryReviewed: true,
      sourceQuestionIds: [...review.sourceQuestionIds, ...note.retainedSourceIssues.issues.map((q: any) => q.id)]};
  }
  return { schemaVersion: 1, language: "zh", acceptedRevision: finalRevision,
    origin: o.kind === "independent" ? { kind: "independent", sourceKey: null } : { kind: o.kind, sourceKey: o.sourceKey },
    review, ...(amendment ? { amendment } : {}) };
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
  if ("sourceCorrection" in v && v.acceptedRevision !== finalRevision) return fail();
  if (v.acceptedRevision === finalRevision || "review" in v) return mapFinalProvenance(v, field, target, row.descriptionText, fail);
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
    if (!sourceKey(o.sourceKey)) return fail();
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
