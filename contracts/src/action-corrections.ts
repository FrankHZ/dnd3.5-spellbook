/** Fixed local-clause acceptance; never whole-body or original-book acceptance. */
export const ACTION_CORRECTION_REVISION = "f20065908448ad3835f34dc5401616a9c189b4d4";
export const ACTION_CORRECTION_ACCEPTANCE = {issue: 626, comment: 6070943393} as const;
export const ACTION_CORRECTION_TARGETS = [
  {id: 84, book: 52, operation: "update", proposals: ["84-creation", "84-force", "84-free-action", "84-upper-bound"]},
  {id: 523, book: 55, operation: "update", proposals: ["523-terminology"]},
  {id: 2165, book: 79, operation: "update", proposals: ["2165-terminology"]},
  {id: 2474, book: 6, operation: "insert", proposals: ["2474-terminology"]},
] as const;
export const ACTION_CORRECTION_NOTE = {
  schema: "action-clause-corrections.v1", acceptedRevision: ACTION_CORRECTION_REVISION,
  acceptance: ACTION_CORRECTION_ACCEPTANCE, targets: ACTION_CORRECTION_TARGETS,
  authority: "DB-English-clauses", wholeBodyReviewed: false,
  search: "rebuild-after-overlay", activation: false,
} as const;
