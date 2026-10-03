import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import type { SpellStepOperation, SpellIndexSqlPatch } from "./spells";

const root = path.resolve(__dirname, "../../..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spell-step-test-"));
// Never inherit private data or operator DB URLs, including module-level roots.
process.env.DATA_REPO_PATH = dir;
for (const role of ["RULES", "CONTENT", "APP_STATE"]) {
  process.env[`${role}_DATABASE_URL`] =
    `file:${path.join(dir, `${role}.sqlite`)}`;
}

const rebuild: SpellIndexSqlPatch[] = [
  {
    sqlPath: "synthetic-index.sql",
    sql: `BEGIN IMMEDIATE TRANSACTION;
    DROP TABLE IF EXISTS idx_spell_class_level;
    CREATE TABLE idx_spell_class_level (
      spell_id INTEGER NOT NULL, class_id INTEGER NOT NULL, level INTEGER NOT NULL,
      rulebook_id INTEGER NOT NULL, edition_id INTEGER NOT NULL, extra TEXT NOT NULL,
      PRIMARY KEY(spell_id,class_id,level,rulebook_id,extra));
    INSERT INTO idx_spell_class_level
      SELECT l.spell_id,l.character_class_id,l.level,s.rulebook_id,b.dnd_edition_id,l.extra
      FROM dnd_spellclasslevel l JOIN dnd_spell s ON s.id=l.spell_id
      JOIN dnd_rulebook b ON b.id=s.rulebook_id;
    DROP TABLE IF EXISTS idx_spell_domain_level;
    CREATE TABLE idx_spell_domain_level (
      spell_id INTEGER NOT NULL, domain_id INTEGER NOT NULL, level INTEGER NOT NULL,
      rulebook_id INTEGER NOT NULL, edition_id INTEGER NOT NULL, extra TEXT NOT NULL,
      PRIMARY KEY(spell_id,domain_id,level,rulebook_id,extra));
    INSERT INTO idx_spell_domain_level
      SELECT l.spell_id,l.domain_id,l.level,s.rulebook_id,b.dnd_edition_id,l.extra
      FROM dnd_spelldomainlevel l JOIN dnd_spell s ON s.id=l.spell_id
      JOIN dnd_rulebook b ON b.id=s.rulebook_id;
    COMMIT TRANSACTION;`,
  },
];

