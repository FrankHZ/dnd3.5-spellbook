import {mapFieldProvenance} from "#server/services/spells/spells.provenance";
const final = "0688739d92a2aa9fb3eceeb444daa7260e711058";
const source = "ebc3a6615002de6dac1f1c4a636e19757d7b0c8f";
const coverage = "a9cbe07747b1bc908ff4ebcd24244e38e58cb411";
const pages = [{sourceId: "synthetic", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]]}];
function fixture() {
  const origin = {kind: "chm", sourceKey: "synthetic"};
  const originalEntry = {revision: coverage, rowRef: "dice-qa/books/86/issue-259/review-a/joint-review-results.jsonl:1",
    sourcePages: pages, englishDisposition: "source-correct"};
  const review = {disposition: "source-reviewed-retention", revision: coverage, rowRef: originalEntry.rowRef,
    sourcePages: pages, priorDisposition: "source-correct", originalEntry, htmlEvidence: "synthetic parity",
    priorReviewBoundHtml: false, newVisualHtmlReview: false};
  const prior = {targetId: 3930, rulebookId: 86, field: "body", origin, review,
    text: "目标保留\n\n" + "合".repeat(29) + "\n\n材料保留", html: "<pre>synthetic</pre>"};
  const envelope = {schemaVersion: 1, acceptedRevision: final, targetId: 3930, field: "body", language: "zh", origin,
    input: {revision: final, path: "dice-qa/books/86/issue-365/field-dispositions.jsonl", targetId: 3930, field: "body"},
    evidence: review, review, sourceCorrection: {revision: source, acceptanceRevision: "5f05fad7df5256a9c3c998d3be77aac238445107", path: "dice-qa/books/86/issue-461/candidate.json", targetId: 3930, prior}};
  const row = {spellId: 3930, rulebookId: 86, lang: "zh", name: "合成名", descriptionText: "目标保留\n\n\n\n材料保留"};
  return {envelope, row};
}
function map(v: ReturnType<typeof fixture>) {
  return mapFieldProvenance(JSON.stringify(v.envelope), "body", v.row, {id: 3930, rulebookId: 86});
}
describe("bounded source correction provenance", () => {
  it("maps only the two fixed source-fidelity body corrections", () => {
    const candidate = "996a41671f7cb61e9f7fa6cce48a912695694c7c";
    for (const id of [4033, 4349]) {
      const value = fixture();
      value.envelope.targetId = value.envelope.input.targetId = value.envelope.sourceCorrection.targetId = value.envelope.sourceCorrection.prior.targetId = value.row.spellId = id;
      const correction = value.envelope.sourceCorrection;
      correction.revision = candidate;
      correction.acceptanceRevision = "775005e96a5caa9a83bbf523f716946b2fe890a0";
      correction.path = "dice-qa/books/86/issue-467/candidate.json";
      correction.prior.text = id === 4033 ? "目标" + "合".repeat(17) + "保留" : "与“合成”相同";
      value.row.descriptionText = id === 4033 ? "目标保留" : "与“合成”（PH 217）相同";
      const run = (v = value) => mapFieldProvenance(JSON.stringify(v.envelope), "body", v.row, {id, rulebookId: 86});
      expect(run().review?.acceptedRevision).toBe(candidate);
      for (const mutate of [
        (v: typeof value) => {v.row.descriptionText += "forged";},
        (v: typeof value) => {v.envelope.sourceCorrection.acceptanceRevision = final;},
        (v: typeof value) => {v.envelope.sourceCorrection.path += "forged";},
        (v: typeof value) => {v.envelope.sourceCorrection.prior.review.originalEntry.englishDisposition = "forged";},
      ]) {const wrong = structuredClone(value); mutate(wrong); expect(() => run(wrong)).toThrow();}
      expect(JSON.stringify(run())).not.toContain("dice-qa/");
      expect(() => mapFieldProvenance(JSON.stringify(value.envelope), "body", value.row, {id: 4247, rulebookId: 86})).toThrow();
    }
  });
  it("reports accepted correction review while preserving original ownership", () => {
    const result = map(fixture());
    expect(result.review).toEqual({disposition: "accepted", acceptedRevision: source, originalEntryReviewed: true, sourceQuestionIds: []});
    expect(result.origin).toEqual({kind: "chm", sourceKey: "synthetic"});
    for (const privateValue of ["dice-qa/", "sourceCorrection", "prior", "sourcePages", "材料保留"]) expect(JSON.stringify(result)).not.toContain(privateValue);
  });
  it("rejects a stale pair, wrong authority, wrong target or altered original envelope", () => {
    const name = fixture();
    expect(() => mapFieldProvenance(JSON.stringify({...name.envelope, field: "name"}), "name", name.row, {id: 3930, rulebookId: 86})).toThrow();
    const wrongTarget = fixture();
    expect(() => mapFieldProvenance(JSON.stringify(wrongTarget.envelope), "body", wrongTarget.row, {id: 3934, rulebookId: 86})).toThrow();
    for (const mutate of [
      (v: ReturnType<typeof fixture>) => {v.row.descriptionText += "forged";},
      (v: ReturnType<typeof fixture>) => {v.envelope.acceptedRevision = coverage;},
      (v: ReturnType<typeof fixture>) => {v.envelope.sourceCorrection.revision = final;},
      (v: ReturnType<typeof fixture>) => {v.envelope.sourceCorrection.acceptanceRevision = final;},
      (v: ReturnType<typeof fixture>) => {v.envelope.sourceCorrection.targetId = 3934;},
      (v: ReturnType<typeof fixture>) => {v.envelope.sourceCorrection.path += "forged";},
      (v: ReturnType<typeof fixture>) => {v.envelope.sourceCorrection.prior.text += "stale";},
      (v: ReturnType<typeof fixture>) => {v.envelope.sourceCorrection.prior.origin = {kind: "chm", sourceKey: "forged"};},
      (v: ReturnType<typeof fixture>) => {v.row.descriptionText = v.envelope.sourceCorrection.prior.text;},
    ]) {const wrong = structuredClone(fixture()); mutate(wrong); expect(() => map(wrong)).toThrow("Invalid effective spell provenance");}
  });
});
