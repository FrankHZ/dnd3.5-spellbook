import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { load } from "cheerio";
import type Database from "better-sqlite3";
import { noAlias, within } from "./paths";
import type { EnglishRecord, validateQaInputs } from "./qa";

// Main-gate acceptance in #420 / #527, not caller-supplied QA status.
export const cityscapeAcceptance = {
  issue: 160,
  rulebookId: 53,
  revision: "b8d0dc3f85015533c3e57a293f7a96d5de2d7cb7",
  preparedRevision: "6d28f9391273979a35a6bcc86971f0aac5b9f2c8",
  sourceRevision: "47a23f9b36b4b827ebf14d7d05f3e564465c6fd5",
  reviewedPublicHead: "4468c94376828f93f4b9664d6fddaf21ab52f787",
  directory: "dice-baselines/issue-520/qa/books/53",
  targets: [355, 356, 357, 358, 359, 360, 361, 362],
} as const;
export const handoffFiles = [
  "decisions.jsonl",
  "corrections.jsonl",
  "duplicate-resolutions.jsonl",
  "full-body-audit.jsonl",
  "boundary-decisions.jsonl",
  "target-inputs.jsonl",
  "semantic-review.json",
  "clause-review.jsonl",
  "unresolved.jsonl",
  "out/accepted.jsonl",
  "out/fallback.jsonl",
];

