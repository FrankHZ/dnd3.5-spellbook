import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type Database from "better-sqlite3";

export const previousClassSourceRevision =
  "efe2083c0f5049aabce561517f3f02b9901ba07b";
export const acceptedClassSourceRevision =
  "c9d87c0395db76b9596fba9648566fd79a4eacf3";
export const classSourceEvidenceRevision =
  "3df7edb72b19a57fb9e4a7c897ebf4745bd03465";
const chmRevision = "7aed6890d88a6472f5fe9a857050a3823bdbf8ca";
const acceptance =
  "https://github.com/FrankHZ/dnd3.5-spellbook/issues/632#issuecomment-6217702823";
const promotions = new Map([
  ["109:860:974", "class-entry"],
  ["109:863:977", "class-entry"],
  ["109:865:979", "class-entry"],
  ["75:18:76", "reprint"],
  ["75:16:79", "reprint"],
]);
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
type StoredHandoff = {
  readonly revision: string;
  readonly sourceRevision: string;
  readonly rows: readonly Readonly<ClassSourceRow>[];
};
export type ClassSourceHandoff = StoredHandoff & {
  readonly previous: StoredHandoff;
};
// A revision label alone cannot authorize arbitrary caller-supplied rows. Only
// this loader can mint an immutable handoff after fixed Git/identity validation.
const authenticated = new WeakSet<ClassSourceHandoff>();
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
  const read = <T>(file: string, revision = previousClassSourceRevision): T => {
    const committed = execFileSync("git", [
      "-C",
      dataRoot,
      "show",
      `${revision}:${file}`,
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
  }>("class-sources/issue-619/final-handoff.json");
  const classes = read<SourceClass[]>("class-sources/issue-619/final-classes.json");
  assert.equal(meta.sourceRevision, chmRevision);
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
    const sources = read<SourceRow[]>(`class-sources/issue-619/${file}.json`);
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
  const previous: StoredHandoff = Object.freeze({
    revision: previousClassSourceRevision,
    sourceRevision: meta.sourceRevision,
    rows: Object.freeze(
      rows.sort((a, b) => a.variantId - b.variantId).map((row) => Object.freeze(row)),
    ),
  });
  type Decision = Omit<SourceRow, "sourceRevision"> & {
    proposedStatus: string;
    relation: string;
    evidenceLocators: string[];
    priorAuthoritativeEvidence: unknown;
    editionSourceId?: string;
  };
  type Delta = {
    baselineCommit: string;
    evidenceCommit: string;
    priorChmRevision: string;
    rows: Decision[];
  };
  const decisions = read<Delta>(
    "class-sources/issue-632/proposed-dispositions.json",
    acceptedClassSourceRevision,
  );
  const delta = read<Delta>(
    "class-sources/issue-632/proposed-support-delta.json",
    acceptedClassSourceRevision,
  );
  for (const input of [decisions, delta]) {
    assert.equal(input.baselineCommit, previousClassSourceRevision);
    assert.equal(input.evidenceCommit, classSourceEvidenceRevision);
    assert.equal(input.priorChmRevision, chmRevision);
  }
  const uncertain = previous.rows.filter(
    (row) => row.disposition === "source-uncertain",
  );
  assert.deepEqual(
    decisions.rows.map((row) => row.key).sort(),
    uncertain.map((row) => `${row.rulebookId}:${row.classId}:${row.variantId}`).sort(),
  );
  assert.deepEqual(
    delta.rows,
    decisions.rows.filter((row) => row.proposedStatus === "supported"),
  );
  assert.deepEqual(
    delta.rows.map((row) => row.key).sort(),
    [...promotions.keys()].sort(),
  );
  type CatalogSource = { id: string; locators?: { id: string }[] };
  const sources = read<CatalogSource[]>(
    "class-sources/issue-632/sources.json",
    classSourceEvidenceRevision,
  );
  const upgraded = new Map<number, ClassSourceRow>();
  for (const decision of decisions.rows) {
    const prior = uncertain.find((row) => row.variantId === decision.id);
    assert(prior, "Delta version not in previous uncertainty set");
    const old = JSON.parse(prior.evidenceJson) as SourceRow & {
      authoritativeEvidence: unknown;
    };
    for (const field of [
      "key", "id", "character_class_id", "rulebook_id", "page", "className", "edition",
    ] as const)
      assert.deepEqual(
        decision[field], old[field], `Delta identity changed: ${field}`,
      );
    assert.deepEqual(
      decision.priorAuthoritativeEvidence, old.authoritativeEvidence,
    );
    if (!promotions.has(decision.key)) {
      assert.equal(decision.proposedStatus, "unknown");
      continue;
    }
    assert.equal(decision.proposedStatus, "supported");
    assert.equal(decision.relation, promotions.get(decision.key));
    assert(decision.evidenceLocators.length > 0);
    for (const locator of decision.evidenceLocators)
      assert(
        sources.some((source) => source.locators?.some((entry) => entry.id === locator)),
        "Unknown external locator",
      );
    const selectedSources = sources.filter(
      (source) => source.id === decision.editionSourceId ||
        source.locators?.some((entry) => decision.evidenceLocators.includes(entry.id)),
    );
    upgraded.set(prior.variantId, {
      ...prior,
      disposition: "supported",
      relation: decision.relation,
      evidenceJson: JSON.stringify({
        authority: "accepted-external-publisher-evidence",
        acceptance,
        decisionRevision: acceptedClassSourceRevision,
        evidenceRevision: classSourceEvidenceRevision,
        previous: old,
        decision,
        sources: selectedSources,
      }),
    });
  }
  const nextRows = previous.rows.map((row) => upgraded.get(row.variantId) ?? row);
  assert.equal(nextRows.filter((row) => row.disposition === "supported").length, 69);
  assert.equal(
    new Set(nextRows.filter((row) => row.disposition === "supported").map((row) => row.classId)).size,
    65,
  );
  const handoff: ClassSourceHandoff = Object.freeze({
    revision: acceptedClassSourceRevision,
    // Import metadata names both authorities. External evidence is never labeled CHM.
    sourceRevision: JSON.stringify({
      chm: chmRevision, externalPublisher: classSourceEvidenceRevision, acceptance,
    }),
    previous,
    rows: Object.freeze(nextRows.map((row) => Object.freeze(row))),
  });
  authenticated.add(handoff);
  return handoff;
}

/** Owns only the fixed mapping overlay and its acceptance metadata. */
export function importClassSources(
  db: Database.Database,
  handoff: ClassSourceHandoff,
  apply = false,
) {
  assert.equal(
    handoff.revision, acceptedClassSourceRevision,
    "Unaccepted handoff revision; downgrade forbidden",
  );
  assert(
    authenticated.has(handoff), "Require the authenticated immutable handoff loader",
  );
  const inspect = (): "empty" | "previous" | "after" => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ClassSourceImport','ClassSourceMapping')",
    ).all();
    assert(tables.length === 0 || tables.length === 2, "Partial class-source schema");
    if (!tables.length) {
      assert(!apply, "Apply requires the maintained content migration first");
      return "empty";
    }
    const imports = db.prepare("SELECT * FROM ClassSourceImport").all();
    const rows = db.prepare("SELECT * FROM ClassSourceMapping ORDER BY variantId").all();
    if (!imports.length) {
      assert.equal(rows.length, 0, "Unbound source rows");
      return "empty";
    }
    const revision = (imports[0] as { handoffRevision: string }).handoffRevision;
    const expected = revision === handoff.revision ? handoff : handoff.previous;
    assert.deepEqual(imports, [{
      id: 1, handoffRevision: expected.revision,
      sourceRevision: expected.sourceRevision, scope: classSourceScope,
    }], "Existing handoff metadata differs");
    assert.deepEqual(rows, expected.rows, "Persisted class-source state differs");
    return expected === handoff ? "after" : "previous";
  };
  const before = inspect();
  if (apply && before !== "after") {
    assert(!db.inTransaction, "Importer owns its transaction");
    db.transaction(() => {
      assert.equal(inspect(), before, "Source state changed before write");
      if (before === "previous") {
        const update = db.prepare(
          "UPDATE ClassSourceMapping SET disposition=?, relation=?, evidenceJson=? WHERE variantId=?",
        );
        for (const row of handoff.rows) {
          if (promotions.has(`${row.rulebookId}:${row.classId}:${row.variantId}`))
            assert.equal(
              update.run(row.disposition, row.relation, row.evidenceJson, row.variantId).changes,
              1,
            );
        }
        db.prepare(
          "UPDATE ClassSourceImport SET handoffRevision=?, sourceRevision=? WHERE id=1",
        ).run(handoff.revision, handoff.sourceRevision);
      } else {
        const columns =
          "variantId classId rulebookId name slug prestige listKind disposition relation evidenceJson".split(" ");
        const insert = db.prepare(
          `INSERT INTO ClassSourceMapping (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
        );
        for (const row of handoff.rows)
          insert.run(...columns.map((key) => row[key as keyof ClassSourceRow]));
        db.prepare("INSERT INTO ClassSourceImport VALUES (1,?,?,?)").run(
          handoff.revision, handoff.sourceRevision, classSourceScope,
        );
      }
      assert.equal(inspect(), "after");
    }).immediate();
    return { state: "after", changed: true, wouldChange: false, rows: handoff.rows.length };
  }
  return {
    state: before === "after" ? "after" : "before", predecessor: before,
    changed: false, wouldChange: before !== "after", rows: handoff.rows.length,
  };
}
