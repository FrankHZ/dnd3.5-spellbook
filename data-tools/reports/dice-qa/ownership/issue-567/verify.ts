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
  selectSliceScope,
  validateQaInputs,
  validateSourceCoverage,
} from "../../../../src/dice-intake/qa";

// Bounded evidence replay: no evidence, corpus, output or database writes.
const start = performance.now(),
  root = localDataDir();
const base = "dice-baselines/issue-520";
const prior = base + "/ownership/issue-545";
const rel = base + "/ownership/issue-567",
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
assert(
  same(m.acceptedByBook, {
    43: "d0b831615b7839ef4b070f5ab3fd573b13224cac",
    79: "7ef5bfb12471c465d9187784e13546b57a59563c",
    112: "42e04906674fa115a69ad960613e71775e8b7e99",
  }),
);
for (const b of m.bindings)
  assert.equal(
    norm(readFileSync(root + "/" + b.path)),
    norm(git("show", b.revision + ":" + b.path)),
    "input revision drift: " + b.path,
  );
if (process.argv[2]) {
  assert(
    /^[0-9a-f]{40}$/.test(process.argv[2]),
    "exact owned revision required",
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
    "owned file membership drift",
  );
  for (const p of files)
    assert.equal(
      norm(readFileSync(root + "/" + p)),
      norm(git("show", process.argv[2] + ":" + p)),
      "owned revision drift",
    );
}
const priorDs = rows(root + "/" + prior + "/dispositions.jsonl").filter((d) =>
  ["planar-map-review", "book112-space-alias"].includes(d.proposalId),
);
const old = rows(root + "/" + prior + "/occurrences.jsonl");
const cs = rows(owned + "/selected-occurrences.jsonl");
assert(
  same(
    cs,
    priorDs.map((d) => old.find((c) => c.sourceKey === d.sourceKey)),
  ),
  "frozen selection changed",
);
assert.equal(cs.length, 12);
assert.equal(new Set(cs.map((c) => c.sourceKey)).size, 12);
assert(
  same(
    cs.map((c) => c.sourceKey),
    m.selectedKeys,
  ),
);
const ids = [
  2175, 2203, 2177, 2163, 2164, 2209, 1859, 1847, 1848, 1849, 1851, 4957,
];
assert(
  same(m.expectedTargetIds, ids) &&
    same(
      priorDs.map((d) => d.relatedTargetIds[0]),
      ids,
    ),
);
assert.equal(
  cs.reduce((n, c) => n + c.rawHeader.length + c.rawBody.length, 0),
  4104,
);
const inputs = rows(owned + "/current-target-inputs.jsonl");
const handoff = rows(owned + "/unactivated-handoff.jsonl");
const decisions = rows(owned + "/binding-decisions.jsonl");
const residuals = rows(owned + "/input-residuals.jsonl");
for (const rs of [inputs, handoff, decisions]) {
  assert.equal(rs.length, 12);
  assert(
    same(
      rs.map((r) => r.targetId),
      ids,
    ) &&
      same(
        rs.map((r) => r.sourceKey),
        m.selectedKeys,
      ),
    "row ownership drift",
  );
}
assert.equal(
  inputs.reduce((n, t) => n + t.english.description.length, 0),
  8923,
);
assert(
  decisions.every(
    (d) =>
      d.binding === "supported-current-db-english" &&
      d.completeRawAndDbEnglishRead &&
      d.currentAcceptedInputsMatch &&
      d.afterReused &&
      !d.activation &&
      !d.applied &&
      !d.nativeAccepted &&
      !d.originalBookAuthenticated &&
      d.identity &&
      d.mechanics &&
      Array.isArray(d.differences),
  ),
  "decision authority gap",
);
assert.equal(
  decisions.filter((d) => d.actionVersion?.currentDb === "1 action").length,
  5,
);
assert(
  same(
    residuals.map((r) => [r.targetId, r.classification]),
    [
      [2175, "normalized-layout-residual"],
      [2175, "normalized-reference-gap"],
      [2163, "body-source-gap"],
      [2164, "body-source-gap"],
    ],
  ),
  "specific residual drift",
);

const stats = () =>
  m.operatorStats.map((d: any) => {
    const s = statSync(d.path);
    return { path: d.path, size: s.size, mtimeMs: s.mtimeMs };
  });
assert(same(stats(), m.operatorStats), "operator input metadata changed");
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
const editions = rules
  .prepare("SELECT * FROM dnd_dndedition WHERE id IN (3,5,7)")
  .all();
