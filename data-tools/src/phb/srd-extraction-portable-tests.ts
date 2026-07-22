import assert from "node:assert/strict";

import {
  parseSpellParagraphs,
  parseSummaryParagraphs,
  rtfParagraphs,
} from "./srd-extraction";

const member = { name: "SpellsA-B.rtf", sha256: "a".repeat(64) };
const parsed = parseSpellParagraphs(
  [
    { index: 0, text: "SPELLS (A-B)" },
    { index: 1, text: "" },
    { index: 2, text: "Acid Arrow" },
    { index: 3, text: "Conjuration (Creation) [Acid]" },
    { index: 4, text: "Level: Sor/Wiz 2" },
    { index: 5, text: "Components: V, S, M, F" },
    { index: 6, text: "Casting Time: 1 standard action" },
    { index: 7, text: "Range: Long" },
    { index: 8, text: "Effect: One arrow" },
    { index: 9, text: "Duration: 1 round" },
    { index: 10, text: "Saving Throw: None" },
    { index: 11, text: "Spell Resistance: No" },
    { index: 12, text: "An arrow springs from your hand." },
  ],
  member,
);
assert.equal(parsed.spells.length, 1);
assert.equal(parsed.spells[0]?.printedName, "Acid Arrow");
assert.equal(parsed.spells[0]?.fields.castingTime, "1 standard action");
assert.equal(parsed.spells[0]?.bodyText, "An arrow springs from your hand.");
assert.deepEqual(parsed.spells[0]?.bodyBlocks, [
  { kind: "paragraph", text: "An arrow springs from your hand." },
]);
assert.deepEqual(parsed.issues, []);

const summaries = parseSummaryParagraphs(
  [
    { index: 0, text: "BARD SPELLS" },
    { index: 1, text: "1ST-LEVEL BARD SPELLS" },
    { index: 2, text: "Identify M: Determines properties of magic item." },
  ],
  { name: "SpellListI.rtf", sha256: "b".repeat(64) },
);
assert.equal(summaries.summaries[0]?.printedName, "Identify");
assert.equal(summaries.summaries[0]?.listOwner, "Bard");
assert.equal(summaries.summaries[0]?.level, 1);

const tableSpell = parseSpellParagraphs(
  [
    { index: 0, text: "Summon Example" },
    { index: 1, text: "Conjuration (Summoning)" },
    { index: 2, text: "Level: Sor/Wiz 1" },
    { index: 3, text: "\ue000Creature\ue001Alignment\ue001\ue002" },
  ],
  member,
).spells[0];
assert.deepEqual(tableSpell?.bodyBlocks, [
  { kind: "table-row", cells: ["Creature", "Alignment", ""] },
]);
assert.deepEqual(tableSpell?.reviewFlags, ["table-structure"]);

void rtfParagraphs(
  Buffer.from(
    "{\\rtf1\\ansi Acid fog\\rquote s vapor\\emdash test.\\par}",
    "latin1",
  ),
).then((paragraphs) => {
  assert.equal(paragraphs[0]?.text, "Acid fog’s vapor—test.");
  console.log("PHB SRD extraction portable tests passed");
});
