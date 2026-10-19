import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import request from "supertest";
import type { PublicationStatsResponse } from "@dnd/contracts";
import { app } from "#server/app";

const root = path.resolve(__dirname, "../..");
const contentFile = process.env.CONTENT_DATABASE_URL!.replace(/^file:/, "");
const fixtureRoot = path.join(path.dirname(contentFile), "class-source-inputs");
const stage = (action: "prepare" | "upgrade") => {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"),
    path.join(root, "data-tools/src/class-sources/import-test-fixture.ts"), fixtureRoot, contentFile, action],
    { cwd: root, env: process.env, encoding: "utf8" });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { revision: string; changed?: boolean };
};

it("serves the imported five-row upgrade, reprints and retained gaps without changing spell availability", async () => {
  fs.mkdirSync(fixtureRoot);
  const db = new Database(contentFile);
  const rules = new Database(process.env.RULES_DATABASE_URL!.replace(/^file:/, ""));
  try {
    for (const id of [22,75,98,109,500,501,502,503]) rules.prepare(
      "INSERT OR IGNORE INTO dnd_rulebook(id,dnd_edition_id,name,abbr,description,official_url,slug) VALUES(?,1,?,'SYN','','',?)",
    ).run(id, `Synthetic book ${id}`, `synthetic-book-${id}`);
    for (const id of [37,462,860,861,863,864,865,18,16]) rules.prepare(
      "INSERT OR IGNORE INTO dnd_characterclass(id,name,slug,prestige,short_description,short_description_html) VALUES(?,?,?,0,'','')",
    ).run(id, `No spell class ${id}`, `no-spell-${id}`);
    db.exec("INSERT INTO I18nCharacterClassText(id,classId,lang,variant,name,createdAt,updatedAt) VALUES('upgrade-name',860,'zh','default','合成死灵职业',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
    const urls = ["/api/classes?includePrestige=true", "/api/classes?includePrestige=true&lang=zh",
      "/api/classes?includePrestige=true&rulebookIds=109",
      "/api/spells/by-level?classIds=1&level=3&rulebookIds=4,6",
      "/api/spells/by-level?classIds=860&level=all&rulebookIds=109",
      "/api/spells/search?q=Fire&classIds=1&mode=name",
      "/api/spells/search?q=Fire&classIds=860&mode=name"];
    const before = await Promise.all(urls.map((url) => request(app).get(url)));
    expect(before.every((res) => res.status === 200)).toBe(true);
    expect(before[0]!.body.items.some((c: { id: number }) => c.id === 860)).toBe(false);
    const previous = stage("prepare");
    const old = await request(app).get("/api/rulebooks/publication-stats");
    expect(old.status).toBe(200);
    const oldItems = (old.body as PublicationStatsResponse).items;
    const book = (items: PublicationStatsResponse["items"], id: number) => items.find((b) => b.rulebookId === id)!;
    expect(book(oldItems,109).classSources.uncertainCandidateCount).toBe(5);
    expect(book(oldItems,75).classSources.uncertainCandidateCount).toBe(2);
    expect(book(oldItems,109).classSources.handoffRevision).toBe(previous.revision);
    const upgraded = stage("upgrade");
    expect(upgraded.changed).toBe(true);
    const res = await request(app).get("/api/rulebooks/publication-stats?lang=zh");
    expect(res.status).toBe(200);
    const items = (res.body as PublicationStatsResponse).items;
    const dc = book(items,109), mh = book(items,75);
    expect(dc.classSources.supported.map((c) => c.variantId).sort()).toEqual([974,977,979]);
    expect(dc.classSources.supported.find((c) => c.classId === 860)?.i18n?.name).toBe("合成死灵职业");
    expect(dc.classSources.supported.find((c) => c.classId === 863)?.name).toBe("Savant");
    expect(dc.classSources.supported.find((c) => c.classId === 863)?.i18n).toBeUndefined();
    expect(mh.classSources.supported.map((c) => c.variantId).sort()).toEqual([76,79]);
    // This comparison is typed by the public DTO; no cast removes reprint.
    expect(mh.classSources.supported.every((c) => c.relation === "reprint")).toBe(true);
    expect(dc.classSources.uncertainCandidateCount).toBe(2);
    expect(mh.classSources.uncertainCandidateCount).toBe(0);
    expect(book(items,98).classSources.uncertainCandidateCount).toBe(1);
    expect(book(items,22).classSources.uncertainCandidateCount).toBe(1);
    expect(items.reduce((n,b) => n + b.classSources.supported.length,0)).toBe(69);
    expect(new Set(items.flatMap((b) => b.classSources.supported.map((c) => c.classId))).size).toBe(65);
    expect(items.reduce((n,b) => n + b.classSources.excludedCandidateCount,0)).toBe(11);
    expect(items.reduce((n,b) => n + b.classSources.uncertainCandidateCount,0)).toBe(4);
    for (const item of items) {
      expect(item.siteSpellCount).toBe(book(oldItems,item.rulebookId).siteSpellCount);
      expect(item.classSources.inventoryComplete).toBe(false);
      expect(item.classSources.coverage).toBe(book(oldItems,item.rulebookId).classSources.coverage);
      expect(item.classSources.handoffRevision).toBe(upgraded.revision);
    }
    for (const forbidden of ["evidenceJson", "evidenceRevision", "acceptance", "class-sources/", fixtureRoot])
      expect(JSON.stringify(res.body)).not.toContain(forbidden);
    const after = await Promise.all(urls.map((url) => request(app).get(url)));
    after.forEach((response,i) => { expect(response.status).toBe(200); expect(response.body).toEqual(before[i]!.body); });
    expect(stage("upgrade").changed).toBe(false);
    db.exec("UPDATE ClassSourceMapping SET relation='invented' WHERE variantId=76");
    expect((await request(app).get("/api/rulebooks/publication-stats")).status).toBe(500);
  } finally { db.close(); rules.close(); }
});