assert(
  same(
    books
      .filter((b) => [43, 79, 112].includes(b.id))
      .map((b) => [b.id, b.editionId]),
    [
      [43, 7],
      [79, 5],
      [112, 3],
    ],
  ),
);
const priorManifest = j(root + "/" + prior + "/input-manifest.json");
assert(
  same(
    books.filter((b) => [43, 79, 112].includes(b.id)),
    priorManifest.byBook
      .filter((b: any) => [43, 79, 112].includes(b.rulebook.id))
      .map((b: any) => b.rulebook),
  ),
  "accepted publication identity changed",
);
assert(
  same(m.publications, {
    books: books.filter((b) => [43, 79, 112].includes(b.id)),
    editions,
  }),
  "publication/edition snapshot drift",
);
for (const [i, t] of inputs.entries()) {
  const book = t.english.rulebookId,
    prefix = root + "/" + base + "/qa/books/" + book;
  const accepted = rows(prefix + "/target-inputs.jsonl").find(
    (t) => t.targetId === ids[i],
  );
  const { sourceKey, ...snapshot } = t;
  assert(
    same(snapshot, accepted) && same(t.english, english.get(t.targetId)),
    "accepted/current English or mechanics drift",
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
    "current Chinese changed",
  );
  const p = rows(prefix + "/unactivated-proposals.jsonl").find(
      (p) => p.targetId === t.targetId,
    ),
    h = handoff[i];
  assert(
    p &&
      p.activation === false &&
      !h.activation &&
      !h.nativeAttached &&
      !h.nativeAccepted,
  );
  for (const [field, property] of Object.entries({
    name: "proposedName",
    descriptionHtml: "proposedDescriptionHtml",
    descriptionText: "proposedDescriptionText",
  })) {
    const provenance = h.fieldProvenance[field];
    assert(
      same(provenance, {
        revision: m.acceptedByBook[book],
        path: base + "/qa/books/" + book + "/unactivated-proposals.jsonl",
        targetId: t.targetId,
        property,
      }),
    );
    assert.equal(h[property], p[property], "actual after changed");
    assert(h[property].length > 0);
  }
  assert.equal(h.sourceGap, p.sourceGap);
  assert.equal(
    h.proposedDescriptionHtml.replace(/<\/?ul>/g, ""),
    p.segments
      .map((s: any) => s.afterHtml)
      .join("")
      .replace(/<\/?ul>/g, ""),
  );
  assert.equal(
    h.proposedDescriptionText,
    p.segments.map((s: any) => s.afterText).join(book === 112 ? "\n\n" : "\n"),
  );
  const clauses = rows(prefix + "/clause-review.jsonl").filter(
    (c) => c.targetId === t.targetId,
  );
  assert(clauses.length > 0, "missing accepted actual-after clause evidence");
  if (book === 112) {
    const paragraphs = t.english.description.split("\n\n");
    assert.equal(p.segments.length, paragraphs.length);
    for (const [n, s] of p.segments.entries())
      assert(s.englishParagraph === n + 1 && s.englishText === paragraphs[n]);
    for (const c of clauses) {
      const s = p.segments[c.englishParagraph - 1];
      assert(
        s.englishText.includes(c.englishExcerpt) &&
          s.afterText.includes(c.afterExcerpt) &&
          c.actualAfterHtml === s.afterHtml,
      );
    }
  } else {
    const lines = t.english.description
      .split("\n")
      .filter((s: string) => s.trim());
    assert(
      same(
        p.segments.flatMap((s: any) => s.englishLines),
        lines.map((_: string, n: number) => n + 1),
      ),
      "English segment coverage gap",
    );
    assert.equal(clauses.length, p.segments.length);
    for (const [n, c] of clauses.entries()) {
      const s = p.segments[n];
      assert(
        same(c.englishLines, s.englishLines) &&
          c.effectiveText === s.afterText &&
          c.effectiveHtml === s.afterHtml,
      );
      assert.equal(
        c.english,
        s.englishLines.map((n: number) => lines[n - 1]).join("\n"),
      );
    }
  }
  assert(
    same(decisions[i].proposedRulebookId, book) &&
      decisions[i].proposedEditionId === t.english.editionId,
  );
  assert(
    same(h.englishInput, {
      revision: m.acceptedByBook[book],
      path: base + "/qa/books/" + book + "/target-inputs.jsonl",
      targetId: t.targetId,
      currentSnapshot: "current-target-inputs.jsonl",
    }),
  );
  assert(
    same(h.diceEvidence, {
      revision: m.sourceRevision,
      path: "spells-dice-db-by-mo/" + cs[i].file,
      startLine: cs[i].startLine,
      endLine: cs[i].endLine,
      ordinal: cs[i].ordinal,
      frozenSnapshot: "selected-occurrences.jsonl",
    }),
  );
}
assert.equal(handoff.filter((h) => h.sourceGap).length, 2);
const expectedResiduals = inputs.flatMap((t) =>
  rows(
    root +
      "/" +
      base +
      "/qa/books/" +
      t.english.rulebookId +
      "/unresolved.jsonl",
  )
    .filter((r) => r.targetId === t.targetId)
    .map((r) => ({
      ...r,
      reusedFrom: {
        revision: m.acceptedByBook[t.english.rulebookId],
        path: base + "/qa/books/" + t.english.rulebookId + "/unresolved.jsonl",
      },
      sourceKey: t.sourceKey,
    })),
);
assert(same(residuals, expectedResiduals));

