import assert from "node:assert/strict";
import {
  assertCloseoutSnapshot, assertRecoveredCandidate, independentAfter,
  putCloseoutField, requireCloseoutTarget,
} from "./closeout";
import { checkCloseoutArguments } from "./closeout-cli";
import type { CloseoutField, CloseoutTargetInput } from "./closeout-types";
import type { EnglishRecord, Review } from "./qa";
import type { Candidate } from "./reconcile";
import { assertCloseoutReference, closeoutReferenceFiles, validateCloseoutReferences } from "./closeout-references";
import type Database from "better-sqlite3";

const en: EnglishRecord = { name: "Fixture Ward", description: "The ward lasts one round.", rulebookId: 7, editionId: 5,
  mechanics: { school: "Abjuration", subschool: null, descriptors: [], components: { verbal: 1, somatic: 1,
    material: 0, arcaneFocus: 0, divineFocus: 0, xp: 0, metaBreath: 0, trueName: 0, corrupt: 0, extra: null },
  castingTime: "1 action", range: "Touch", target: null, effect: null, area: null, duration: "1 round",
  savingThrow: "None", spellResistance: "No", classLevels: [], domainLevels: [] } };
const chm = { spellId: 1, variant: "chm", name: "旧防护", descriptionText: "旧文", descriptionHtml: "<p>旧文</p>" };
assert(closeoutReferenceFiles.includes("inherited-inputs.jsonl"));
assertCloseoutReference(en, en, 20);
assert.throws(() => assertCloseoutReference(en, { ...en, description: "Inherited duration changed." }, 20), /reference English drift/);
assert.throws(() => assertCloseoutReference(en, { ...en, mechanics: { ...en.mechanics, duration: "2 rounds" } }, 20), /reference English drift/);
const inheritedFixture = { book: 94, path: "fixture", files: ["inherited-evidence.jsonl"],
  read: () => [{ targetIds: [1], reference: { id: 20, ...en } }],
  english: new Map([[20, en]]), rules: {} as Database.Database };
assert.equal(validateCloseoutReferences(inheritedFixture).checked, 1);
assert.throws(() => validateCloseoutReferences({ ...inheritedFixture,
  english: new Map([[20, { ...en, description: "Inherited source changed." }]]) }), /reference English drift/);
const target: CloseoutTargetInput = { targetId: 1, english: en, englishHtml: "<p>The ward lasts one round.</p>", chinese: [chm] };
const input = { targetId: 1, english: en, englishHtml: target.englishHtml, baselineName: chm.name,
  baselineBody: chm.descriptionText, baselineHtml: chm.descriptionHtml, chinese: [chm] };
assertCloseoutSnapshot(input, target);
assertCloseoutSnapshot(input, { ...target, chinese: [chm, { variant: "effective", name: "新防护" }] });
assert.throws(() => assertCloseoutSnapshot(input, { ...target, english: { ...en, description: "Changed mechanics." } }), /English input drift/);
assert.throws(() => assertCloseoutSnapshot(input, { ...target, english: { ...en, mechanics: { ...en.mechanics, duration: "2 rounds" } } }), /English input drift/);
assert.throws(() => assertCloseoutSnapshot(input, { ...target, englishHtml: "changed" }), /English HTML drift/);
assert.throws(() => assertCloseoutSnapshot(input, { ...target, chinese: [{ ...chm, name: "漂移" }] }), /CHM input drift/);
assert.throws(() => assertCloseoutSnapshot({ ...input, baselineName: "漂移" }, target), /CHM input drift/);

