import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { app } from "#server/app";

describe("GET /api/rulebooks/publication-stats", () => {
  it("keeps unactivated sources unknown and counts canonical spells regardless of read rollback", async () => {
    const response = await request(app).get("/api/rulebooks/publication-stats");
    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    for (const row of response.body.items) {
      expect(row.classSources).toEqual({
        coverage: "unknown",
        inventoryComplete: false,
        handoffRevision: null,
        supported: [],
        excludedCandidateCount: 0,
        uncertainCandidateCount: 0,
      });
      expect(Number.isInteger(row.siteSpellCount)).toBe(true);
    }
  });

  it("preserves bounded positives, variants and uncertainties independently of browse filters", async () => {
    const before = await request(app).get("/api/classes?includePrestige=true");
    const db = new Database(
      process.env.CONTENT_DATABASE_URL!.replace(/^file:/, ""),
    );
    const rules = new Database(
      process.env.RULES_DATABASE_URL!.replace(/^file:/, ""),
    );
    try {
      db.exec(
        fs.readFileSync(
          path.resolve(
            __dirname,
            "../db/content/migrations/20261008200000_add_class_source_mapping/migration.sql",
          ),
          "utf8",
        ),
      );
      rules.exec(
        "INSERT INTO dnd_rulebook (id,dnd_edition_id,name,abbr,description,official_url,slug) VALUES (9001,1,'Synthetic no spells','EMPTY','','','synthetic-empty'), (9002,1,'Synthetic unknown','UNK','','','synthetic-unknown')",
      );
      db.exec(
        "INSERT INTO ClassSourceImport VALUES (1,'accepted-test','synthetic','bounded');",
      );
      const insert = db.prepare(
        "INSERT INTO ClassSourceMapping VALUES (?,?,?,?,?,?,?,?,?,?)",
      );
      insert.run(
        9001,
        9991,
        9001,
        "Same name",
        "same-one",
        0,
        "maneuvers",
        "supported",
        "class-entry",
        "{}",
      );
      insert.run(
        9002,
        9992,
        9001,
        "Same name",
        "same-two",
        1,
        "infusions",
        "supported",
        "variant",
        "{}",
      );
      insert.run(
        9003,
        9993,
        9001,
        "Uncertain",
        "unknown",
        0,
        "spells",
        "source-uncertain",
        null,
        "{}",
      );
      insert.run(
        9004,
        9994,
        9001,
        "Excluded",
        "excluded",
        0,
        "spells",
        "excluded",
        null,
        "{}",
      );
      const res = await request(app).get("/api/rulebooks/publication-stats");
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain("evidenceJson");
      const known = res.body.items.find(
        (row: { rulebookId: number }) => row.rulebookId === 9001,
      );
      expect(known.siteSpellCount).toBe(0);
      expect(known.classSources.coverage).toBe("bounded-candidates");
      expect(known.classSources.inventoryComplete).toBe(false);
      expect(
        known.classSources.supported.map(
          (row: { classId: number }) => row.classId,
        ),
      ).toEqual([9991, 9992]);
      expect(
        known.classSources.supported.map(
          (row: { listKind: string }) => row.listKind,
        ),
      ).toEqual(["maneuvers", "infusions"]);
      expect(known.classSources.uncertainCandidateCount).toBe(1);
      expect(known.classSources.excludedCandidateCount).toBe(1);
      expect(
        res.body.items.find(
          (row: { rulebookId: number }) => row.rulebookId === 9002,
        ).classSources.coverage,
      ).toBe("unknown");
      // Another book's version of the same class remains its own relationship.
      insert.run(
        9005,
        9991,
        9002,
        "Same name",
        "same-one",
        0,
        "maneuvers",
        "supported",
        "class-entry",
        "{}",
      );
      db.exec(
        "INSERT INTO I18nCharacterClassText (id,classId,lang,variant,name,createdAt,updatedAt) VALUES ('synthetic-name',9991,'zh','default','合成职业',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
      );
      const translated = await request(app).get(
        "/api/rulebooks/publication-stats?lang=zh",
      );
      for (const bookId of [9001, 9002]) {
        const item = translated.body.items.find(
          (row: { rulebookId: number }) => row.rulebookId === bookId,
        );
        const source = item.classSources.supported.find(
          (row: { classId: number }) => row.classId === 9991,
        );
        expect(source.i18n.name).toBe("合成职业");
        expect(source.variantId).toBe(bookId === 9001 ? 9001 : 9005);
      }
      db.exec(`INSERT INTO SpellContent (id,legacySpellId,canonicalName,slug,sourceRulebookId,descriptionText,descriptionHash,addedAt)
        VALUES ('synthetic-a',9901,'Same spell','same-spell',9001,'body','synthetic',CURRENT_TIMESTAMP),
          ('synthetic-b',9902,'Same spell','same-spell',9002,'body','synthetic',CURRENT_TIMESTAMP);
        INSERT INTO I18nSpellText (id,spellId,rulebookId,lang,variant,createdAt,updatedAt)
        VALUES ('synthetic-zh',9901,9001,'zh','chm',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
          ('synthetic-alt',9901,9001,'zh','effective',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
        INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable)
        VALUES ('synthetic-list-a','synthetic-a','class',9991,'Same name','same-one',1,'synthetic'),
          ('synthetic-list-b','synthetic-a','class',9992,'Same name','same-two',2,'synthetic');`);
      const counted = await request(app).get(
        "/api/rulebooks/publication-stats",
      );
      expect(
        counted.body.items.find(
          (row: { rulebookId: number }) => row.rulebookId === 9001,
        ).siteSpellCount,
      ).toBe(1);
      expect(
        counted.body.items.find(
          (row: { rulebookId: number }) => row.rulebookId === 9002,
        ).siteSpellCount,
      ).toBe(1);
      const counts = db
        .prepare(
          "SELECT sourceRulebookId,COUNT(DISTINCT id) AS n FROM SpellContent GROUP BY sourceRulebookId",
        )
        .all() as { sourceRulebookId: number; n: number }[];
      for (const row of counts)
        expect(
          counted.body.items.find(
            (item: { rulebookId: number }) =>
              item.rulebookId === row.sourceRulebookId,
          ).siteSpellCount,
        ).toBe(row.n);
      expect(
        (await request(app).get("/api/classes?includePrestige=true")).body,
      ).toEqual(before.body);
    } finally {
      db.close();
      rules.close();
    }
  });
});
