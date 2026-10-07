import assert from "node:assert/strict";
import { isDeepStrictEqual as equal } from "node:util";
import type Database from "better-sqlite3";
import type { EnglishRecord } from "./qa";
import comparisonContext from "./closeout-reference-context.json";

type Row = Record<string, any>;
// Fixed historical formats, not a recursive evidence discovery mechanism.
export const closeoutReferenceFiles = ["inherited-inputs.jsonl", "inherited-evidence.json",
  "inherited-evidence.jsonl", "inherited-all.json", "reference-evidence.json",
  "reference-evidence.jsonl", "other-reference-evidence.jsonl", "reference-context.json",
  "reference-applicability.jsonl", "input-evidence.jsonl", "input-a.jsonl", "input-b.jsonl",
  "input-c.jsonl", "input-owner.jsonl"];
const snapshotFiles = new Set(["inherited-evidence.json", "inherited-evidence.jsonl",
  "reference-evidence.json", "reference-evidence.jsonl", "other-reference-evidence.jsonl"]);
const rawKeys = ["id", "rulebook_id", "name", "school_id", "sub_school_id", "verbal_component",
  "somatic_component", "material_component", "arcane_focus_component", "divine_focus_component",
  "xp_component", "casting_time", "range", "target", "effect", "area", "duration", "saving_throw",
  "spell_resistance", "description", "description_html", "meta_breath_component", "true_name_component",
  "extra_components", "corrupt_component", "corrupt_level"];

export function assertCloseoutReference(expected: EnglishRecord, current: EnglishRecord | undefined, id: number) {
  assert(equal(expected, current), `inherited/reference English drift: ${id}`);
}

/** All files are already bound to the owner's accepted commit. Broad query
 * results and prior-review inputs remain historical context; the specific
 * inherited/reference evidence supplies the current-input checks. */
export function validateCloseoutReferences(options: {
  book: number; path: string; files: string[]; read: (file: string) => unknown;
  english: Map<number, EnglishRecord>; rules: Database.Database;
}) {
  const { book, path, files, read, english, rules } = options;
  let checked = 0;
  const historicalComparisons = comparisonContext.filter(item => item.book === book
    && files.some(file => item.path === `${path}/${file}`)).length;
  for (const file of files.filter(file => snapshotFiles.has(file))) {
    const input = read(file) as any;
    const records: Row[] = Array.isArray(input) ? input : input.rows;
    assert(Array.isArray(records), `unsupported reference evidence: ${path}/${file}`);
    for (const [index, record] of records.entries()) {
      const row = Array.isArray(record) ? { id: record[0], ...record[1] } : record.reference ?? record;
      const id = row.referenceTargetId ?? row.baseTargetId ?? row.id ?? row.targetId;
      const comparison = comparisonContext.find(item => item.book === book && item.path === `${path}/${file}`
        && item.row === index + 1 && item.id === id);
      if (comparison) {
        // The original accepted decision explicitly rejected this later SC
        // version as authority (or withheld the body). It is not a live input.
        assert(english.get(id)?.rulebookId === 86, "historical comparison identity drift");
        continue;
      }
      const expected = row.english ?? (row.mechanics && typeof row.description === "string"
        ? Object.fromEntries(["name", "rulebookId", "editionId", "description", "mechanics"].map(key => [key, row[key]])) : null);
      if (expected) assertCloseoutReference(expected, english.get(id), id);
      else if (row.raw || row.rulebook_id) {
        const prior = row.raw ?? row;
        const current = rules.prepare("SELECT * FROM dnd_spell WHERE id=?").get(prior.id) as Row | undefined;
        assert(current, `missing raw reference: ${prior.id}`);
        for (const key of rawKeys.filter(key => Object.hasOwn(prior, key)))
          assert(equal(prior[key], current[key]), `raw reference drift: ${prior.id}:${key}`);
      } else if (row.table) {
        // Only these original non-spell reference tables occur in the receipts.
        assert(["dnd_item", "dnd_feat", "dnd_characterclass"].includes(row.table), "unsupported reference table");
        const current = rules.prepare(`SELECT * FROM ${row.table} WHERE id=?`).get(row.id) as Row | undefined;
        assert(current && Object.entries(row.rawRecord).every(([key, value]) => equal(value, current[key])),
          `other reference drift: ${row.table}:${row.id}`);
      } else assert.fail(`unsupported reference snapshot: ${path}/${file}:${index + 1}`);
      checked++;
    }
  }
  return { checked, historicalComparisons };
}