/** File identity only. Acceptance is selected separately by the fixed entry above. */
export function bindCommittedInputs(
  root: string,
  revision: string,
  paths: string[],
) {
  assert.equal(
    execFileSync(
      "git",
      ["-C", root, "rev-parse", "--verify", `${revision}^{commit}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim(),
    revision,
    "require an exact commit revision",
  );
  const buffers = new Map<string, Buffer>();
  for (const path of new Set(paths)) {
    noAlias(path);
    assert(
      within(root, path) && path !== root,
      "input outside private data root",
    );
    const file = relative(root, path).replaceAll("\\", "/");
    const committed = execFileSync(
      "git",
      ["-C", root, "show", `${revision}:${file}`],
      { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
    );
    const current = readFileSync(path);
    const same = /\.jsonl?$/.test(file)
      ? committed.toString("utf8").replaceAll("\r\n", "\n") ===
        current.toString("utf8").replaceAll("\r\n", "\n")
      : committed.equals(current);
    assert(same, `changed committed input ${file}`);
    buffers.set(path, current);
  }
  return buffers;
}

type Segment = { lines: number[]; kind?: string; zh?: string; text?: string };
export type HandoffEvidence = {
  accepted: ReturnType<typeof validateQaInputs>["result"]["accepted"];
  fallback: ReturnType<typeof validateQaInputs>["result"]["fallback"];
  targetInputs: {
    targetId: number;
    english: EnglishRecord;
    sourceKeys: string[];
  }[];
  semantic: {
    issue: number;
    authority: string;
    entries: { targetId: number; name: string; segments: Segment[] }[];
  };
  clauses: {
    targetId: number;
    sourceKey: string;
    englishLines: number[];
    english: string;
    effectiveText: string;
    status: string;
    reviewer: string;
  }[];
  unresolved: {
    targetId: number;
    field: string;
    sourceKey: string;
    englishLines: number[];
    english: string;
    gap: string;
    disposition: string;
    canonicalEnglishChanged: boolean;
    normalizedMechanicsChanged: boolean;
    operatorWrites: boolean;
    reviewer: string;
  }[];
};
const compact = (text: string) => text.replace(/\s/g, "");
const ids = (rows: { targetId: number }[]) =>
  rows.map((row) => row.targetId).sort((a, b) => a - b);

/** Semantic cross-bindings after complete all-source/book QA and Git identity checks. */
export function validateHandoffEvidence(
  qa: ReturnType<typeof validateQaInputs>,
  e: HandoffEvidence,
) {
  const a = cityscapeAcceptance;
  assert.equal(qa.rulebookId, a.rulebookId, "wrong handoff book");
  assert.equal(
    qa.checkIncomplete,
    false,
    "handoff requires complete formal QA",
  );
  assert.equal(qa.result.summary.pendingFields, 0);
  assert.equal(qa.result.summary.pendingFullBodyAudits, 0);
  assert.deepEqual(
    ids(e.accepted),
    a.targets,
    "accepted target universe mismatch",
  );
  assert.deepEqual(
    e.accepted,
    qa.result.accepted,
    "accepted export differs from formal QA",
  );
  assert.deepEqual(
    e.fallback,
    qa.result.fallback,
    "fallback export differs from formal QA",
  );
  assert.deepEqual(e.fallback, [], "unexpected whole-field fallback");
  assert.deepEqual(
    ids(e.targetInputs),
    a.targets,
    "target input universe mismatch",
  );
  assert.deepEqual(
    ids(e.semantic.entries),
    a.targets,
    "semantic target universe mismatch",
  );
  assert.equal(e.semantic.issue, a.issue);
  assert.equal(
    e.semantic.authority,
    "DB-English QA; no original-book verification",
  );
  assert.equal(
    e.unresolved.length,
    1,
    "require the accepted unresolved clause",
  );
  const residual = e.unresolved[0]!;
  assert.equal(residual.targetId, 361);
  assert.equal(residual.field, "descriptionHtml");
  assert.deepEqual(residual.englishLines, [10]);
  assert(residual.english.trim(), "missing literal residual English");
  assert(
    residual.gap.trim() &&
      residual.disposition.trim() &&
      residual.reviewer.trim(),
    "incomplete residual evidence",
  );
  assert.equal(residual.canonicalEnglishChanged, false);
  assert.equal(residual.normalizedMechanicsChanged, false);
  assert.equal(residual.operatorWrites, false);
  const used = new Set<number>();
  let physicalLines = 0,
    segments = 0,
    englishFallbacks = 0;
  for (const row of e.accepted) {
    const en = qa.english.get(row.targetId)!;
    assert.equal(row.rulebookId, a.rulebookId, "cross-book accepted row");
    assert.equal(en.rulebookId, a.rulebookId, "cross-book English");
    const input = e.targetInputs.find((r) => r.targetId === row.targetId)!;
    assert.deepEqual(input.english, en, "prepared English/mechanics drift");
    assert.deepEqual(
      input.sourceKeys,
      [row.sourceKey],
      "prepared source identity drift",
    );
    const semantic = e.semantic.entries.find(
      (r) => r.targetId === row.targetId,
    )!;
    assert.equal(
      semantic.name,
      row.name,
      "semantic name differs from accepted name",
    );
    assert(row.name && row.descriptionHtml, "missing accepted field");
    const lines = en.description.split("\n");
    const covered = new Set<number>();
    const texts: string[] = [];
    for (const segment of semantic.segments) {
      assert(segment.lines.length > 0, "empty English line coverage");
      for (const line of segment.lines) {
        assert(
          Number.isInteger(line) &&
            line > 0 &&
            line <= lines.length &&
            !covered.has(line),
          "invalid/repeated English line",
        );
        covered.add(line);
      }
      const english = segment.lines.map((n) => lines[n - 1]).join("\n");
      const fallback = segment.kind === "english-fallback";
      const text = fallback ? segment.text : segment.zh;
      assert(text && text.trim(), "missing reviewed segment text");
      const matching = e.clauses
        .map((clause, index) => ({ clause, index }))
        .filter(
          ({ clause }) =>
            clause.targetId === row.targetId &&
            JSON.stringify(clause.englishLines) ===
              JSON.stringify(segment.lines),
        );
      assert.equal(matching.length, 1, "missing/duplicate clause evidence");
      const { clause, index } = matching[0]!;
      assert(!used.has(index), "reused clause evidence");
      used.add(index);
      assert.equal(clause.sourceKey, row.sourceKey, "clause source mismatch");
      assert.equal(clause.english, english, "unaligned clause English");
      assert.equal(clause.effectiveText, text, "clause/semantic text mismatch");
      assert(clause.reviewer.trim(), "missing clause reviewer");
      assert.equal(
        clause.status,
        fallback
          ? "retained-DB-English-fallback"
          : "DB-English-reviewed-Chinese",
      );
      if (fallback) {
        assert.equal(row.targetId, residual.targetId);
        assert.equal(row.sourceKey, residual.sourceKey);
        assert.deepEqual(segment.lines, residual.englishLines);
        assert.equal(text, residual.english);
        assert.equal(text, english);
        englishFallbacks++;
      }
      texts.push(text);
      segments++;
    }
    assert.equal(
      covered.size,
      lines.length,
      "incomplete English body coverage",
    );
    physicalLines += lines.length;
    assert.equal(
      compact(load(row.descriptionHtml)("body").text()),
      compact(texts.join("\n")),
      "accepted HTML differs from complete reviewed segments",
    );
  }
  assert.equal(used.size, e.clauses.length, "unowned clause evidence");
  assert.equal(englishFallbacks, 1, "lost or added English residual");
  return {
    segments,
    physicalLines,
    fullyChineseBodies: 7,
    mixedBodies: 1,
    unresolvedClauses: 1,
  };
}

/** Read-only DB roles; never hand a writable handle to QA or proposal construction. */
export function requireHandoffDbRoles(
  rules: Database.Database,
  content: Database.Database,
) {
  for (const db of [rules, content]) {
    assert(
      db.readonly && db.pragma("query_only", { simple: true }) === 1,
      "handoff requires readonly/query_only DBs",
    );
    for (const table of ["User", "FavoriteSpell", "SpellNote"]) {
      assert(
        !db
          .prepare("SELECT 1 FROM sqlite_master WHERE name=? COLLATE NOCASE")
          .get(table),
        "wrong DB role: app-state",
      );
    }
  }
  assert(
    rules.prepare("SELECT 1 FROM sqlite_master WHERE name='dnd_spell'").get(),
    "wrong rules DB role",
  );
  assert(
    !rules
      .prepare("SELECT 1 FROM sqlite_master WHERE name='I18nSpellText'")
      .get(),
    "wrong rules DB role",
  );
  assert(
    content
      .prepare("SELECT 1 FROM sqlite_master WHERE name='I18nSpellText'")
      .get(),
    "wrong content DB role",
  );
  assert(
    !content
      .prepare("SELECT 1 FROM sqlite_master WHERE name='dnd_spell'")
      .get(),
    "wrong content DB role",
  );
}

export function requireMissingEffectiveTargets(content: Database.Database) {
  assert(
    content.readonly && content.pragma("query_only", { simple: true }) === 1,
    "predecessor check requires readonly/query_only",
  );
  const existing = content
    .prepare(
      `SELECT spellId FROM I18nSpellText
    WHERE lang='zh' AND variant='effective' AND spellId IN (${cityscapeAcceptance.targets.map(() => "?").join(",")}) LIMIT 1`,
    )
    .get(...cityscapeAcceptance.targets) as { spellId: number } | undefined;
  assert(
    !existing,
    `unexpected existing effective target predecessor: ${existing?.spellId}`,
  );
}

export function planDbEnglishHandoff(
  content: Database.Database,
  e: HandoffEvidence,
) {
  assert(
    content.readonly && content.pragma("query_only", { simple: true }) === 1,
    "proposal requires readonly/query_only",
  );
  // This accepted pilot authenticates absent target rows only. A later writer
  // owns already-applied/recovery states; arbitrary current rows grant no before authority.
  requireMissingEffectiveTargets(content);
  return e.accepted.map((row, index) => {
    return {
      targetId: row.targetId,
      rulebookId: row.rulebookId,
      sourceKey: row.sourceKey,
      destination: { table: "I18nSpellText", lang: "zh", variant: "effective" },
      action: "insert",
      before: null,
      baseline: content
        .prepare(
          "SELECT * FROM I18nSpellText WHERE spellId=? AND lang='zh' AND variant='chm'",
        )
        .all(row.targetId),
      lockedEnglish: e.targetInputs.find(
        (input) => input.targetId === row.targetId,
      )!.english,
      fields: {
        name: { before: null, after: row.name! },
        descriptionHtml: {
          before: null,
          after: row.descriptionHtml!,
        },
        descriptionText: {
          before: null,
          after: e.semantic.entries
            .find((entry) => entry.targetId === row.targetId)!
            .segments.map((segment) =>
              segment.kind === "english-fallback" ? segment.text : segment.zh,
            )
            .join("\n"),
        },
      },
      acceptance: {
        ...cityscapeAcceptance,
        targets: undefined,
        directory: undefined,
        path: `${cityscapeAcceptance.directory}/out/accepted.jsonl`,
        rowRef: `${cityscapeAcceptance.directory}/out/accepted.jsonl:${index + 1}`,
      },
      evidence: {
        decisions: `${cityscapeAcceptance.directory}/decisions.jsonl`,
        clauses: e.clauses.flatMap((clause, i) =>
          clause.targetId === row.targetId
            ? [`${cityscapeAcceptance.directory}/clause-review.jsonl:${i + 1}`]
            : [],
        ),
        unresolved:
          row.targetId === 361
            ? `${cityscapeAcceptance.directory}/unresolved.jsonl:1`
            : null,
      },
      review: {
        kind: "DB-English",
        fullyChinese: row.targetId !== 361,
        unresolved: e.unresolved.filter((r) => r.targetId === row.targetId),
        residualOwnerIssue: row.targetId === 361 ? 160 : null,
      },
      acceptedPredecessor: "absent-target-effective-row",
      provenanceWriteContract: "pending-writer-and-consumer-slice",
    };
  });
}
