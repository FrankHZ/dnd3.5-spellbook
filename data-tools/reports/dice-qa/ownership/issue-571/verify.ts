import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual as same } from "node:util";
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import { localDataDir, repoRoot } from "../../../../src/shared/env";
import {
  candidateRulebook,
  loadEnglishRecords,
  validateSourceCoverage,
} from "../../../../src/dice-intake/qa";
import { parseDiceFile } from "../../../../src/dice-intake/parse";
import { reconcile } from "../../../../src/dice-intake/reconcile";
// Issue-owned, read-only replay; no CLI outputs, importers or database mutation.
const started = performance.now(),
  root = localDataDir(),
  base = "dice-baselines/issue-520",
  rel = base + "/ownership/issue-571",
  owned = root + "/" + rel;
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rows = (p: string) =>
  readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const git = (...a: string[]) =>
  execFileSync("git", ["-C", root, ...a], { maxBuffer: 40 * 1024 * 1024 });
const norm = (s: string) => s.replace(/\r\n/g, "\n");
const bound = (p: string, rev: string) => {
  const s = readFileSync(root + "/" + p, "utf8");
  assert.equal(
    norm(s),
    norm(git("show", rev + ":" + p).toString("utf8")),
    "committed input drift " + p,
  );
  return s;
};
const m = json(owned + "/input-manifest.json");
assert.equal(m.publicBase, "da7a2957d92f81122c5684483c8f7daf002e2e21");
assert.equal(m.preparedRevision, "6d28f9391273979a35a6bcc86971f0aac5b9f2c8");
assert.equal(m.sourceRevision, "47a23f9b36b4b827ebf14d7d05f3e564465c6fd5");
for (const b of m.bindings) bound(b.path, b.revision);
if (process.argv[2]) {
  assert(/^[a-f0-9]{40}$/.test(process.argv[2]));
  const files = git("ls-tree", "-r", "--name-only", process.argv[2], "--", rel)
    .toString("utf8")
    .trim()
    .split("\n");
  assert(
    same(
      files.map((p) => p.slice(rel.length + 1)).sort(),
      readdirSync(owned).sort(),
    ),
    "owned membership drift",
  );
  for (const p of files) bound(p, process.argv[2]);
}
const stats = () =>
  m.readonly.databases.map((d: any) => ({
    path: d.path,
    size: statSync(d.path).size,
    mtimeMs: statSync(d.path).mtimeMs,
  }));
assert(same(stats(), m.readonly.databases));
const rules = new Database(m.readonly.databases[0].path, {
    readonly: true,
    fileMustExist: true,
  }),
  content = new Database(m.readonly.databases[1].path, {
    readonly: true,
    fileMustExist: true,
  });
for (const d of [rules, content]) {
  d.pragma("query_only=ON");
  assert.equal(d.pragma("query_only", { simple: true }), 1);
}
const english = loadEnglishRecords(rules),
  books: any[] = rules
    .prepare("SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook")
    .all();
assert(
  same(
    m.publications.books,
    books.filter((b) => m.publications.books.some((p: any) => p.id === b.id)),
  ),
);
assert(
  same(
    m.publications.editions,
    (rules.prepare("SELECT * FROM dnd_dndedition").all() as any[]).filter((e) =>
      m.publications.editions.some((p: any) => p.id === e.id),
    ),
  ),
);
const zh: any[] = content
    .prepare(
      "SELECT spellId,rulebookId,variant,name,descriptionText,descriptionHtml,sourceKey FROM I18nSpellText WHERE lang='zh'",
    )
    .all(),
  chm = new Map(
    zh.filter((t) => t.variant === "chm").map((t) => [t.spellId, t]),
  );
const targets = [...english].map(([id, e]) => ({
  id,
  rulebookId: e.rulebookId,
  enName: e.name,
  zhName: chm.get(id)?.name ?? null,
  zhBody: chm.get(id)?.descriptionText ?? null,
}));
const files = readdirSync(root + "/spells-dice-db-by-mo")
  .filter((n) => n.endsWith(".txt"))
  .sort()
  .map((n) => {
    const p = "spells-dice-db-by-mo/" + n;
    bound(p, m.sourceRevision);
    const bytes = readFileSync(root + "/" + p);
    return { bytes: bytes.length, parsed: parseDiceFile(n, bytes) };
  });