const files = readdirSync(root + "/spells-dice-db-by-mo")
  .filter((f) => f.endsWith(".txt"))
  .sort()
  .map((file) => {
    const bytes = readFileSync(root + "/spells-dice-db-by-mo/" + file);
    assert.equal(
      norm(bytes),
      norm(git("show", m.sourceRevision + ":spells-dice-db-by-mo/" + file)),
      "source changed",
    );
    return { bytes: bytes.length, parsed: parseDiceFile(file, bytes) };
  });
const candidates = rows(root + "/" + base + "/intake/candidates.jsonl");
const byKey = new Map(candidates.map((c) => [c.sourceKey, c]));
const inventory = rows(root + "/" + base + "/intake/source-inventory.jsonl");
validateSourceCoverage(files, inventory, candidates);
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
const mappings = j(root + "/dice-intake/publication-map.json"),
  aliases = j(root + "/chm-mapping/enName-aliases-global.json");
const records = files.flatMap((f) => f.parsed.records);
const frozen = reconcile(
  records,
  mappings,
  books,
  targets,
  m.sourceRevision,
  aliases,
);
const fallbackById = new Map(
  frozen.targetDispositions.map((t) => [t.targetId, t.currentFallback]),
);
assert(
  same(frozen.candidates, candidates) &&
    same(
      frozen.targetDispositions,
      rows(root + "/" + base + "/intake/target-inventory.jsonl"),
    ),
  "global frozen replay drift",
);
assert.equal(candidates.length, 5606);
assert.equal(targets.length, 5097);
const proposals = j(root + "/" + prior + "/unapplied-proposals.json"),
  planar = proposals[0],
  spelling = proposals[1];
const guard = j(owned + "/guarded-integration-proposal.json");
assert(
  same(guard.planarRows, planar.suggestedRows) &&
    same(guard.spelling, {
      from: spelling.from,
      to: spelling.to,
      targetId: spelling.targetId,
      rulebookId: spelling.rulebookId,
      editionId: spelling.editionId,
      sourceKeys: spelling.sourceKeys,
    }),
);
assert(
  guard.applied === false &&
    guard.activation === false &&
    guard.sharedInputsFrozen === true &&
    guard.nativeAcceptedFields === 0,
);
const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
assert(
  same(
    [...english]
      .filter(([, e]) => nameKey(e.name) === nameKey(spelling.from))
      .map(([id]) => id),
    [4957],
  ),
  "single-spelling global identity changed",
);
const changedMap = mappings.map((map: any) => {
  const p = planar.suggestedRows.find((p: any) => p.file === map.file);
  return p
    ? {
        ...map,
        rulebookIds: p.proposedRulebookIds,
        editionIds: p.proposedEditionIds,
      }
    : map;
});
assert(same(planar.allAffectedSourceKeys, m.selectedKeys.slice(0, 11)));
assert(
  same(spelling.sourceKeys, m.selectedKeys.slice(11)) &&
    spelling.targetId === ids[11],
);
const hinted = reconcile(
  records,
  changedMap,
  books,
  targets,
  m.sourceRevision,
  { ...aliases, [spelling.from]: spelling.to },
);
assert(
  same(
    hinted.candidates
      .filter((c) => !same(c, byKey.get(c.sourceKey)))
      .map((c) => c.sourceKey),
    m.selectedKeys,
  ),
  "map/alias affects other candidates",
);
for (const [i, key] of m.selectedKeys.entries()) {
  const before = candidates.find((c) => c.sourceKey === key),
    after = hinted.candidates.find((c) => c.sourceKey === key);
  assert(before.targetId === null && after);
  assert.equal(after.targetId, i < 11 ? ids[i] : null);
  assert.equal(after.rulebookId, i < 11 ? inputs[i].english.rulebookId : null);
  if (i === 11)
    assert(
      same(after.aliasHintTargetIds, [ids[i]]) &&
        after.classification === "ambiguous-unmatched",
      "alias was falsely attached",
    );
}
const simulatedRecords = records.map((r) => {
  const key = `${m.sourceRevision}:${r.file}:${r.startLine}:${r.ordinal}`;
  return key === spelling.sourceKeys[0] ? { ...r, enName: spelling.to } : r;
});
assert.equal(records.filter((r, i) => !same(r, simulatedRecords[i])).length, 1);
const simulated = reconcile(
  simulatedRecords,
  changedMap,
  books,
  targets,
  m.sourceRevision,
  aliases,
);
assert(
  same(
    simulated.candidates
      .filter((c) => !same(c, byKey.get(c.sourceKey)))
      .map((c) => c.sourceKey),
    m.selectedKeys,
  ),
);
for (const [i, key] of m.selectedKeys.entries())
  assert.equal(
    simulated.candidates.find((c) => c.sourceKey === key)?.targetId,
    ids[i],
  );
