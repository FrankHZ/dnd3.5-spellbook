/** Fixed coordinator-accepted DB-English local saving clauses; activation remains separate. */
export const SAVE_CORRECTION_INPUTS = [
  {issue:641,revision:"bba02ad6aead7609682588e1a193cb8160681c48",path:"term-qa/issue-641/proposals.jsonl",comment:6093788149},
  {issue:643,revision:"c66684fdb3b87d92e92081a0974e88c81f25a5e1",path:"term-qa/issue-643/revision-02/proposals.jsonl",comment:6093938297},
] as const;
export const SAVE_CORRECTION_REVISION = SAVE_CORRECTION_INPUTS[0].revision;
export const SAVE_CORRECTION_TARGETS = [
  {"id":2717,"book":6,"operation":"insert","proposals":["643-2717-1"],"issue":643,"origin":"chm","authority":null},
  {"id":2985,"book":80,"operation":"update","proposals":["643-2985-1","643-2985-2"],"issue":643,"origin":"native","authority":"recovered-db-english"},
  {"id":3250,"book":24,"operation":"update","proposals":["643-3250-1","643-3250-2"],"issue":643,"origin":"native","authority":"recovered-db-english"},
  {"id":3289,"book":25,"operation":"update","proposals":["643-3289-1"],"issue":643,"origin":"native","authority":"recovered-db-english"},
  {"id":3465,"book":33,"operation":"update","proposals":["643-3465-1"],"issue":643,"origin":"native","authority":"recovered-db-english"},
  {"id":3484,"book":34,"operation":"update","proposals":["643-3484-1","643-3484-2"],"issue":643,"origin":"native","authority":"recovered-db-english"},
  {"id":3492,"book":34,"operation":"update","proposals":["641-3492-1","641-3492-2"],"issue":641,"origin":"native","authority":"recovered-db-english"},
  {"id":3606,"book":88,"operation":"insert","proposals":["643-3606-1","643-3606-2","643-3606-3"],"issue":643,"origin":"chm","authority":null},
  {"id":4915,"book":12,"operation":"update","proposals":["641-4915-1"],"issue":641,"origin":"native","authority":"recovered-db-english"},
] as const;
export const SAVE_CORRECTION_NOTE = {
  schema:"save-clause-corrections.v1",acceptedRevision:SAVE_CORRECTION_REVISION,
  inputs:SAVE_CORRECTION_INPUTS,targets:SAVE_CORRECTION_TARGETS,prerequisite:"actionClauseRollout",
  authority:"DB-English-clauses",wholeBodyReviewed:false,search:"rebuild-after-overlay",activation:false,
} as const;