const candidates = rows(root + "/" + base + "/intake/candidates.jsonl");
validateSourceCoverage(
  files,
  rows(root + "/" + base + "/intake/source-inventory.jsonl"),
  candidates,
);
assert.equal(files.length, 105);
assert.equal(
  files.reduce((n, f) => n + f.bytes, 0),
  m.sourceBytes,
);
const replay = reconcile(
  files.flatMap((f) => f.parsed.records),
  json(root + "/dice-intake/publication-map.json"),
  books,
  targets,
  m.sourceRevision,
  json(root + "/chm-mapping/enName-aliases-global.json"),
);
assert(
  same(replay.candidates, candidates) &&
    same(
      replay.targetDispositions,
      rows(root + "/" + base + "/intake/target-inventory.jsonl"),
    ),
);
const ordinals = [
  5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 21, 22, 28, 31, 33, 34, 35,
  36, 40, 41, 42, 44, 45, 49, 50, 51, 52, 53, 54, 55, 57, 58, 61, 62, 73, 79,
  80,
];
const all = candidates.filter(
    (t) => t.file === "完美奥术.txt" && candidateRulebook(t) === null,
  ),
  selected = all.filter((t) => ordinals.includes(t.ordinal)),
  keys = selected.map((t) => t.sourceKey);
assert.equal(all.length, 78);
assert(
  same(selected, rows(owned + "/occurrences.jsonl")) &&
    same(
      selected.map((t) => t.ordinal),
      ordinals,
    ) &&
    same(keys, m.selection.sourceKeys),
);
assert.equal(new Set(keys).size, 40);
assert(selected.every((t) => t.targetId === null));
assert.equal(
  selected.reduce((n, t) => n + t.rawHeader.length + t.rawBody.length, 0),
  16052,
);
assert(
  same(
    all.filter((t) => !ordinals.includes(t.ordinal)).map((t) => t.ordinal),
    m.selection.remainingOrdinals,
  ) && m.selection.remainingOrdinals.length === 38,
);
const gp = m.globalPartition,
  prior = gp.priorEvidence.map((p: any) =>
    bound(p.path, p.revision).trim().split(/\r?\n/).map(JSON.parse),
  ),
  outside = new Set([...prior.flat(), ...selected].map((t) => t.sourceKey)),
  inside = candidates.filter((t) =>
    gp.bookScope.includes(candidateRulebook(t)),
  );
assert(
  same(
    prior.map((p: any[]) => p.length),
    [33, 43, 58],
  ) &&
    outside.size === 174 &&
    inside.length === 3293 &&
    !inside.some((t) => outside.has(t.sourceKey)),
);
assert.equal(
  candidates.filter(
    (t) =>
      !gp.bookScope.includes(candidateRulebook(t)) && !outside.has(t.sourceKey),
  ).length,
  2139,
);
assert.equal(candidates.length, 5606);
assert.equal(english.size, 5097);
assert.equal(new Set(candidates.map((t) => t.sourceKey)).size, 5606);
assert.equal(3293 + 33 + 43 + 58 + 40 + 2139, 5606);
const prior545 = JSON.parse(
    bound(gp.priorEvidence[0].manifestPath, gp.priorEvidence[0].revision),
  ),
  otherBooks = prior545.byBook.map((b: any) => b.rulebook.id);
assert.equal(
  targets.filter((t) => gp.bookScope.includes(t.rulebookId)).length,
  3998,
);
assert.equal(
  targets.filter((t) => otherBooks.includes(t.rulebookId)).length,
  104,
);
assert.equal(
  targets.filter(
    (t) =>
      !gp.bookScope.includes(t.rulebookId) &&
      !otherBooks.includes(t.rulebookId),
  ).length,
  995,
);
const inputs = rows(owned + "/related-db-inputs.jsonl"),
  lookups = rows(owned + "/identity-lookups.jsonl"),
  canon = (s: string | null) => s?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
