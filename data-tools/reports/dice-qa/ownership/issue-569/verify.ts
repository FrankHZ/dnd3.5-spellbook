import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual as same } from "node:util";
import Database from "better-sqlite3";
import { localDataDir } from "../../../../src/shared/env";
import { parseDiceFile } from "../../../../src/dice-intake/parse";
import { reconcile } from "../../../../src/dice-intake/reconcile";
import {
  loadEnglishRecords,
  validateSourceCoverage,
} from "../../../../src/dice-intake/qa";

// Bounded read-only evidence replay. Never invokes an output-producing CLI.
const start = performance.now(),
  root = localDataDir();
const base = "dice-baselines/issue-520",
  prior = base + "/ownership/issue-545";
const rel = base + "/ownership/issue-569",
  owned = root + "/" + rel;
const j = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const rows = (p: string) =>
  readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const git = (...a: string[]) =>
  execFileSync("git", ["-C", root, ...a], { maxBuffer: 40 * 1024 * 1024 });
const norm = (b: Buffer) => b.toString("utf8").replace(/\r\n/g, "\n");
const m = j(owned + "/input-manifest.json");
assert.equal(
  m.acceptedPriorRevision,
  "58d7e6424f16b31492d495a972506455f7d1a823",
);
assert.equal(m.preparedRevision, "6d28f9391273979a35a6bcc86971f0aac5b9f2c8");
assert.equal(m.sourceRevision, "47a23f9b36b4b827ebf14d7d05f3e564465c6fd5");
for (const b of m.bindings)
  assert.equal(
    norm(readFileSync(root + "/" + b.path)),
    norm(git("show", b.revision + ":" + b.path)),
    "bound input drift: " + b.path,
  );
if (process.argv[2]) {
  assert(
    /^[0-9a-f]{40}$/.test(process.argv[2]),
    "exact private revision required",
  );
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
  for (const p of files)
    assert.equal(
      norm(readFileSync(root + "/" + p)),
      norm(git("show", process.argv[2] + ":" + p)),
      "owned blob drift",
    );
}
const old = rows(root + "/" + prior + "/occurrences.jsonl");
const cs = rows(owned + "/selected-occurrences.jsonl");
assert(
  same(cs, [...old.slice(21, 27), ...old.slice(28, 33)]),
  "selection drift",
);
assert.equal(cs.length, 11);
assert(
  same(
    cs.map((c) => c.sourceKey),
    m.selectedKeys,
  ),
);
assert.equal(new Set(m.selectedKeys).size, 11);
assert.equal(
  cs.reduce((n, c) => n + c.rawHeader.length + c.rawBody.length, 0),
  3260,
);
assert.equal(m.rawCharacters, 3260);
const ids = [
  4943, 4931, 4932, 4944, 4948, 4949, 4954, 4960, 4961, 4963, 177, 1536,
];
const inputs = rows(owned + "/current-target-inputs.jsonl");
assert(
  same(m.expectedTargetIds, ids) &&
    same(
      inputs.map((t) => t.targetId),
      ids,
    ),
);
assert.equal(
  inputs.reduce((n, t) => n + t.english.description.length, 0),
  7726,
);
assert.equal(m.englishBodyCharacters, 7726);
const stats = () =>
  m.operatorStats.map((d: any) => {
    const s = statSync(d.path);
    return { path: d.path, size: s.size, mtimeMs: s.mtimeMs };
  });
assert(same(stats(), m.operatorStats), "operator metadata drift");
const rules = new Database(m.operatorStats[0].path, {
  readonly: true,
  fileMustExist: true,
});
const content = new Database(m.operatorStats[1].path, {
  readonly: true,
  fileMustExist: true,
});
rules.pragma("query_only=ON");
content.pragma("query_only=ON");
const english = loadEnglishRecords(rules);
const books: any[] = rules
  .prepare("SELECT id,name,dnd_edition_id AS editionId FROM dnd_rulebook")
  .all();
