import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type Database from "better-sqlite3";

export const acceptedClassSourceRevision =
  "efe2083c0f5049aabce561517f3f02b9901ba07b";
export const classSourceScope =
  "website-eligible-dnd35-69-classes-84-version-leads";
export type ClassSourceRow = {
  variantId: number;
  classId: number;
  rulebookId: number;
  name: string;
  slug: string;
  prestige: number;
  listKind: string;
  disposition: string;
  relation: string | null;
  evidenceJson: string;
};
export type ClassSourceHandoff = {
  revision: string;
  sourceRevision: string;
  rows: ClassSourceRow[];
};
type SourceRow = {
  id: number;
  character_class_id: number;
  rulebook_id: number;
  page: number | null;
  key: string;
  className: string;
  edition: string;
  sourceRevision: string;
  proposal?: { relation: string };
};
type SourceClass = {
  id: number;
  name: string;
  slug: string;
  prestige: number;
  listKind: string;
  versionKeys: string[];
  supportedVersionKeys: string[];
  excludedVersionKeys: string[];
  uncertainVersionKeys: string[];
};

/** Consume the fixed accepted Git handoff; dirty/stale projections grant no authority. */
export function loadAcceptedClassSources(
  dataRoot: string,
  rules: Database.Database,
): ClassSourceHandoff {
  assert(
    rules.readonly,
    "Accepted handoff validation requires readonly rules access",
  );
  const read = <T>(name: string): T => {
    const file = `class-sources/issue-619/${name}.json`;
    const committed = execFileSync("git", [
      "-C",
      dataRoot,
      "show",
      `${acceptedClassSourceRevision}:${file}`,
    ]);
    // Git's Windows checkout may use CRLF; acceptance still binds the Git text.
    assert.equal(
      fs.readFileSync(path.join(dataRoot, file), "utf8").replace(/\r\n/g, "\n"),
      committed.toString("utf8").replace(/\r\n/g, "\n"),
      `Changed accepted input: ${file}`,
    );
    return JSON.parse(committed.toString("utf8")) as T;
  };
  const meta = read<{
    sourceRevision: string;
    counts: { classesInvestigated: number; versionsInvestigated: number };
  }>("final-handoff");
  const classes = read<SourceClass[]>("final-classes");
  assert.equal(classes.length, 69);
  assert.equal(meta.counts.classesInvestigated, 69);
  assert.equal(meta.counts.versionsInvestigated, 84);
  const byClass = new Map(classes.map((row) => [row.id, row]));
  assert.equal(byClass.size, 69);
  const groups = [
    ["supported", "final-supported-relationships", 64, "supportedVersionKeys"],
    ["excluded", "final-excluded-relationships", 11, "excludedVersionKeys"],
    ["source-uncertain", "final-source-uncertain", 9, "uncertainVersionKeys"],
  ] as const;
  const rows: ClassSourceRow[] = [];
  const seen = new Set<string>();
  const variant =
    rules.prepare(`SELECT v.id, v.character_class_id, v.rulebook_id, v.page,
    c.name AS className, c.slug, c.prestige, e.system AS edition FROM dnd_characterclassvariant v
    JOIN dnd_characterclass c ON c.id=v.character_class_id
    JOIN dnd_rulebook b ON b.id=v.rulebook_id JOIN dnd_dndedition e ON e.id=b.dnd_edition_id WHERE v.id=?`);
  for (const [disposition, file, count, classKeys] of groups) {
    const sources = read<SourceRow[]>(file);
    assert.equal(sources.length, count);
    for (const source of sources) {
      const owner = byClass.get(source.character_class_id);
      assert(
        owner && owner[classKeys].includes(source.key),
        "Missing class disposition binding",
      );
      assert.equal(
        source.key,
        `${source.rulebook_id}:${source.character_class_id}:${source.id}`,
      );
      assert(!seen.has(source.key), "Duplicate version key");
      seen.add(source.key);
      assert.equal(source.sourceRevision, meta.sourceRevision);
      assert.equal(source.edition, "DnD 3.5");
      const current = variant.get(source.id) as
        (SourceRow & { slug: string; prestige: number }) | undefined;
      assert(current, "Missing live class version");
      for (const field of [
        "id",
        "character_class_id",
        "rulebook_id",
        "page",
        "className",
        "edition",
      ] as const)
        assert.equal(
          current[field],
          source[field],
          `Stale version ${source.key}: ${field}`,
        );
      assert.equal(current.className, owner.name);
      assert.equal(current.slug, owner.slug);
      assert.equal(current.prestige, owner.prestige);
      assert(["spells", "maneuvers", "infusions"].includes(owner.listKind));
      const relation =
        disposition === "supported" ? source.proposal?.relation : null;
      assert(
        disposition !== "supported" ||
          relation === "class-entry" ||
          relation === "variant",
      );
      rows.push({
        variantId: source.id,
        classId: owner.id,
        rulebookId: source.rulebook_id,
        name: owner.name,
        slug: owner.slug,
        prestige: owner.prestige,
        listKind: owner.listKind,
        disposition,
        relation: relation ?? null,
        evidenceJson: JSON.stringify(source),
      });
    }
  }
  assert.deepEqual(
    [...seen].sort(),
    classes.flatMap((row) => row.versionKeys).sort(),
  );
  const currentKeys = rules
    .prepare(
      `SELECT v.rulebook_id || ':' || v.character_class_id || ':' || v.id AS key
    FROM dnd_characterclassvariant v JOIN dnd_rulebook b ON b.id=v.rulebook_id
    JOIN dnd_dndedition e ON e.id=b.dnd_edition_id
    WHERE e.system='DnD 3.5' AND v.character_class_id IN (${classes.map(() => "?").join(",")})`,
    )
    .all(...classes.map((row) => row.id)) as { key: string }[];
  assert.deepEqual(
    currentKeys.map((row) => row.key).sort(),
    [...seen].sort(),
    "Frozen candidate versions changed",
  );
  return {
    revision: acceptedClassSourceRevision,
    sourceRevision: meta.sourceRevision,
    rows: rows.sort((a, b) => a.variantId - b.variantId),
  };
}

