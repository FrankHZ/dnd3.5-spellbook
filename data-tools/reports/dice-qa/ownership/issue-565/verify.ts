import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual as equal } from "node:util";
import Database from "better-sqlite3";
import { localDataDir } from "../../../../src/shared/env";
import { loadEnglishRecords } from "../../../../src/dice-intake/qa";
import { parseDiceFile } from "../../../../src/dice-intake/parse";
import { validateInsertSpellShape } from "../../../../src/rules/spells-schema";

// Bounded, read-only evidence replay. No output/corpus/DB writes or web acquisition.
const start = performance.now(),
  root = localDataDir(),
  rel = "dice-baselines/issue-520/ownership/issue-565",
  owned = root + "/" + rel;
const priorRel = "dice-baselines/issue-520/ownership/issue-545",
  prior = root + "/" + priorRel;
const j = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rows = (p: string) =>
  readFileSync(p, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
const norm = (s: string) => s.replace(/\r\n/g, "\n");
const git = (...a: string[]) =>
  execFileSync("git", ["-C", root, ...a], { maxBuffer: 32 * 1024 * 1024 });
const manifest = j(owned + "/input-manifest.json");
for (const file of readdirSync(prior))
  assert.equal(
    norm(readFileSync(prior + "/" + file, "utf8")),
    norm(
      git(
        "show",
        manifest.acceptedPriorRevision + ":" + priorRel + "/" + file,
      ).toString("utf8"),
    ),
    "accepted evidence drift",
  );
if (process.argv[2])
  for (const file of readdirSync(owned))
    assert.equal(
      norm(readFileSync(owned + "/" + file, "utf8")),
      norm(
        git("show", process.argv[2] + ":" + rel + "/" + file).toString("utf8"),
      ),
      "owned evidence revision drift",
    );
const priorManifest = j(prior + "/input-manifest.json");
for (const b of priorManifest.bindings)
  assert.equal(
    norm(readFileSync(root + "/" + b.path, "utf8")),
    norm(git("show", b.revision + ":" + b.path).toString("utf8")),
    "shared baseline drift",
  );
const ds = rows(prior + "/dispositions.jsonl").filter((d) =>
  ["no-existing-entity", "homonym-mechanic-mismatch"].includes(
    d.classification,
  ),
);
const old = rows(prior + "/occurrences.jsonl");
const expected = ds.map((d) => old.find((c) => c.sourceKey === d.sourceKey));
const cs = rows(owned + "/selected-occurrences.jsonl"),
  en = rows(owned + "/local-english.jsonl"),
  decisions = rows(owned + "/dispositions.jsonl");
assert(equal(cs, expected), "exact selected evidence changed");
assert.equal(cs.length, 10);
assert.equal(new Set(cs.map((c) => c.sourceKey)).size, 10);
assert.equal(
  cs.reduce((n, c) => n + c.rawHeader.length + c.rawBody.length, 0),
  4082,
);
assert(
  equal(
    cs.map((c) => c.sourceKey),
    manifest.selectedKeys,
  ),
);
assert.equal(en.length, 10);
assert.equal(decisions.length, 10);
assert(
  equal(
    decisions.map((d) => d.sourceKey),
    cs.map((c) => c.sourceKey),
  ) &&
    equal(
      en.map((d) => d.sourceKey),
      cs.map((c) => c.sourceKey),
    ),
  "row coverage drift",
);
for (const d of decisions)
  assert(
    d.activation === false &&
      d.baselineAccepted === false &&
      d.currentDbEnglishQa === false &&
      d.targetIdAssigned === false &&
      d.next &&
      d.requiredDependencies.length,
    "authority/next-action gap",
  );
for (const file of new Set(cs.map((c) => c.file))) {
  const path = "spells-dice-db-by-mo/" + file,
    bytes = readFileSync(root + "/" + path);
  assert.equal(
    norm(bytes.toString("utf8")),
    norm(git("show", manifest.sourceRevision + ":" + path).toString("utf8")),
    "selected source drift",
  );
  const parsed = parseDiceFile(file, bytes);
  for (const c of cs.filter((c) => c.file === file)) {
    const p = parsed.records.find(
      (p) => p.startLine === c.startLine && p.ordinal === c.ordinal,
    );
    assert(
      p && p.header === c.rawHeader && p.rawBody === c.rawBody,
      "maintained parser selection drift",
    );
  }
}
for (const input of manifest.inputs) {
  const path = root + "/" + input.path,
    s = statSync(path);
  assert(
    s.size === input.bytes && s.mtimeMs === input.mtimeMs,
    "local input metadata drift",
  );
  if (input.revision) {
    const committed = git("show", input.revision + ":" + input.path);
    assert(
      input.path.endsWith(".sqlite")
        ? readFileSync(path).equals(committed)
        : norm(readFileSync(path, "utf8")) === norm(committed.toString("utf8")),
      "local input revision drift",
    );
  }
}
const parsed = j(root + "/spells-full/spells-parsed.json");
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
for (const e of en) {
  const matches = parsed
    .map((record: any, rowIndex: number) => ({ rowIndex, record }))
    .filter((x: any) =>
      e.searchNames.some((n: string) => key(n) === key(x.record.name)),
    );
  assert(equal(matches, e.parsedMatches), "parsed candidate drift");
  for (const v of e.rawVersions) {
    const ls = readFileSync(root + "/" + v.path, "utf8").split(/\r?\n/);
    if (v.text)
      assert(
        ls.slice(v.startLine - 1, v.endLine).join("\n") === v.text &&
          ls[v.startLine - 1] === v.header,
        "complete English range drift",
      );
    else
      assert(
        !ls.some(
          (l) =>
            /^\t[^\t]+ \[[^\n]+\]\s*$/.test(l) &&
            e.searchNames.some(
              (n: string) => key(l.split(" [")[0].trim()) === key(n),
            ),
        ),
        "missing English gained a header match",
      );
  }
}
const identity = j(owned + "/identity-checks.json"),
  db = new Database(manifest.operatorStats[0].path, {
    readonly: true,
    fileMustExist: true,
  });
db.pragma("query_only=ON");
const english = loadEnglishRecords(db);
const current = cs.map((c: any, i: number) => ({
  sourceKey: c.sourceKey,
  searchNames: en[i].searchNames,
  exactNormalizedHits: [...english]
    .filter(([id, e]) =>
      en[i].searchNames.some((n: string) => key(n) === key(e.name)),
    )
    .map(([id, e]) => ({ id, english: e })),
  currentPublicationTargetCount: [...english.values()].filter(
    (e) => e.rulebookId === c.publicationRulebookIds[0],
  ).length,
}));
assert(equal(current, identity.currentDbChecks), "current identity changed");
assert(
  current.slice(0, 9).every((c) => c.exactNormalizedHits.length === 0) &&
    current[9].exactNormalizedHits.length === 1 &&
    current[9].exactNormalizedHits[0].id === 3585,
  "absence/homonym drift",
);
assert(
  equal(
    db.prepare("SELECT * FROM dnd_rulebook WHERE id IN (63,64,88)").all(),
    identity.books,
  ),
  "book metadata changed",
);
assert(
  equal(
    db
      .prepare(
        "SELECT * FROM dnd_dndedition WHERE id IN (SELECT dnd_edition_id FROM dnd_rulebook WHERE id IN (63,64,88))",
      )
      .all(),
    identity.editions,
  ),
  "edition metadata changed",
);
const up = new Database(root + "/upstream/dndtools/dnd.sqlite", {
  readonly: true,
  fileMustExist: true,
});
up.pragma("query_only=ON");
const un = up
  .prepare("SELECT id,name,rulebook_id FROM dnd_spell")
  .all() as any[];
assert(
  equal(
    cs.map((c: any, i: number) => ({
      sourceKey: c.sourceKey,
      searchNames: en[i].searchNames,
      hits: un.filter((e) =>
        en[i].searchNames.some((n: string) => key(n) === key(e.name)),
      ),
    })),
    identity.upstreamChecks,
  ),
  "upstream identities changed",
);
const projection = j(owned + "/proposed-admission-fields.json");
assert(
  projection.activation === false &&
    projection.baselineAccepted === false &&
    !("id" in projection.admissionFields) &&
    equal(projection.chinese, cs[9]),
);
const web = rows(owned + "/web-references.jsonl");
assert.equal(web.length, 10);
assert(
  equal(
    web.map((w) => w.sourceKey),
    cs.map((c) => c.sourceKey),
  ),
  "web coverage drift",
);
assert(
  web.every(
    (w) =>
      w.activation === false &&
      w.baselineAccepted === false &&
      w.urls.length &&
      w.urls.every((u: string) => /^https:\/\//.test(u)) &&
      w.next,
  ),
  "web authority/locator gap",
);
assert.equal(decisions.filter((d) => d.webPublicationConflict).length, 9);
assert.equal(
  decisions.filter((d) => d.status === "publication-version-dependency").length,
  4,
);
assert.equal(
  decisions.filter((d) => d.status === "web-reference-text-dependency").length,
  5,
);
assert.equal(
  decisions.filter((d) => d.status === "proposed-baseline-awaiting-acceptance")
    .length,
  1,
);
const errors: string[] = [];
validateInsertSpellShape(
  { op: "insertSpell", ...projection.admissionFields },
  1,
  errors,
  true,
);
assert(
  equal(errors, j(owned + "/schema-check.json").expectedErrors) &&
    errors.length === 1 &&
    errors[0] === "line 1: id must be a positive integer",
  "maintained schema gate changed",
);
assert(
  db.pragma("query_only", { simple: true }) === 1 &&
    up.pragma("query_only", { simple: true }) === 1,
);
db.close();
up.close();
for (const d of manifest.operatorStats) {
  const s = statSync(d.path);
  assert(
    s.size === d.bytes && s.mtimeMs === d.mtimeMs,
    "operator DB metadata changed",
  );
}
const state = j(owned + "/initial-private-state.json");
const filtered = (b: Buffer, index: boolean) =>
  b
    .toString("utf8")
    .split("\0")
    .filter(
      (s) =>
        s && !(index ? s.split("\t")[1] : s.slice(3))?.startsWith(rel + "/"),
    )
    .join("\0");
assert.equal(
  filtered(git("ls-files", "--stage", "-z"), true),
  filtered(Buffer.from(state.index, "base64"), true),
  "unrelated index changed",
);
assert.equal(
  filtered(
    git("status", "--porcelain=v1", "-z", "--untracked-files=all"),
    false,
  ),
  filtered(Buffer.from(state.status, "base64"), false),
  "unrelated status/path changed",
);
console.log(
  JSON.stringify({
    result: "PASS",
    records: 10,
    localEnglishCandidates: 5,
    localEnglishGaps: 5,
    webReferences: 10,
    webPublicationConflicts: 9,
    sourceMetadataDependencies: 4,
    reliableFullTextDependencies: 5,
    futureBaselineDecisionCandidates: 1,
    activated: 0,
    idsAssigned: 0,
    expectedSchemaGate: errors,
    elapsedSeconds: (performance.now() - start) / 1000,
    maxRssKiB: process.resourceUsage().maxRSS,
  }),
);