assert(
  same(
    m.publications.books,
    books.filter((b) => [37, 64, 72, 102, 110].includes(b.id)),
  ),
);
assert(
  same(
    m.publications.editions,
    rules.prepare("SELECT * FROM dnd_dndedition WHERE id IN (5,7)").all(),
  ),
);
assert.equal(
  [...english.values()].filter((e) => [64, 102].includes(e.rulebookId)).length,
  0,
);
assert.equal(
  [...english.values()].filter((e) => e.rulebookId === 110).length,
  10,
);
const oldInputs = rows(root + "/" + prior + "/related-db-inputs.jsonl");
for (const t of inputs) {
  assert(
    same(t.english, english.get(t.targetId)) &&
      same(t.english, oldInputs.find((p) => p.targetId === t.targetId).english),
  );
  assert.equal(
    t.englishHtml,
    (
      rules
        .prepare("SELECT description_html AS html FROM dnd_spell WHERE id=?")
        .get(t.targetId) as any
    ).html,
  );
  assert(
    same(
      t.chinese,
      content
        .prepare(
          "SELECT variant,name,descriptionText,descriptionHtml FROM I18nSpellText WHERE spellId=? AND lang='zh' ORDER BY variant",
        )
        .all(t.targetId),
    ),
  );
}
const files = readdirSync(root + "/spells-dice-db-by-mo")
  .filter((f) => f.endsWith(".txt"))
  .sort()
  .map((file) => {
    const bytes = readFileSync(root + "/spells-dice-db-by-mo/" + file);
    assert.equal(
      norm(bytes),
      norm(git("show", m.sourceRevision + ":spells-dice-db-by-mo/" + file)),
    );
    return { bytes: bytes.length, parsed: parseDiceFile(file, bytes) };
  });
const candidates = rows(root + "/" + base + "/intake/candidates.jsonl");
validateSourceCoverage(
  files,
  rows(root + "/" + base + "/intake/source-inventory.jsonl"),
  candidates,
);
const zh = new Map<number, any>(
  (
    content
      .prepare(
        "SELECT spellId,name,descriptionText FROM I18nSpellText WHERE lang='zh' AND variant='chm'",
      )
      .all() as any[]
  ).map((t) => [t.spellId, t]),
);
const targets = [...english].map(([id, e]) => ({
  id,
  rulebookId: e.rulebookId,
  enName: e.name,
  zhName: zh.get(id)?.name ?? null,
  zhBody: zh.get(id)?.descriptionText ?? null,
}));
const frozen = reconcile(
  files.flatMap((f) => f.parsed.records),
  j(root + "/dice-intake/publication-map.json"),
  books,
  targets,
  m.sourceRevision,
  j(root + "/chm-mapping/enName-aliases-global.json"),
);
assert(same(frozen.candidates, candidates));
assert(
  same(
    frozen.targetDispositions,
    rows(root + "/" + base + "/intake/target-inventory.jsonl"),
  ),
);
assert.equal(candidates.length, 5606);
assert.equal(targets.length, 5097);
for (const c of cs) {
  assert(
    same(
      c,
      candidates.find((p) => p.sourceKey === c.sourceKey),
    ),
  );
  assert.equal(c.targetId, null); // Selected occurrences remain natively unmatched.
}
const peers = rows(owned + "/peer-occurrences.jsonl");
assert(
  same(
    peers,
    candidates.filter(
      (c) =>
        c.file === "上古邪物.txt" &&
        cs.slice(0, 10).some((s) => s.enName === c.enName),
    ),
  ),
);
const duplicates = rows(owned + "/duplicate-comparison.jsonl");
assert.equal(duplicates.length, 10);
for (const [i, d] of duplicates.entries()) {
  const c = cs[i],
    p = peers.find((p) => p.targetId === ids[i]);
  assert(
    d.sourceKey === c.sourceKey &&
      d.peerSourceKey === p.sourceKey &&
      d.targetId === ids[i],
  );
  assert.equal(
    d.payloadEqual,
    c.zhName === p.zhName && c.rawBody === p.rawBody,
  );
  if (d.selectedAction !== null) assert(c.rawBody.includes(d.selectedAction));
  if (d.peerAction !== null) assert(p.rawBody.includes(d.peerAction));
  assert.equal(d.publicationEquivalent, false);
}
assert.equal(duplicates.filter((d) => d.payloadEqual).length, 8);
assert(
  same(
    duplicates.filter((d) => !d.payloadEqual).map((d) => d.targetId),
    [4960, 4963],
  ),
);
const oldDrafts = rows(root + "/dice-qa/books/110/unapplied-evidence.jsonl");
const refs = rows(owned + "/unactivated-references.jsonl"),
  clauses = rows(owned + "/clause-review.jsonl");