assert.equal(inputs.length, 111);
assert.equal(new Set(inputs.map((t) => t.book.id)).size, 14);
assert.equal(
  inputs.reduce((n, t) => n + t.english.description.length, 0),
  90311,
);
for (const d of inputs) {
  assert(
    same(d.english, english.get(d.targetId)) &&
      same(
        d.book,
        books.find((b) => b.id === d.book.id),
      ) &&
      same(
        d.chinese,
        zh.filter((z) => z.spellId === d.targetId),
      ),
  );
  const h: any = rules
    .prepare(
      "SELECT CAST(description_html AS BLOB) AS html FROM dnd_spell WHERE id=?",
    )
    .get(d.targetId);
  assert.equal(d.englishHtml, h.html?.toString("utf8") ?? null);
}
for (const [i, l] of lookups.entries()) {
  const s = selected[i],
    ids = [
      ...new Set([
        ...s.nameHintTargetIds,
        ...s.aliasHintTargetIds,
        ...[...english]
          .filter(([id, e]) => canon(e.name) === canon(s.enName))
          .map(([id]) => id),
      ]),
    ];
  assert(
    l.row === i + 1 &&
      l.sourceKey === s.sourceKey &&
      same(ids, l.relatedTargetIds),
  );
  assert(
    same(
      l.peerSourceKeys,
      candidates
        .filter(
          (t) =>
            t.sourceKey !== s.sourceKey && canon(t.enName) === canon(s.enName),
        )
        .map((t) => t.sourceKey),
    ),
  );
}
const peers = rows(owned + "/duplicate-peers.jsonl"),
  comparisons = rows(owned + "/duplicate-comparison.jsonl");
assert.equal(peers.length, 61);
assert.equal(comparisons.length, 61);
assert(
  same(
    peers,
    candidates.filter((t) =>
      lookups.some((l) => l.peerSourceKeys.includes(t.sourceKey)),
    ),
  ),
);
for (const d of comparisons) {
  const a = selected[d.row - 1],
    b = peers.find((t) => t.sourceKey === d.peerSourceKey);
  assert(a.sourceKey === d.sourceKey && b);
  assert.equal(d.rawBodyEqual, a.rawBody === b.rawBody);
  assert.equal(d.bodyTextEqual, a.bodyText === b.bodyText);
  assert(d.peerDispositionUnchanged);
}
const boundary = json(owned + "/source-boundaries.json"),
  file = files.find((f) => f.parsed.file === m.selection.file)!;
assert(
  file.bytes === boundary.bytes &&
    file.parsed.lineCount === boundary.lineCount &&
    same(file.parsed.unparsedSpans, boundary.unparsedSpans) &&
    boundary.unparsedSpans.length === 0,
);
assert(
  same(
    boundary.selected,
    selected.map((s) => ({
      sourceKey: s.sourceKey,
      ordinal: s.ordinal,
      startLine: s.startLine,
      endLine: s.endLine,
      suspectedBoundaryLines: s.suspectedBoundaryLines,
    })),
  ),
);
const sc = rows(owned + "/accepted-sc-references.jsonl");
assert.equal(sc.length, 40);
assert.equal(sc.filter((t) => t.successor).length, 3);
const si = JSON.parse(bound(sc[0].inputPath, sc[0].revision)).inputs,
  sf = bound(sc[0].fieldPath, sc[0].revision)
    .trim()
    .split(/\r?\n/)
    .map(JSON.parse);
for (const ref of sc) {
  const d = inputs.find((t) => t.targetId === ref.targetId),
    z = d.chinese.find((t: any) => t.variant === "effective");
  assert.equal(ref.revision, "0688739d92a2aa9fb3eceeb444daa7260e711058");
  assert(
    same(
      ref.englishInput,
      si.find((t: any) => t.targetId === ref.targetId).english,
    ) &&
      same(
        ref.fields,
        sf.filter((t: any) => t.targetId === ref.targetId),
      ),
  );
  assert.equal(ref.fields.find((t: any) => t.field === "name").text, z.name);
  if (ref.successor) {
    const u = ref.successor,
      j = JSON.parse(bound(u.path, u.revision)),
      actual = (Array.isArray(j) ? j : j.candidates).find(
        (t: any) => t.targetId === ref.targetId,
      );
    assert(same(actual, u.record));
    assert.equal(
      JSON.parse(bound(u.acceptancePath, u.acceptanceRevision)).body,
      u.acceptanceBody,
    );
    const a = actual.after ?? actual.proposedInput;
    assert(
      a.englishText === d.english.description &&
        a.englishHtml === d.englishHtml &&
        a.chineseText === z.descriptionText &&
        a.chineseHtml === z.descriptionHtml,
    );
    const old = { ...d.english, description: ref.englishInput.description };
    assert(same(old, ref.englishInput));
  } else {
    assert(same(ref.englishInput, d.english));
    assert.equal(
      ref.fields.find((t: any) => t.field === "body").text,
      z.descriptionText,
    );
    assert.equal(
      ref.fields.find((t: any) => t.field === "body").html,
      z.descriptionHtml,
    );
  }
  assert(Object.values(ref.currentMatches).every(Boolean));
}
const b55 = rows(owned + "/prior-book55-references.jsonl"),
  old55 = "dice-qa/books/55/",
  dec = rows(root + "/" + old55 + "decisions.jsonl"),
  acc = rows(root + "/" + old55 + "out/accepted.jsonl"),
  fall = rows(root + "/" + old55 + "out/fallback.jsonl");