const proposal = { activation: false, proposedName: "防护", proposedDescriptionHtml: "<p>防护持续一轮。</p>" };
assert.equal(independentAfter(proposal).bodyAccepted, true);
assert.equal(independentAfter({ ...proposal, mechanicsStatus: "residual", bodyStatus: "complete-available-DB-English" }).bodyAccepted, true);
assert.equal(independentAfter({ ...proposal, sourceGap: true }).bodyAccepted, false);
assert.equal(independentAfter({ ...proposal, bodyStatus: "partial-or-ambiguous-DB-English" }).bodyAccepted, false);
assert.equal(independentAfter({ activation: false, fields: { name: { proposedText: "防护" }, body: {
  status: "reference-draft-with-material-residual", proposedDescriptionHtml: "<p>不完整。</p>", residualCodes: ["missing-table"] } } }).bodyAccepted, false);
assert.throws(() => independentAfter({ ...proposal, activation: true }), /unactivated/);
assert.throws(() => independentAfter({ ...proposal, fields: { body: { status: "queue:pending" } } }), /unreviewed/);

const targets = new Map([[1, { rulebookId: 7 }], [2, { rulebookId: 86 }], [3, { rulebookId: 6 }], [4, { rulebookId: 106 }]]);
for (const [id, book] of [[2, 86], [3, 6], [4, 106]]) assert.throws(() => requireCloseoutTarget(id!, book!, targets), /SC and suspended PHB/);
assert.throws(() => requireCloseoutTarget(2, 7, targets), /publication drift/);
const row: CloseoutField = { targetId: 1, rulebookId: 7, field: "name", before: "旧防护", after: "防护", language: "zh",
  authority: "recovered-db-english", provenance: { issue: 132, pr: 236, publicHead: "a".repeat(40), revision: "b".repeat(40),
    path: "dice-qa/books/7/decisions.jsonl", row: 1, sourceKey: "old:fixture.txt:1:1", historicalRevision: "c".repeat(40),
    historicalContinuityAuthenticated: false }, residuals: [] };
const output = new Map<string, CloseoutField>(); putCloseoutField(output, row, targets); putCloseoutField(output, row, targets);
assert.throws(() => putCloseoutField(output, { ...row, after: "另一版本" }, targets), /conflicting closeout owners/);
assert.throws(() => putCloseoutField(new Map(), { ...row, unexpected: true } as CloseoutField, targets), /unexpected closeout field/);
assert.throws(() => putCloseoutField(new Map(), { ...row, field: "summary" } as unknown as CloseoutField, targets), /unsupported/);
assert.throws(() => putCloseoutField(new Map(), { ...row, targetId: 2, rulebookId: 86 }, targets), /SC and suspended PHB/);

const source = { sourceKey: "old:fixture.txt:1:1", targetId: 1, rawHeader: "fixture", rawBody: "body",
  zhName: "防护", bodyText: "旧文", bodyHtml: "<p>旧文</p>", baselineName: "旧防护", baselineBody: "旧文" } as Candidate;
const current = { ...source, sourceKey: "recovered:fixture.txt:1:1" };
const review = { fields: { name: { status: "accepted" }, descriptionHtml: { status: "deferred" } } } as Review;
assertRecoveredCandidate(source, current, review);
assert.throws(() => assertRecoveredCandidate(source, { ...current, rawBody: "changed" }, review), /source or CHM drift/);
assert.throws(() => assertRecoveredCandidate(source, { ...current, targetId: 2 }, review), /identity changed/);
assert.throws(() => assertRecoveredCandidate(source, undefined, review), /occurrence missing/);
assertRecoveredCandidate({ ...source, targetId: null }, { ...current, targetId: 2 },
  { fields: { name: { status: "excluded" }, descriptionHtml: { status: "excluded" } } } as Review);
checkCloseoutArguments(["--data-root", "data", "--rules-db", "rules", "--content-db", "content", "--report-dir", "output"]);
assert.throws(() => checkCloseoutArguments(["--apply", "true"]), /unknown/);
assert.throws(() => checkCloseoutArguments([]), /explicit/);
assert.throws(() => checkCloseoutArguments(["--data-root", "data", "--data-root", "other"]), /repeated/);
console.log("PASS: closeout SC/PHB exclusion, field ownership, restored-source identity, complete English/CHM locks, residual boundaries and read-only CLI");