assert(
  same(
    refs.map((h) => h.targetId),
    ids.slice(0, 10),
  ),
);
assert.equal(clauses.length, 29);
for (const [i, h] of refs.entries()) {
  const t = inputs[i],
    oldDraft = oldDrafts.find((p) => p.targetId === t.targetId);
  assert(same(oldDraft.english, t.english), "historical draft English changed");
  assert.equal(h.sourceKey, cs[i].sourceKey);
  assert.equal(h.proposedName, oldDraft.sourceName);
  assert.equal(h.rulebookId, 110);
  assert.equal(h.editionId, 5);
  assert(
    same(h.mechanicsReview.english, t.english.mechanics) &&
      h.mechanicsReview.complete,
  );
  assert.equal(
    h.proposedDescriptionText,
    h.segments.map((s: any) => s.afterText).join("\n\n"),
  );
  assert.equal(
    h.proposedDescriptionHtml,
    h.segments.map((s: any) => s.afterHtml).join(""),
  );
  assert(
    same(
      h.segments.map((s: any) => s.englishText),
      t.english.description.split("\n\n"),
    ),
    "full paragraph coverage gap",
  );
  for (const s of h.segments) {
    assert.equal(s.afterHtml, "<p>" + s.afterText + "</p>");
    const c = clauses.find(
      (c) => c.targetId === t.targetId && c.paragraph === s.paragraph,
    );
    for (const k of ["sourceKey", "englishText", "afterText", "afterHtml"])
      assert.equal(c[k], k === "sourceKey" ? h[k] : s[k]);
    assert(s.afterText.length && c.review.length && c.nativeAccepted === false);
  }
  assert(
    h.status === "supported-db-english-reference" &&
      h.publicationBinding === "unresolved-distinct-book64-and110",
  );
  assert(
    !h.activation &&
      !h.applied &&
      !h.nativeAccepted &&
      !h.nativeAttached &&
      !h.originalBookAuthenticated,
  );
  assert(
    h.priorFieldOwner.issue === 195 &&
      h.priorFieldOwner.recoveredRevision === m.sourceRevision,
  );
}
// Bind material reviewed rules to the actual after text, rather than review labels.
const probes: [number, string[]][] = j(owned + "/after-rule-probes.json");
for (const [id, tokens] of probes)
  for (const token of tokens)
    assert(
      refs
        .find((h) => h.targetId === id)
        .proposedDescriptionText.includes(token),
      "reviewed after rule missing",
    );
const v = j(owned + "/version-reference-review.json");
assert(
  v.sourceKey === cs[10].sourceKey &&
    v.proposedTargetId === null &&
    v.publicationTargetCount === 0 &&
    !v.activation &&
    !v.nativeAccepted,
);
const d177 = rows(
  root + "/" + base + "/qa/books/37/slices/issue-539/decisions.jsonl",
).find((d) => d.targetId === 177);
const a177 = rows(
  root + "/" + base + "/qa/books/37/slices/issue-539/actual-afters.jsonl",
).find((d) => d.targetId === 177);
const d1536 = rows(root + "/dice-qa/books/72/decisions.jsonl").find(
  (d) => d.targetId === 1536,
);
for (const [d, t] of [
  [d177, inputs[10]],
  [d1536, inputs[11]],
]) {
  assert.equal(d.input.englishDescription, t.english.description);
  assert(same(d.input.englishMechanics, t.english.mechanics));
}
assert(
  v.versions[0].name === a177.name &&
    v.versions[0].descriptionHtml === a177.descriptionHtml &&
    v.versions[0].descriptionText === a177.descriptionText,
);
assert(
  v.versions[1].name === inputs[11].chinese[0].name &&
    v.versions[1].descriptionHtml ===
      d1536.fields.descriptionHtml.replacementText,
);
assert(
  d1536.fields.name.status === "excluded" &&
    d1536.fields.descriptionHtml.status === "accepted",
);
assert(
  same(
    v.versions.map((t: any) => [t.targetId, t.rulebookId, t.editionId]),
    [
      [177, 37, 7],
      [1536, 72, 5],
    ],
  ),
);
assert.equal(inputs[10].english.mechanics.spellResistance, "No");
assert.equal(inputs[11].english.mechanics.spellResistance, "See below");
const versionProbes = j(owned + "/version-rule-probes.json");
assert(cs[10].rawBody.includes(versionProbes.rawDiameter));
for (const t of inputs.slice(10))
  assert(t.english.description.includes(versionProbes.englishRadius));