assert.equal(b55.length, 40);
for (const ref of b55) {
  const d = inputs.find((t) => t.targetId === ref.targetId),
    z = d.chinese.find((t: any) => t.variant === "chm");
  assert.equal(ref.revision, m.sourceRevision);
  assert(
    !dec.some((t) => t.targetId === ref.targetId) &&
      !acc.some((t) => t.targetId === ref.targetId) &&
      ref.decision === null &&
      ref.accepted === null,
  );
  assert(
    same(
      ref.fallback,
      fall.filter((t) => t.targetId === ref.targetId),
    ) && ref.fallback.length === 2,
  );
  assert(
    ref.currentName === (z?.name ?? null) &&
      ref.currentBody === (z?.descriptionText ?? null) &&
      ref.currentHtml === (z?.descriptionHtml ?? null),
  );
}
const html = rows(owned + "/html-inspection.jsonl");
assert.equal(html.length, 111);
for (const h of html) {
  const d = inputs.find((t) => t.targetId === h.targetId),
    $ = cheerio.load(d.englishHtml ?? "");
  assert(
    h.tableCount === $("table").length &&
      h.imageCount === $("img").length &&
      h.tableCount === 0 &&
      h.imageCount === 0,
  );
  if (!h.htmlTextComparable) {
    assert([493, 4354].includes(h.targetId) && h.htmlText === $("body").text());
    const norm = (s: string) =>
      s
        .replaceAll("×", "x")
        .replace(/[^\p{L}\p{N}]/gu, "")
        .toLowerCase();
    assert.equal(norm(h.htmlText), norm(h.description));
  }
}
const ds = rows(owned + "/dispositions.jsonl");
assert.equal(ds.length, 40);
assert(
  same(
    ds.map((d) => d.sourceKey),
    keys,
  ),
);
assert.equal(ds.filter((d) => d.intendedVersion?.rulebookId === 55).length, 15);
assert.equal(ds.filter((d) => d.intendedVersion?.rulebookId === 86).length, 3);
assert.equal(ds.filter((d) => d.reasonCode === "mixed-version").length, 14);
assert.equal(
  ds.filter((d) => d.reasonCode === "indistinguishable-reprint").length,
  8,
);
for (const [i, d] of ds.entries()) {
  const s = selected[i],
    l = lookups[i];
  assert(
    d.row === i + 1 &&
      d.ordinal === s.ordinal &&
      d.startLine === s.startLine &&
      d.endLine === s.endLine &&
      d.completeRawAndRelatedInputsRead,
  );
  assert(
    same(
      d.existingTargetVersions.map((a: any) => a.targetId),
      l.relatedTargetIds,
    ),
  );
  for (const a of d.existingTargetVersions) {
    const t = inputs.find((t) => t.targetId === a.targetId);
    assert(
      a.rulebookId === t.book.id &&
        a.editionId === t.book.editionId &&
        a.fullEnglishAndMechanicsCompared &&
        a.inputRef === "related-db-inputs.jsonl:" + (inputs.indexOf(t) + 1),
    );
  }
  for (const a of d.locators)
    assert(
      a.line > s.startLine &&
        a.line <= s.endLine &&
        a.file === s.file &&
        s.rawBody.split("\n")[a.line - s.startLine - 1] === a.text &&
        a.text.includes(a.needle),
    );
  if (d.intendedVersion) {
    const v = d.intendedVersion,
      t = inputs.find((t) => t.targetId === v.targetId);
    assert(
      t &&
        v.rulebookId === t.book.id &&
        v.editionId === t.book.editionId &&
        l.relatedTargetIds.includes(v.targetId),
    );
  }
  assert(
    d.sourcePublication.nativeRulebook === null &&
      same(d.sourcePublication.labels, s.sourceBookLabels) &&
      same(d.sourcePublication.mappedClaims, s.publicationRulebookIds),
  );
  assert(
    !d.semanticQaPass &&
      !d.nativeAttached &&
      !d.activation &&
      !d.applied &&
      d.newAcceptedFields === 0 &&
      d.reason.length > 180,
  );
  for (const p of d.priorFields) {
    const refs = p.kind === "source-bound-SC" ? sc : b55,
      v = refs.find((t) => t.targetId === p.targetId);
    assert(v && v.revision === p.revision);
  }
}
const refs = json(owned + "/unactivated-references.json");
assert(
  !refs.activation &&
    !refs.applied &&
    !refs.semanticAcceptance &&
    [refs.mapChanges, refs.aliasChanges, refs.newEntities].every(
      (a) => a.length === 0,
    ),
);
assert(
  same(
    refs.deferredKeys,
    ds.filter((d) => !d.intendedVersion).map((d) => d.sourceKey),
  ),
);
assert(
  same(
    refs.references,
    ds
      .filter((d) => d.intendedVersion)
      .map((d) => ({
        sourceKey: d.sourceKey,
        ...d.intendedVersion,
        priorFields: d.priorFields,
        acceptedChineseFieldReuse: 0,
      })),
  ),
);
const out = repoRoot() + "/data-tools/out/issue-571",
  audit: any = {};