function fixture(dbPath: string) {
  const db = new Database(dbPath);
  const textColumns = [
    "extra_components",
    "description",
    "description_html",
    "casting_time",
    "range",
    "target",
    "effect",
    "area",
    "duration",
    "saving_throw",
    "spell_resistance",
  ];
  const flags = [
    "verbal",
    "somatic",
    "material",
    "arcane_focus",
    "divine_focus",
    "xp",
    "meta_breath",
    "true_name",
    "corrupt",
  ];
  db.exec(`
    CREATE TABLE dnd_spell (id INTEGER PRIMARY KEY, added TEXT, name TEXT, slug TEXT,
      rulebook_id INTEGER, page INTEGER, school_id INTEGER, sub_school_id INTEGER,
      ${textColumns.map((name) => `${name} TEXT`).join(",")},
      ${flags.map((name) => `${name}_component INTEGER DEFAULT 0`).join(",")},
      corrupt_level INTEGER, verified INTEGER DEFAULT 0, verified_author_id INTEGER, verified_time TEXT);
    CREATE TABLE dnd_rulebook (id INTEGER PRIMARY KEY,abbr TEXT,dnd_edition_id INTEGER);
    INSERT INTO dnd_rulebook VALUES (1,'ALPHA',1),(2,'BETA',2),(3,'CONTROL',1);
    CREATE TABLE dnd_dndedition (id INTEGER PRIMARY KEY,slug TEXT,system TEXT);
    INSERT INTO dnd_dndedition VALUES (1,'first','dnd3.5'),(2,'second','dnd3.5');
    CREATE TABLE dnd_spellschool (id INTEGER PRIMARY KEY,name TEXT);
    INSERT INTO dnd_spellschool VALUES (1,'School');
    CREATE TABLE dnd_spellsubschool (id INTEGER PRIMARY KEY,name TEXT);
    CREATE TABLE dnd_spelldescriptor (id INTEGER PRIMARY KEY,name TEXT);
    INSERT INTO dnd_spelldescriptor VALUES (1,'Old'),(2,'New');
    CREATE TABLE dnd_characterclass (id INTEGER PRIMARY KEY,name TEXT);
    INSERT INTO dnd_characterclass VALUES (1,'Wizard'),(2,'Cleric');
    CREATE TABLE dnd_domain (id INTEGER PRIMARY KEY,name TEXT);
    INSERT INTO dnd_domain VALUES (1,'Domain');
    CREATE TABLE dnd_spellclasslevel (id INTEGER PRIMARY KEY,spell_id INTEGER,character_class_id INTEGER,level INTEGER,extra TEXT);
    INSERT INTO dnd_spellclasslevel VALUES (1,7,1,1,''),(2,7,1,2,'variant'),(3,8,2,3,''),(4,91,1,4,'');
    CREATE TABLE dnd_spelldomainlevel (id INTEGER PRIMARY KEY,spell_id INTEGER,domain_id INTEGER,level INTEGER,extra TEXT);
    INSERT INTO dnd_spelldomainlevel VALUES (1,7,1,2,'');
    CREATE TABLE dnd_spell_descriptors (id INTEGER PRIMARY KEY,spell_id INTEGER,spelldescriptor_id INTEGER);
    INSERT INTO dnd_spell_descriptors VALUES (1,7,1);
    CREATE TABLE protected_operator (id INTEGER PRIMARY KEY,value TEXT);
    INSERT INTO protected_operator VALUES (1,'Keep');
    INSERT INTO dnd_spell (id,added,name,slug,rulebook_id,page,school_id,range,description,description_html)
      VALUES (7,'2001-01-01 00:00:00','First','first',1,8,1,'Old','English','<p>English</p>'),
      (8,'2002-01-01 00:00:00','Second','second',2,6,1,'Old','Second','<p>Second</p>'),
      (91,'2003-01-01 00:00:00','Control','control',3,1,1,'Keep','Control','<p>Control</p>');
  `);
  db.exec(rebuild[0]!.sql);
  return db;
}

function dump(db: Database.Database) {
  const schema = db
    .prepare("SELECT * FROM sqlite_master ORDER BY name")
    .all() as { type: string; name: string }[];
  return JSON.stringify({
    schema,
    tables: schema
      .filter((row) => row.type === "table")
      .map((row) => ({
        name: row.name,
        rows: db.prepare(`SELECT * FROM "${row.name}" ORDER BY rowid`).all(),
      })),
  });
}