const ds = rows(owned + "/dispositions.jsonl"),
  residuals = rows(owned + "/residuals.jsonl");
assert.equal(ds.length, 11);
assert.equal(residuals.length, 3);
for (const [i, d] of ds.entries()) {
  assert(
    d.sourceKey === cs[i].sourceKey &&
      d.completeRawAndDbEnglishRead &&
      d.proposedTargetId === null &&
      !d.semanticQaPass &&
      !d.nativeAccepted &&
      !d.activation &&
      !d.applied,
  );
  assert(same(d.targetIds, i < 10 ? [ids[i]] : [177, 1536]));
  assert.equal(
    d.semantic,
    i < 10 ? "supported-db-english-reference" : "unresolved-version-binding",
  );
}
assert(residuals.every((r) => r.owner === 545));
assert(
  residuals[1].targetId === 4961 && same(residuals[2].targetIds, [177, 1536]),
);
assert(
  refs.filter((h) => h.sourceGap).length === 1 &&
    refs.find((h) => h.sourceGap).targetId === 4961,
);
assert.equal(rules.pragma("query_only", { simple: true }), 1);
assert.equal(content.pragma("query_only", { simple: true }), 1);
rules.close();
content.close();
assert(same(stats(), m.operatorStats));
const initial = j(owned + "/initial-private-state.json");
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
  filtered(Buffer.from(initial.index, "base64"), true),
  "unrelated index changed",
);
assert.equal(
  filtered(
    git("status", "--porcelain=v1", "-z", "--untracked-files=all"),
    false,
  ),
  filtered(Buffer.from(initial.status, "base64"), false),
  "unrelated status changed",
);
assert(initial.stagedDeletes === 39 && initial.untracked === 1441);
assert(
  !m.activation &&
    m.nativeAcceptedFields === 0 &&
    m.newUnseenOccurrencesReviewed === 0 &&
    m.parentUnseenRemaining === 2179,
);
assert(m.runtime.model === "gpt-6.1-sol" && m.runtime.effort === "high");
const result = {
  selected: 11,
  relatedTargetsRead: 12,
  rawCharacters: 3260,
  englishBodyCharacters: 7726,
  supportedReferenceNames: 10,
  supportedReferenceBodies: 10,
  paragraphsReviewed: 29,
  existingVersionReferenceFields: 4,
  unresolvedVersionBindings: 1,
  unresolvedPublicationOccurrences: 11,
  selectedExactPeerPayloads: 8,
  selectedDifferentPeerPayloads: 2,
  residualRecords: 3,
  nativeAttached: 0,
  nativeAcceptedFields: 0,
  totalCandidates: 5606,
  totalTargets: 5097,
  newUnseenReviewed: 0,
  parentUnseenRemaining: 2179,
  activated: 0,
  queryOnly: [1, 1],
  dbMetadataUnchanged: true,
  privateStatePreserved: true,
};
const publicSummary = j(
  new URL("./summary.json", import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
);
assert(same(publicSummary.results, result), "public summary drift");
const csv = readFileSync(new URL("./dispositions.csv", import.meta.url), "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1);
assert(
  same(
    csv,
    ds.map((d, i) =>
      [
        i + 1,
        d.targetIds.join(";"),
        d.semantic,
        d.publication,
        d.nameOutcome,
        d.bodyOutcome,
        d.inputResidual ?? "",
        0,
        0,
      ].join(","),
    ),
  ),
  "public disposition drift",
);
console.log(
  JSON.stringify({
    result: "PASS",
    ...result,
    seconds: (performance.now() - start) / 1000,
    maxRssKiB: process.resourceUsage().maxRSS,
  }),
);