const records = (b: Buffer) => {
  assert.equal(b[b.length - 1], 0);
  const a: Buffer[] = [];
  let last = 0;
  for (let i = 0; i < b.length; i++)
    if (b[i] === 0) {
      a.push(b.subarray(last, i + 1));
      last = i + 1;
    }
  return a;
};
for (const [label, args] of [
  ["index", ["ls-files", "--stage", "-z"]],
  ["status", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]],
  ["untracked", ["ls-files", "--others", "--exclude-standard", "-z"]],
] as const) {
  const filter = (b: Buffer) =>
    records(b).filter((v) => {
      const s = v.toString("utf8");
      assert(label !== "status" || (!s.startsWith("R") && !s.startsWith("C")));
      const path =
        label === "index"
          ? s.slice(s.indexOf("\t") + 1, -1)
          : label === "status"
            ? s.slice(3, -1)
            : s.slice(0, -1);
      return !path.startsWith(rel + "/");
    });
  const before = readFileSync(out + "/" + label + "-before.nul"),
    after = git(...args);
  assert(
    Buffer.concat(filter(before)).equals(Buffer.concat(filter(after))),
    "nonowned raw NUL " + label + " drift",
  );
  audit[label] = filter(before).length;
  if (label === "status")
    assert.equal(
      records(before).filter((t) => t.toString("utf8").startsWith("D ")).length,
      39,
    );
}
assert.equal(audit.untracked, 1441);
rules.close();
content.close();
assert(same(stats(), m.readonly.databases));
const publicRoot =
    repoRoot() + "/data-tools/reports/dice-qa/ownership/issue-571",
  summary = json(owned + "/review-summary.json"),
  publicSummary = json(publicRoot + "/summary.json");
assert(same(summary, publicSummary.results));
if (process.argv[2])
  assert.equal(publicSummary.privateEvidenceRevision, process.argv[2]);
const csv = readFileSync(publicRoot + "/dispositions.csv", "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1);
assert(
  same(
    csv,
    ds.map((d) =>
      [
        d.row,
        d.ordinal,
        d.startLine,
        d.endLine,
        d.status,
        d.reasonCode,
        d.intendedVersion?.targetId ?? "",
        d.intendedVersion?.rulebookId ?? "",
        false,
        0,
        false,
      ].join(","),
    ),
  ),
);
const bytes = (p: string): number =>
  readdirSync(p, { withFileTypes: true }).reduce(
    (n, f) =>
      n +
      (f.isDirectory()
        ? bytes(p + "/" + f.name)
        : statSync(p + "/" + f.name).size),
    0,
  );
assert(
  bytes(owned) < 3 * 1024 * 1024 &&
    bytes(out) < 3 * 1024 * 1024 &&
    process.resourceUsage().maxRSS < 512 * 1024 &&
    performance.now() - started < 60_000,
);
console.log(
  JSON.stringify({
    status: "PASS",
    selected: 40,
    supported: 18,
    deferred: 22,
    relatedTargets: 111,
    scEnvelopes: 40,
    scSuccessors: 3,
    book55Fallbacks: 40,
    parentUnseenCurrent: 2179,
    parentUnseenAfterAcceptance: 2139,
    nativeAttached: 0,
    newAcceptedFields: 0,
    queryOnly: [1, 1],
    privateStatePreserved: true,
    audit,
    privateBytes: bytes(owned),
    temporaryBytes: bytes(out),
    seconds: (performance.now() - started) / 1000,
    maxRssKiB: process.resourceUsage().maxRSS,
  }),
);