/** Additive overlay; owns only these two tables. Never rewrites canonical builds/spells. */
export function importClassSources(
  db: Database.Database,
  handoff: ClassSourceHandoff,
  apply = false,
) {
  assert.equal(
    handoff.revision,
    acceptedClassSourceRevision,
    "Unaccepted handoff revision",
  );
  const inspect = () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ClassSourceImport','ClassSourceMapping')",
      )
      .all();
    assert(
      tables.length === 0 || tables.length === 2,
      "Partial class-source schema",
    );
    if (!tables.length) {
      assert(!apply, "Apply requires the maintained content migration first");
      return false;
    }
    const imports = db.prepare("SELECT * FROM ClassSourceImport").all();
    const rows = db
      .prepare("SELECT * FROM ClassSourceMapping ORDER BY variantId")
      .all();
    if (!imports.length) {
      assert.equal(rows.length, 0, "Unbound source rows");
      return false;
    }
    assert.deepEqual(
      imports,
      [
        {
          id: 1,
          handoffRevision: handoff.revision,
          sourceRevision: handoff.sourceRevision,
          scope: classSourceScope,
        },
      ],
      "Existing handoff differs; explicit reviewed upgrade required",
    );
    assert.deepEqual(
      rows,
      handoff.rows,
      "Persisted class-source state differs",
    );
    return true;
  };
  let after = inspect();
  if (apply && !after) {
    assert(!db.inTransaction, "Importer owns its transaction");
    db.transaction(() => {
      assert(!inspect(), "Source state changed before write");
      const columns =
        "variantId classId rulebookId name slug prestige listKind disposition relation evidenceJson".split(
          " ",
        );
      const insert = db.prepare(
        `INSERT INTO ClassSourceMapping (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
      );
      for (const row of handoff.rows)
        insert.run(...columns.map((key) => row[key as keyof ClassSourceRow]));
      db.prepare("INSERT INTO ClassSourceImport VALUES (1,?,?,?)").run(
        handoff.revision,
        handoff.sourceRevision,
        classSourceScope,
      );
      assert(inspect());
    }).immediate();
    after = true;
    return {
      state: "after",
      changed: true,
      wouldChange: false,
      rows: handoff.rows.length,
    };
  }
  return {
    state: after ? "after" : "before",
    changed: false,
    wouldChange: !after,
    rows: handoff.rows.length,
  };
}