async function main() {
  const {
    maintainSpellStep,
    maintainSpellStepFile,
    readSpellStepGuard,
    applySpellPatchAtomically,
    validatePatch,
  } = require("./spells") as typeof import("./spells");
  // Every insert lookup shares the map's normalization, including aliases
  // introduced after a successful batch. No incorrect relation may be written.
  const lookupDb = fixture(":memory:");
  try {
    lookupDb.exec("INSERT INTO dnd_spellsubschool VALUES(1,'Sub')");
    const insert: SpellStepOperation[] = [
      {
        patch: {
          op: "insertSpell",
          id: 120,
          source: { rulebook: "BETA", page: 4 },
          spell: {
            added: "2004-01-01 00:00:00",
            name: "Lookup",
            slug: "lookup",
            school: "School",
            subschool: "Sub",
            description: "Synthetic",
            descriptionHtml: "<p>Synthetic</p>",
          },
          descriptors: ["New"],
          levels: {
            classes: [{ class: "Cleric", level: 2 }],
            domains: [{ domain: "Domain", level: 3 }],
          },
        },
        before: { spell: null, descriptors: [], classes: [], domains: [] },
      },
    ];
    for (const phase of ["before", "after"] as const) {
      for (const [table, label] of [
        ["dnd_rulebook", "BETA"],
        ["dnd_spellschool", "School"],
        ["dnd_spellsubschool", "Sub"],
        ["dnd_spelldescriptor", "New"],
        ["dnd_characterclass", "Cleric"],
        ["dnd_domain", "Domain"],
      ]) {
        lookupDb.exec("SAVEPOINT duplicate_lookup");
        lookupDb
          .prepare(
            `INSERT INTO ${table} VALUES(50,?${table === "dnd_rulebook" ? ",2" : ""})`,
          )
          .run(`\t${label!.toUpperCase()}\n`);
        const before = dump(lookupDb);
        for (const mode of ["check", "apply"] as const) {
          assert.throws(
            () => maintainSpellStep(lookupDb, insert, rebuild, mode),
            /Ambiguous spell step lookup/,
          );
          assert.equal(dump(lookupDb), before);
          assert.equal(
            lookupDb
              .prepare(
                "SELECT * FROM dnd_spellclasslevel WHERE spell_id=120 AND character_class_id=50",
              )
              .get(),
            undefined,
          );
          if (phase === "before")
            assert.equal(readSpellStepGuard(lookupDb, 120).spell, null);
        }
        lookupDb.exec("ROLLBACK TO duplicate_lookup; RELEASE duplicate_lookup");
      }
      lookupDb.exec("SAVEPOINT duplicate_spell_identity");
      lookupDb
        .prepare(
          "INSERT INTO dnd_spell(id,name,rulebook_id,school_id) VALUES(50,?,2,1)",
        )
        .run("\tLOOKUP\n");
      const identityBefore = dump(lookupDb);
      for (const mode of ["check", "apply"] as const) {
        assert.throws(
          () => maintainSpellStep(lookupDb, insert, rebuild, mode),
          /already exists|collision/,
        );
        assert.equal(dump(lookupDb), identityBefore);
      }
      lookupDb.exec(
        "ROLLBACK TO duplicate_spell_identity; RELEASE duplicate_spell_identity",
      );
      if (phase === "before")
        assert.deepEqual(
          maintainSpellStep(lookupDb, insert, rebuild, "apply"),
          { state: "after", changed: true },
        );
    }
  } finally {
    lookupDb.close();
  }
  const moveDb = fixture(":memory:");
  try {
    const move: SpellStepOperation[] = [
      {
        patch: {
          op: "moveSpellRulebook",
          id: 8,
          from: {
            id: 2,
            abbr: "BETA",
            editionId: 2,
            editionSlug: "second",
            system: "dnd3.5",
          },
          to: {
            id: 1,
            abbr: "ALPHA",
            editionId: 1,
            editionSlug: "first",
            system: "dnd3.5",
          },
        },
        before: readSpellStepGuard(moveDb, 8),
      },
    ];
    for (const phase of ["before", "after"] as const) {
      for (const sql of [
        "INSERT INTO dnd_rulebook VALUES(50,char(9)||'BETA'||char(10),2)",
        "INSERT INTO dnd_rulebook VALUES(50,char(9)||'ALPHA'||char(10),1)",
        "INSERT INTO dnd_dndedition VALUES(50,char(9)||'SECOND'||char(10),' DND3.5 ')",
        "INSERT INTO dnd_dndedition VALUES(50,char(9)||'FIRST'||char(10),' DND3.5 ')",
      ]) {
        moveDb.exec("SAVEPOINT duplicate_move_identity");
        moveDb.exec(sql);
        const before = dump(moveDb);
        for (const mode of ["check", "apply"] as const) {
          assert.throws(
            () => maintainSpellStep(moveDb, move, rebuild, mode),
            /ambiguous/i,
          );
          assert.equal(dump(moveDb), before);
        }
        moveDb.exec(
          "ROLLBACK TO duplicate_move_identity; RELEASE duplicate_move_identity",
        );
      }
      if (phase === "before") maintainSpellStep(moveDb, move, rebuild, "apply");
    }
  } finally {
    moveDb.close();
  }
  const classDb = fixture(":memory:");
  try {
    const addition: SpellStepOperation[] = [
      {
        patch: {
          op: "updateSpell",
          id: 7,
          levels: {
            classes: [{ class: "Cleric", level: 4, expectedLevel: null }],
          },
        },
        before: readSpellStepGuard(classDb, 7),
      },
    ];
    for (const phase of ["before", "after"] as const) {
      classDb.exec("SAVEPOINT duplicate_class_addition");
      classDb
        .prepare("INSERT INTO dnd_characterclass VALUES(50,?)")
        .run("\tCLERIC\n");
      const before = dump(classDb);
      for (const mode of ["check", "apply"] as const) {
        assert.throws(
          () => maintainSpellStep(classDb, addition, rebuild, mode),
          /ambiguous/i,
        );
        assert.equal(dump(classDb), before);
        assert.equal(
          classDb
            .prepare(
              "SELECT id FROM dnd_spellclasslevel WHERE spell_id=7 AND character_class_id=50",
            )
            .get(),
          undefined,
        );
      }
      classDb.exec(
        "ROLLBACK TO duplicate_class_addition; RELEASE duplicate_class_addition",
      );
      if (phase === "before")
        maintainSpellStep(classDb, addition, rebuild, "apply");
    }
    // Existing class changes resolve within memberships, preserving editions
    // with shared names. A sole normalized alias must resolve to its actual ID.
    classDb
      .prepare("INSERT INTO dnd_characterclass VALUES(50,?)")
      .run("\tWIZARD\n");
    classDb.exec(
      "UPDATE dnd_spellclasslevel SET character_class_id=50 WHERE id=1",
    );
    classDb.exec(rebuild[0]!.sql);
    const relative: SpellStepOperation[] = [
      {
        patch: {
          op: "updateSpell",
          id: 7,
          levels: {
            classes: [{ class: "Wizard", level: 5, expectedLevel: 1 }],
          },
        },
        before: readSpellStepGuard(classDb, 7),
      },
    ];
    assert.deepEqual(maintainSpellStep(classDb, relative, rebuild), {
      state: "before",
      changed: false,
    });
    maintainSpellStep(classDb, relative, rebuild, "apply");
    assert.deepEqual(
      classDb
        .prepare(
          "SELECT character_class_id AS id,level FROM dnd_spellclasslevel WHERE id=1",
        )
        .get(),
      { id: 50, level: 5 },
    );
    assert.deepEqual(maintainSpellStep(classDb, relative, rebuild, "apply"), {
      state: "after",
      changed: false,
    });
    classDb.exec("INSERT INTO dnd_spellclasslevel VALUES(50,7,1,1,'')");
    classDb.exec(rebuild[0]!.sql);
    const ambiguousRelative = [
      { ...relative[0]!, before: readSpellStepGuard(classDb, 7) },
    ];
    const before = dump(classDb);
    for (const mode of ["check", "apply"] as const) {
      assert.throws(
        () => maintainSpellStep(classDb, ambiguousRelative, rebuild, mode),
        /exactly one relationship/,
      );
      assert.equal(dump(classDb), before);
    }
  } finally {
    classDb.close();
  }
  const dbPath = path.join(dir, "rules.sqlite");
  const db = fixture(dbPath);
  const first: SpellStepOperation[] = [
    {
      patch: {
        op: "updateSpell",
        id: 7,
        spell: { page: 9, range: "New" },
        expected: { spell: { page: 8, range: "Old" }, descriptors: ["Old"] },
        descriptors: ["New"],
        levels: {
          classes: [{ class: "Wizard", extra: "", level: 5, expectedLevel: 1 }],
        },
      },
      before: readSpellStepGuard(db, 7),
    },
  ];
  const rejectsUnchanged = (
    run: () => unknown,
    pattern: RegExp,
    target = db,
  ) => {
    const original = dump(target);
    assert.throws(run, pattern);
    assert.equal(dump(target), original);
  };
  const rejectIndexSideEffects = (operations: SpellStepOperation[]) => {
    for (const sql of [
      "UPDATE dnd_spell SET range='UNREQUESTED' WHERE id=7",
      "UPDATE dnd_spell SET page=99 WHERE id=7",
      "UPDATE dnd_spellclasslevel SET level=8 WHERE spell_id=7 AND extra='variant'",
      "UPDATE dnd_spelldomainlevel SET level=8 WHERE spell_id=7",
      "DELETE FROM dnd_spell_descriptors WHERE spell_id=7",
      "UPDATE dnd_spellclasslevel SET id=id+100 WHERE spell_id=7",
    ]) {
      const unsafe = [...rebuild, { sqlPath: "base-side-effect.sql", sql }];
      for (const mode of ["check", "apply"] as const)
        rejectsUnchanged(
          () => maintainSpellStep(db, operations, unsafe, mode),
          /Index rebuild changed base/,
        );
    }
  };
  const rejectAmbiguousDescriptors = (operations: SpellStepOperation[]) => {
    for (const label of ["New", "Old"].flatMap((name) => [
      `  ${name.toUpperCase()}  `,
      `\t${name.toUpperCase()}\n`,
    ])) {
      db.exec("SAVEPOINT ambiguous_descriptor");
      db.prepare("INSERT INTO dnd_spelldescriptor VALUES(50,?)").run(label);
      for (const mode of ["check", "apply"] as const)
        rejectsUnchanged(
          () => maintainSpellStep(db, operations, rebuild, mode),
          /Ambiguous spell step descriptor/,
        );
      db.exec("ROLLBACK TO ambiguous_descriptor; RELEASE ambiguous_descriptor");
    }
  };
  try {
    // The index stage cannot enlarge the requested typed update's authority.
    const pageOnly: SpellStepOperation[] = [
      {
        patch: {
          op: "updateSpell",
          id: 7,
          spell: { page: 9 },
          expected: { spell: { page: 8 } },
        },
        before: readSpellStepGuard(db, 7),
      },
    ];
    rejectIndexSideEffects(pageOnly);
    rejectAmbiguousDescriptors(first);
    const expectedAmbiguity = fixture(":memory:");
    try {
      expectedAmbiguity.exec(
        "INSERT INTO dnd_spelldescriptor VALUES(50,'Old'); UPDATE dnd_spell_descriptors SET spelldescriptor_id=50 WHERE spell_id=7",
      );
      const descriptorOnly: SpellStepOperation[] = [
        {
          patch: {
            op: "updateSpell",
            id: 7,
            descriptors: ["New"],
            expected: { descriptors: ["Old"] },
          },
          before: readSpellStepGuard(expectedAmbiguity, 7),
        },
      ];
      // The relation matches the legacy map's last row. Only an explicit
      // uniqueness guard can reject this instead of accepting the expected set.
      for (const mode of ["check", "apply"] as const)
        rejectsUnchanged(
          () =>
            maintainSpellStep(expectedAmbiguity, descriptorOnly, rebuild, mode),
          /Ambiguous spell step descriptor/,
          expectedAmbiguity,
        );
    } finally {
      expectedAmbiguity.close();
    }
    const baseline = dump(db);
    const stat = fs.statSync(dbPath);
    assert.deepEqual(maintainSpellStepFile(dbPath, first, rebuild), {
      state: "before",
      changed: false,
    });
    assert.equal(dump(db), baseline);
    assert.equal(fs.statSync(dbPath).mtimeMs, stat.mtimeMs);
    db.exec("SAVEPOINT concurrent_guard");
    db.exec("UPDATE dnd_spell SET range='Concurrent' WHERE id=7");
    rejectsUnchanged(
      () => maintainSpellStep(db, first, rebuild, "apply"),
      /mixed|drift/,
    );
    db.exec("ROLLBACK TO concurrent_guard; RELEASE concurrent_guard");

    // Existing atomic helper catches actual rules-before-index failure.
    const legacyPatch = path.join(dir, "legacy.jsonl");
    fs.writeFileSync(legacyPatch, JSON.stringify(first[0]!.patch) + "\n");
    const validated = validatePatch(db, legacyPatch);
    assert.deepEqual(validated.errors, []);
    rejectsUnchanged(
      () =>
        applySpellPatchAtomically(
          db,
          [],
          validated.operations.filter((op) => op.kind === "updateSpell"),
          [
            ...rebuild,
            {
              sqlPath: "broken.sql",
              sql: "DELETE FROM idx_spell_class_level; INSERT INTO absent VALUES(1);",
            },
          ],
        ),
      /no such table/,
    );

    // Disk-only SQLite fault: both replays succeed, then the real index write
    // fails after its DELETE. The outer transaction must restore rules/schema/rows.
    const diskFailure = [
      {
        sqlPath: "failure-injection.sql",
        sql: rebuild[0]!.sql.replace(
          "l.level,s.rulebook_id",
          "CASE WHEN (SELECT file FROM pragma_database_list WHERE name='main')='' THEN l.level ELSE NULL END,s.rulebook_id",
        ),
      },
    ];
    rejectsUnchanged(
      () => maintainSpellStep(db, first, diskFailure, "apply"),
      /NOT NULL/,
    );
    // Both memory replays leave base rules intact, while the actual disk-only
    // index side effect must be rejected after typed writes and fully roll back.
    rejectsUnchanged(
      () =>
        maintainSpellStep(
          db,
          first,
          [
            ...rebuild,
            {
              sqlPath: "disk-base-side-effect.sql",
              sql: "UPDATE dnd_spell SET range='UNREQUESTED' WHERE id=7 AND (SELECT file FROM pragma_database_list WHERE name='main')<>''",
            },
          ],
          "apply",
        ),
      /Index rebuild changed base/,
    );
    rejectsUnchanged(
      () =>
        maintainSpellStep(
          db,
          first,
          [
            ...rebuild,
            {
              sqlPath: "unsafe.sql",
              sql: "UPDATE protected_operator SET value='damage';",
            },
          ],
          "apply",
        ),
      /protected/,
    );

    assert.deepEqual(maintainSpellStep(db, first, rebuild, "apply"), {
      state: "after",
      changed: true,
    });
    // The same strict boundaries hold when exact after would otherwise no-op.
    rejectIndexSideEffects(first);
    rejectAmbiguousDescriptors(first);
    const afterFirst = dump(db);
    const afterStat = fs.statSync(dbPath);
    assert.deepEqual(maintainSpellStepFile(dbPath, first, rebuild), {
      state: "after",
      changed: false,
    });
    assert.deepEqual(maintainSpellStepFile(dbPath, first, rebuild, "apply"), {
      state: "after",
      changed: false,
    });
    assert.equal(dump(db), afterFirst);
    assert.equal(fs.statSync(dbPath).mtimeMs, afterStat.mtimeMs);
    assert.ok(
      validatePatch(db, legacyPatch).errors.length,
      "legacy validate still rejects stale repeat",
    );

    const saved = readSpellStepGuard(db, 7);
    const control = readSpellStepGuard(db, 91);
    const second: SpellStepOperation[] = [
      {
        patch: {
          op: "moveSpellRulebook",
          id: 8,
          from: {
            id: 2,
            abbr: "BETA",
            editionId: 2,
            editionSlug: "second",
            system: "dnd3.5",
          },
          to: {
            id: 1,
            abbr: "ALPHA",
            editionId: 1,
            editionSlug: "first",
            system: "dnd3.5",
          },
        },
        before: readSpellStepGuard(db, 8),
      },
      {
        patch: {
          op: "insertSpell",
          id: 120,
          source: { rulebook: "BETA", page: 4 },
          spell: {
            added: "2004-01-01 00:00:00",
            name: "Inserted",
            slug: "inserted",
            school: "School",
            description: "New English",
            descriptionHtml: "<p>New English</p>",
          },
          levels: { classes: [{ class: "Cleric", level: 2, extra: "" }] },
        },
        before: { spell: null, classes: [], domains: [], descriptors: [] },
      },
    ];
    assert.deepEqual(maintainSpellStep(db, second, rebuild), {
      state: "before",
      changed: false,
    });
    rejectsUnchanged(
      () => maintainSpellStep(db, [...first, ...second], rebuild, "apply"),
      /mixed|drift/,
    );
    const insert = second[1]!.patch;
    assert.equal(insert.op, "insertSpell");
    if (insert.op === "insertSpell")
      for (const unsafe of [
        {
          ...insert,
          spell: { ...insert.spell, components: { verbal: "false" } },
        },
        { ...insert, source: { ...insert.source, page: "4" } },
        { ...insert, levels: { classes: "wrong" } },
        { ...insert, arbitrarySql: "DELETE FROM protected_operator" },
        { ...insert, spell: { ...insert.spell, added: undefined } },
        {
          ...insert,
          levels: {
            classes: [
              { class: "Cleric", level: 2 },
              { class: "Cleric", level: 3 },
            ],
          },
        },
      ])
        rejectsUnchanged(
          () =>
            maintainSpellStep(
              db,
              [
                second[0]!,
                { ...second[1]!, patch: unsafe } as SpellStepOperation,
              ],
              rebuild,
              "apply",
            ),
          /boolean|integer|array|unsupported|timestamp|text type|Duplicate/,
        );
    db.exec("SAVEPOINT ambiguous_insert");
    db.exec("INSERT INTO dnd_characterclass VALUES(50,'Cleric')");
    rejectsUnchanged(
      () => maintainSpellStep(db, second, rebuild, "apply"),
      /Ambiguous/,
    );
    db.exec("ROLLBACK TO ambiguous_insert; RELEASE ambiguous_insert");
    assert.deepEqual(maintainSpellStep(db, second, rebuild, "apply"), {
      state: "after",
      changed: true,
    });
    const secondDump = dump(db);
    assert.deepEqual(maintainSpellStep(db, second, rebuild, "apply"), {
      state: "after",
      changed: false,
    });
    assert.equal(dump(db), secondDump);
    assert.deepEqual(readSpellStepGuard(db, 7), saved);
    assert.deepEqual(readSpellStepGuard(db, 91), control);
    assert.deepEqual(
      db
        .prepare(
          "SELECT rulebook_id,edition_id FROM idx_spell_class_level WHERE spell_id=8",
        )
        .get(),
      { rulebook_id: 1, edition_id: 1 },
    );

    const rejectedMutations = [
      "UPDATE idx_spell_class_level SET level=6 WHERE spell_id=7 AND extra=''",
      "DELETE FROM idx_spell_domain_level WHERE spell_id=7",
      "INSERT INTO idx_spell_class_level VALUES(7,2,7,1,1,'extra')",
      "UPDATE dnd_spell SET range='Drift' WHERE id=7",
      "INSERT INTO dnd_spellclasslevel VALUES(50,7,2,1,'extra')",
      "INSERT INTO dnd_spellclasslevel VALUES(50,7,1,5,'')",
      "DELETE FROM dnd_spellclasslevel WHERE spell_id=7 AND extra='variant'",
      "INSERT INTO dnd_spell_descriptors VALUES(50,7,2)",
      "DROP TABLE idx_spell_domain_level",
      "CREATE TRIGGER unexpected_index_trigger AFTER INSERT ON idx_spell_class_level BEGIN SELECT 1; END",
      "ALTER TABLE idx_spell_class_level RENAME TO old_index; CREATE TABLE idx_spell_class_level AS SELECT * FROM old_index",
      "UPDATE dnd_dndedition SET system='Other' WHERE id=2",
      "INSERT INTO dnd_rulebook VALUES(50,'BETA',2)",
    ];
    for (const sql of rejectedMutations) {
      db.exec("SAVEPOINT mutation");
      db.exec(sql);
      rejectsUnchanged(
        () =>
          maintainSpellStep(
            db,
            sql.includes("dnd_dndedition") || sql.includes("dnd_rulebook")
              ? second
              : first,
            rebuild,
            "apply",
          ),
        /mixed|drift|indexes|schema|keys|identity/,
      );
      db.exec("ROLLBACK TO mutation; RELEASE mutation");
    }
    for (const invalid of [
      [],
      [first[0]!, first[0]!],
      [{ ...first[0]!, before: { ...first[0]!.before, classes: [] } }],
      [
        {
          ...first[0]!,
          patch: {
            ...first[0]!.patch,
            arbitrarySql: "DELETE FROM protected_operator",
          },
        },
      ],
    ]) {
      rejectsUnchanged(
        () =>
          maintainSpellStep(
            db,
            invalid as SpellStepOperation[],
            rebuild,
            "apply",
          ),
        /empty|unique|mixed|unsupported|exactly one/,
      );
    }
    const mixed = [{ ...first[0]!, before: saved }, second[0]!];
    rejectsUnchanged(
      () => maintainSpellStep(db, mixed, rebuild, "apply"),
      /expected/,
    );
    assert.equal(
      (
        db.prepare("SELECT value FROM protected_operator").get() as {
          value: string;
        }
      ).value,
      "Keep",
    );

    const missing = path.join(dir, "must-not-create.sqlite");
    assert.throws(
      () => maintainSpellStepFile(missing, first, rebuild, "apply"),
      /exist|open/,
    );
    assert.equal(fs.existsSync(missing), false);
    const priorContentUrl = process.env.CONTENT_DATABASE_URL;
    process.env.CONTENT_DATABASE_URL = `file:${dbPath}`;
    rejectsUnchanged(
      () => maintainSpellStepFile(dbPath, first, rebuild, "apply"),
      /CONTENT_DATABASE_URL/,
    );
    process.env.CONTENT_DATABASE_URL = priorContentUrl!;
    const wrongPath = path.join(dir, "wrong.sqlite");
    const wrong = new Database(wrongPath);
    wrong.exec(
      "CREATE TABLE User(id TEXT PRIMARY KEY); INSERT INTO User VALUES('safe')",
    );
    const wrongBefore = dump(wrong);
    assert.throws(
      () => maintainSpellStepFile(wrongPath, first, rebuild, "apply"),
      /rules DB role/,
    );
    assert.equal(dump(wrong), wrongBefore);
    wrong.close();

    // Two task-owned fixture roots, with independent DATA_REPO_PATH and DB URLs.
    // npm root/package entrypoints must resolve the same target regardless of cwd.
    for (const fixtureName of ["root-fixture", "other-fixture"]) {
      const data = path.join(dir, fixtureName);
      const patchDir = path.join(data, "rules-patches", "pending", "spells");
      const indexDir = path.join(
        data,
        "rules-patches",
        "applied",
        "legacy-sql",
      );
      fs.mkdirSync(patchDir, { recursive: true });
      fs.mkdirSync(indexDir, { recursive: true });
      const file = path.join(data, "rules.sqlite");
      const tiny = fixture(file);
      const step = [
        {
          patch: {
            op: "updateSpell",
            id: 8,
            spell: { range: fixtureName },
            expected: { spell: { range: "Old" } },
          },
          before: readSpellStepGuard(tiny, 8),
        },
      ];
      tiny.close();
      fs.writeFileSync(
        path.join(patchDir, "step.jsonl"),
        JSON.stringify(step[0]) + "\n",
      );
      for (const [index, name] of [
        "create-idx-spell-class-level.sql",
        "create-idx-spell-domain-level.sql",
        "derive-spell-class-domain-mapping.sql",
      ].entries())
        fs.writeFileSync(
          path.join(indexDir, name),
          index === 0 ? rebuild[0]!.sql : "-- synthetic no-op\n",
        );
      const env = {
        ...process.env,
        DATA_REPO_PATH: data,
        RULES_DATABASE_URL: `file:${path.relative(path.join(root, "server"), file)}`,
      };
      for (const [cwd, args, expected] of [
        [
          root,
          [
            "run",
            "-w",
            "data-tools",
            "rules:spells:step",
            "--",
            "pending/spells/step.jsonl",
          ],
          "before",
        ],
        [
          path.join(root, "data-tools"),
          [
            "run",
            "rules:spells:step",
            "--",
            "--apply",
            "pending/spells/step.jsonl",
          ],
          "after",
        ],
        [
          root,
          [
            "run",
            "-w",
            "data-tools",
            "rules:spells:step",
            "--",
            "--apply",
            "pending/spells/step.jsonl",
          ],
          "after",
        ],
      ] as const) {
        assert.ok(
          process.env.npm_execpath,
          "Run the portable test through its npm script",
        );
        const result = spawnSync(
          process.execPath,
          [process.env.npm_execpath, ...args],
          { cwd, env, encoding: "utf8" },
        );
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, new RegExp(`"state":"${expected}"`));
      }
    }
    console.log(
      "Spell step portable checks passed (atomic failure, exact states, two batches, CLI paths)",
    );
  } finally {
    db.close();
  }
}

main()
  .finally(() => fs.rmSync(dir, { recursive: true, force: true }))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
