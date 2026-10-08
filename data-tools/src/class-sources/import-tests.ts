import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
  acceptedClassSourceRevision,
  importClassSources,
  loadAcceptedClassSources,
  type ClassSourceHandoff,
} from "./import";
import { repoRoot } from "../shared/env";

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "class-source-import-test-"),
);
const db = new Database(path.join(temp, "content.sqlite"));
const handoff: ClassSourceHandoff = {
  revision: acceptedClassSourceRevision,
  sourceRevision: "synthetic",
  rows: [
    {
      variantId: 1,
      classId: 1,
      rulebookId: 1,
      name: "Synthetic",
      slug: "synthetic",
      prestige: 0,
      listKind: "spells",
      disposition: "supported",
      relation: "class-entry",
      evidenceJson: "{}",
    },
    {
      variantId: 2,
      classId: 1,
      rulebookId: 2,
      name: "Synthetic",
      slug: "synthetic",
      prestige: 0,
      listKind: "spells",
      disposition: "source-uncertain",
      relation: null,
      evidenceJson: "{}",
    },
  ],
};
try {
  db.exec(
    "CREATE TABLE SpellContent(id TEXT PRIMARY KEY, descriptionText TEXT); INSERT INTO SpellContent VALUES ('keep','canonical'); CREATE TABLE ProtectedOverlay(id INTEGER, text TEXT); INSERT INTO ProtectedOverlay VALUES (1,'keep');",
  );
  assert.equal(importClassSources(db, handoff).state, "before");
  assert.throws(() => importClassSources(db, handoff, true), /migration/);
  assert.throws(
    () => importClassSources(db, { ...handoff, revision: "unaccepted" }),
    /Unaccepted/,
  );
  // Production loader cannot consume an arbitrary generated projection without Git acceptance.
  const readonly = new Database(path.join(temp, "content.sqlite"), {
    readonly: true,
  });
  try {
    assert.throws(() => loadAcceptedClassSources(temp, readonly));
  } finally {
    readonly.close();
  }
  db.exec(
    fs.readFileSync(
      path.join(
        repoRoot(),
        "server/db/content/migrations/20261008200000_add_class_source_mapping/migration.sql",
      ),
      "utf8",
    ),
  );
  const before = db.prepare("SELECT * FROM SpellContent").all();
  assert.equal(importClassSources(db, handoff).wouldChange, true);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM ClassSourceMapping").get() &&
      (
        db.prepare("SELECT COUNT(*) AS n FROM ClassSourceMapping").get() as {
          n: number;
        }
      ).n,
    0,
  );
  db.exec(
    "CREATE TRIGGER fail_mapping BEFORE INSERT ON ClassSourceMapping WHEN NEW.variantId=2 BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;",
  );
  assert.throws(
    () => importClassSources(db, handoff, true),
    /synthetic failure/,
  );
  expectEmpty();
  db.exec("DROP TRIGGER fail_mapping");
  assert.equal(importClassSources(db, handoff, true).changed, true);
  const changes = db.prepare("SELECT total_changes() AS n").get();
  assert.equal(importClassSources(db, handoff, true).changed, false);
  assert.deepEqual(db.prepare("SELECT total_changes() AS n").get(), changes);
  assert.deepEqual(db.prepare("SELECT * FROM SpellContent").all(), before);
  assert.deepEqual(db.prepare("SELECT * FROM ProtectedOverlay").all(), [
    { id: 1, text: "keep" },
  ]);
  assert.throws(
    () =>
      importClassSources(db, { ...handoff, sourceRevision: "changed" }, true),
    /differs/,
  );
  db.prepare(
    "UPDATE ClassSourceMapping SET name='tampered' WHERE variantId=1",
  ).run();
  assert.throws(() => importClassSources(db, handoff, true), /differs/);
  console.log(
    "class-source import portable checks passed: acceptance, migration, readonly, repeat, stale state, protected content",
  );
} finally {
  db.close();
  fs.rmSync(temp, { recursive: true, force: true });
}

function expectEmpty() {
  assert.deepEqual(db.prepare("SELECT * FROM ClassSourceMapping").all(), []);
  assert.deepEqual(db.prepare("SELECT * FROM ClassSourceImport").all(), []);
}