for (const replay of [hinted, simulated]) {
  for (const [i, c] of replay.candidates.entries()) {
    const before = candidates[i];
    for (const field of [
      "sourceKey",
      "file",
      "ordinal",
      "startLine",
      "endLine",
      "rawHeader",
      "rawBody",
      "bodyText",
      "bodyHtml",
      "sourceBookLabels",
    ])
      assert(
        same((c as any)[field], before[field]),
        "raw/text boundary changed",
      );
    if (!m.selectedKeys.includes(c.sourceKey))
      assert(same(c, before), "nonowned candidate changed");
  }
  assert.equal(replay.targetDispositions.length, 5097);
  const affected = replay.targetDispositions.filter(
    (t, i) => !same(t, frozen.targetDispositions[i]),
  );
  const expected = replay === hinted ? ids.slice(0, 11) : ids;
  assert(
    same(
      affected.map((t) => t.targetId).sort((a, b) => a - b),
      [...expected].sort((a, b) => a - b),
    ),
    "nonowned target changed",
  );
  for (const t of replay.targetDispositions)
    assert.equal(t.currentFallback, fallbackById.get(t.targetId));
}
// The frozen unmatched inputs cannot be claimed as a maintained accepted slice.
assert.throws(
  () =>
    selectSliceScope(
      {
        kind: "slice",
        rulebookId: 112,
        targetIds: [4957],
        baselineRevision: m.preparedRevision,
        sourceRevision: m.sourceRevision,
        mappingRevision: m.sourceRevision,
      },
      candidates,
      new Map(targets.map((t) => [t.id, t])),
      inventory,
    ),
  /cannot allocate unmatched/,
);
assert(
  rules.pragma("query_only", { simple: true }) === 1 &&
    content.pragma("query_only", { simple: true }) === 1,
);
rules.close();
content.close();

const native: any[] = [];
for (const book of [43, 79, 112]) {
  // Read-only API, never the CLI that emits default/shared output files.
  const result = validateQaInputs([
    "--data-root",
    root,
    "--baseline-dir",
    root + "/" + base,
    "--rules-db",
    m.operatorStats[0].path,
    "--content-db",
    m.operatorStats[1].path,
    "--rulebook-id",
    String(book),
  ]).result;
  const prefix = root + "/" + base + "/qa/books/" + book;
  assert.equal(result.accepted.length, 0);
  assert.equal(result.summary.pendingFields, 0);
  assert.equal(result.summary.pendingFullBodyAudits, 0);
  assert(
    same(result.summary, j(prefix + "/out/coverage.json")) &&
      same(result.fallback, rows(prefix + "/out/fallback.jsonl")),
    "truthful native receipt changed",
  );
  native.push({
    book,
    acceptedFields: 0,
    englishFallbackFields: result.fallback.length,
  });
  (globalThis as any).gc?.();
}
assert(same(stats(), m.operatorStats), "operator DB metadata changed");
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
assert(
  m.activation === false &&
    m.nativeAcceptedFields === 0 &&
    m.newUnseenOccurrencesReviewed === 0 &&
    m.parentUnseenRemaining === 2179,
);
assert(m.runtime.model === "gpt-6.1-sol" && m.runtime.effort === "high");
console.log(
  JSON.stringify({
    result: "PASS",
    selected: 12,
    currentInputsExact: true,
    rawCharacters: 4104,
    englishBodyCharacters: 8923,
    reusedFields: 24,
    specificInputResiduals: 4,
    targetsWithInputResiduals: 3,
    nativeAttached: 0,
    nativeAcceptedFields: 0,
    memoryMapMatches: 11,
    memoryAliasHints: 1,
    memorySpellingSimulationMatches: 12,
    unchangedOtherCandidates: 5594,
    unchangedOtherTargets: 5085,
    totalCandidates: 5606,
    totalTargets: 5097,
    native,
    editionRowsRead: editions.length,
    activated: 0,
    newUnseenReviewed: 0,
    parentUnseenRemaining: 2179,
    queryOnly: [1, 1],
    dbMetadataUnchanged: true,
    privateStatePreserved: true,
    seconds: (performance.now() - start) / 1000,
    maxRssKiB: process.resourceUsage().maxRSS,
  }),
);
