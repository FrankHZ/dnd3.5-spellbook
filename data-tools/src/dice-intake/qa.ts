import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import Database from "better-sqlite3";
import { parseDiceFile, type DiceRecord, type ParsedFile } from "./parse";
import { reconcile, type Candidate, type PublicationMap, type Rulebook } from "./reconcile";

export type Field = "name" | "descriptionHtml";
export type EnglishMechanics = {
  school: string; subschool: string | null; descriptors: string[];
  components: {
    verbal: number; somatic: number; material: number; arcaneFocus: number;
    divineFocus: number; xp: number; metaBreath: number; trueName: number;
    corrupt: number; extra: string | null;
  };
  castingTime: string | null; range: string | null; target: string | null;
  effect: string | null; area: string | null; duration: string | null;
  savingThrow: string | null; spellResistance: string | null;
  classLevels: Array<[number, number, string | null]>;
  domainLevels: Array<[number, number, string | null]>;
};
export type EnglishRecord = { name: string; description: string; rulebookId: number;
  editionId: number; mechanics: EnglishMechanics };
export type Decision = {
  status: "accepted" | "rejected" | "deferred" | "excluded";
  classification: string;
  reason: string;
  reviewer: string;
  englishEvidence: string[];
  replacementText?: string;
};
export type Review = {
  sourceKey: string;
  targetId: number | null;
  rulebookId: number | null;
  mappingRevision: string;
  input: {
    zhName: string | null;
    bodyText: string;
    bodyHtml: string;
    baselineName: string | null;
    baselineBody: string | null;
    englishName: string | null;
    englishDescription: string | null;
    englishMechanics: EnglishMechanics | null;
  };
  fields: Record<Field, Decision>;
};
export type Correction = { sourceKey: string; field: Field; sourceText: string;
  baselineText: string | null; replacementText: string; reason: string; reviewer: string;
  englishEvidence: string[] };
export type DuplicateResolution = { targetId: number; sourceKeys: string[];
  selectedSourceKey: string | null; mappingRevision: string; reason: string; reviewer: string };
export type BoundaryDecision = { sourceKey: string; file: string; line: number;
  sourceRevision: string; mappingRevision: string; targetId: number | null;
  status: "deferred" | "excluded"; reason: string; reviewer: string };
export type FullBodyAudit = { sourceKey: string; targetId: number; effectiveText: string;
  reviewer: string; reason: string; englishEvidence: string[] };
type SourceInventory = { file: string; bytes: number; encoding: string; lineCount: number;
  preamble: string; recordCount: number; unparsedSpans: ParsedFile["unparsedSpans"] };
type QaTarget = { rulebookId: number; zhName: string | null; zhBody: string | null };

export function candidateRulebook(candidate: Candidate): number | null {
  if (candidate.targetId !== null) return candidate.rulebookId;
  return candidate.publicationRulebookIds.length === 1
    && !candidate.problems.includes("unmapped-publication-label")
    ? candidate.publicationRulebookIds[0]! : null;
}

// Call only after validating the complete source inventory and regenerated candidates.
// Review/correction/audit inputs are deliberately NOT filtered: foreign rows must fail.
export function selectRulebookScope(rulebookId: number, candidates: Candidate[],
  targets: Map<number, QaTarget>, inventory: SourceInventory[]): {
    candidates: Candidate[]; targets: Map<number, QaTarget>; inventory: SourceInventory[];
  } {
  assert(Number.isSafeInteger(rulebookId) && rulebookId > 0, "invalid rulebook ID");
  const selected = candidates.filter((row) => candidateRulebook(row) === rulebookId);
  const selectedTargets = new Map([...targets].filter(([, row]) => row.rulebookId === rulebookId));
  assert(selected.length > 0 || selectedTargets.size > 0, "empty or unknown rulebook scope");
  const selectedKeys = new Set(selected.map((row) => row.sourceKey));
  const scopedInventory = inventory.map((file) => ({ ...file,
    unparsedSpans: file.unparsedSpans.filter((span) => {
      const enclosing = candidates.filter((row) => row.file === file.file
        && row.startLine <= span.startLine && span.startLine <= row.endLine);
      assert(enclosing.length === 1, `unowned or ambiguous boundary ${file.file}:${span.startLine}`);
      return selectedKeys.has(enclosing[0]!.sourceKey);
    }),
  }));
  return { candidates: selected, targets: selectedTargets, inventory: scopedInventory };
}

function rows<T>(path: string): T[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}
function jsonl(values: unknown[]): string { return values.map((value) => JSON.stringify(value)).join("\n") + "\n"; }
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function validateSourceCoverage(files: Array<{ bytes: number; parsed: ParsedFile }>,
  inventory: SourceInventory[], candidates: Candidate[]): void {
  const byFile = new Map(inventory.map((row) => [row.file, row]));
  assert(byFile.size === inventory.length && files.length === inventory.length,
    "source inventory file coverage mismatch");
  const candidateCounts = new Map<string, number>();
  for (const candidate of candidates) candidateCounts.set(candidate.file,
    (candidateCounts.get(candidate.file) ?? 0) + 1);
  assert([...candidateCounts.keys()].every((file) => byFile.has(file)),
    "candidate references a file outside source inventory");
  for (const { bytes, parsed } of files) {
    const row = byFile.get(parsed.file);
    assert(row && row.bytes === bytes && row.encoding === parsed.encoding
      && row.lineCount === parsed.lineCount && row.preamble === parsed.preamble
      && row.recordCount === parsed.records.length
      && JSON.stringify(row.unparsedSpans) === JSON.stringify(parsed.unparsedSpans),
    `stale source inventory ${parsed.file}`);
    assert((candidateCounts.get(parsed.file) ?? 0) === parsed.records.length,
      `missing entire candidate file or occurrence ${parsed.file}`);
  }
}

export function validateBoundaries(candidates: Candidate[], reviews: Review[],
  inventory: Array<{ file: string; unparsedSpans: Array<{ startLine: number }> }>,
  boundaries: BoundaryDecision[], sourceRevision: string, mappingRevision: string): void {
  const spans = new Set(inventory.flatMap((item) => item.unparsedSpans.map((span) =>
    `${item.file}:${span.startLine}`)));
  assert(boundaries.length === spans.size, "unparsed boundary decision count mismatch");
  const byCandidate = new Map(candidates.map((row) => [row.sourceKey, row]));
  const byReview = new Map(reviews.map((row) => [row.sourceKey, row]));
  for (const boundary of boundaries) {
    const locator = `${boundary.file}:${boundary.line}`;
    assert(spans.delete(locator), `unknown or repeated unparsed boundary ${locator}`);
    const candidate = byCandidate.get(boundary.sourceKey);
    assert(candidate && candidate.file === boundary.file && candidate.targetId === boundary.targetId
      && candidate.startLine <= boundary.line && boundary.line <= candidate.endLine,
      `stale boundary source ${locator}`);
    assert(boundary.sourceRevision === sourceRevision && boundary.mappingRevision === mappingRevision,
      `stale boundary revision ${locator}`);
    assert(Boolean(boundary.reason.trim()) && Boolean(boundary.reviewer.trim()),
      `missing boundary rationale ${locator}`);
    assert(byReview.get(boundary.sourceKey)?.fields.descriptionHtml.status === boundary.status,
      `boundary disposition disagrees with review ${locator}`);
  }
}

export function validateFullBodyAudits(reviews: Review[], audits: FullBodyAudit[],
  allowPending = false): number {
  const accepted = new Map(reviews.filter((row) => row.fields.descriptionHtml.status === "accepted")
    .map((row) => [row.sourceKey, row]));
  const seen = new Set<string>();
  for (const audit of audits) {
    const review = accepted.get(audit.sourceKey);
    assert(review && !seen.has(audit.sourceKey) && review.targetId === audit.targetId,
      `unknown or repeated full-body audit ${audit.sourceKey}`);
    seen.add(audit.sourceKey);
    assert(audit.effectiveText === review.fields.descriptionHtml.replacementText,
      `stale full-body audited text ${audit.sourceKey}`);
    assert(Boolean(audit.reviewer.trim()) && Boolean(audit.reason.trim())
      && Array.isArray(audit.englishEvidence) && audit.englishEvidence.length > 0,
    `incomplete full-body audit ${audit.sourceKey}`);
    for (const excerpt of audit.englishEvidence) {
      assert(Boolean(excerpt.trim()) && Boolean(review.input.englishDescription?.includes(excerpt)),
        `unaligned full-body English evidence ${audit.sourceKey}`);
    }
  }
  const pending = accepted.size - seen.size;
  assert(allowPending || pending === 0, `${pending} accepted bodies lack full-body audit`);
  return pending;
}

export function validateReviews(candidates: Candidate[], reviews: Review[], mappingRevision: string,
  english: Map<number, EnglishRecord>,
  targets: Map<number, { rulebookId: number; zhName: string | null; zhBody: string | null }>,
  corrections: Correction[] = [], allowPending = false,
  duplicateResolutions: DuplicateResolution[] = []): {
    accepted: Array<{ targetId: number; rulebookId: number; sourceKey: string; name?: string; descriptionHtml?: string }>;
    fallback: Array<{ targetId: number; rulebookId: number; field: Field; sourceKey: string | null; status: string }>;
    summary: Record<string, unknown>;
  } {
  const byKey = new Map(candidates.map((row) => [row.sourceKey, row]));
  assert(byKey.size === candidates.length, "duplicate candidate source key");
  const candidatesByTarget = new Map<number, Candidate[]>();
  for (const candidate of candidates) {
    if (candidate.targetId === null) continue;
    candidatesByTarget.set(candidate.targetId,
      [...(candidatesByTarget.get(candidate.targetId) ?? []), candidate]);
  }
  const resolutions = new Map<number, DuplicateResolution>();
  for (const resolution of duplicateResolutions) {
    const group = candidatesByTarget.get(resolution.targetId) ?? [];
    assert(group.length > 1 && !resolutions.has(resolution.targetId),
      `invalid duplicate resolution ${resolution.targetId}`);
    assert(resolution.mappingRevision === mappingRevision && Boolean(resolution.reason.trim())
      && Boolean(resolution.reviewer.trim()), `stale or incomplete duplicate resolution ${resolution.targetId}`);
    assert(JSON.stringify([...resolution.sourceKeys].sort()) === JSON.stringify(group.map((row) => row.sourceKey).sort()),
      `duplicate source coverage mismatch ${resolution.targetId}`);
    assert(resolution.selectedSourceKey === null || resolution.sourceKeys.includes(resolution.selectedSourceKey),
      `selected duplicate source missing ${resolution.targetId}`);
    resolutions.set(resolution.targetId, resolution);
  }
  for (const [targetId, group] of candidatesByTarget) {
    if (group.length > 1) assert(resolutions.has(targetId), `unresolved duplicate target ${targetId}`);
  }
  assert(reviews.length === candidates.length, "review count does not cover every candidate");
  const seen = new Set<string>();
  const correctionByKey = new Map<string, Correction>();
  for (const correction of corrections) {
    const key = `${correction.sourceKey}:${correction.field}`;
    assert(!correctionByKey.has(key), `duplicate correction ${key}`);
    correctionByKey.set(key, correction);
  }
  const usedCorrections = new Set<string>();
  const byTarget = new Map<number, Review[]>();
  const classifications: Record<string, number> = {};
  const sourceByPublication: Record<string, Record<string, number>> = {};
  const decisions: Record<string, number> = {};
  let pendingFields = 0;
  for (const review of reviews) {
    const candidate = byKey.get(review.sourceKey);
    assert(candidate, `unknown review source key ${review.sourceKey}`);
    assert(!seen.has(review.sourceKey), `duplicate review ${review.sourceKey}`);
    seen.add(review.sourceKey);
    assert(review.mappingRevision === mappingRevision, `stale publication map ${review.sourceKey}`);
    assert(review.targetId === candidate.targetId && review.rulebookId === candidate.rulebookId,
      `stale identity ${review.sourceKey}`);
    const en = candidate.targetId === null ? null : english.get(candidate.targetId);
    assert(candidate.targetId === null || en, `missing aligned English ${review.sourceKey}`);
    const target = candidate.targetId === null ? null : targets.get(candidate.targetId);
    assert(candidate.targetId === null || (target && target.rulebookId === candidate.rulebookId
      && en?.rulebookId === candidate.rulebookId && en.editionId === candidate.editionId),
    `stale target publication ${review.sourceKey}`);
    assert(candidate.targetId === null || (candidate.baselineName === target!.zhName
      && candidate.baselineBody === target!.zhBody), `stale CHM baseline ${review.sourceKey}`);
    const expected = {
      zhName: candidate.zhName, bodyText: candidate.bodyText, bodyHtml: candidate.bodyHtml,
      baselineName: candidate.baselineName, baselineBody: candidate.baselineBody,
      englishName: en?.name ?? null, englishDescription: en?.description ?? null,
      englishMechanics: en?.mechanics ?? null,
    };
    for (const field of Object.keys(expected) as Array<keyof typeof expected>) {
      assert(field === "englishMechanics"
        ? JSON.stringify(review.input[field]) === JSON.stringify(expected[field])
        : review.input[field] === expected[field], `stale ${field} ${review.sourceKey}`);
    }
    classifications[candidate.classification] = (classifications[candidate.classification] ?? 0) + 1;
    const publicationKey = candidate.publicationRulebookIds.length
      ? candidate.publicationRulebookIds.join(",") : "unmapped";
    const sourceBook = sourceByPublication[publicationKey] ??= {};
    sourceBook[candidate.classification] = (sourceBook[candidate.classification] ?? 0) + 1;
    for (const field of ["name", "descriptionHtml"] as const) {
      const decision = review.fields?.[field];
      assert(decision, `missing ${field} decision ${review.sourceKey}`);
      assert(["accepted", "rejected", "deferred", "excluded"].includes(decision.status),
        `invalid ${field} status ${review.sourceKey}`);
      assert(decision.classification === (field === "name" ? candidate.nameClassification : candidate.bodyClassification)
        || (candidate.targetId === null && decision.classification === candidate.classification),
      `stale ${field} classification ${review.sourceKey}`);
      assert(Boolean(decision.reason?.trim()) && Boolean(decision.reviewer?.trim()),
        `missing ${field} rationale or reviewer ${review.sourceKey}`);
      if (decision.reviewer.startsWith("queue:")) pendingFields += 1;
      assert(allowPending || !decision.reviewer.startsWith("queue:"),
        `unreviewed ${field} cannot enter accepted handoff ${review.sourceKey}`);
      assert(Array.isArray(decision.englishEvidence), `missing ${field} evidence list ${review.sourceKey}`);
      for (const excerpt of decision.englishEvidence) {
        assert(Boolean(excerpt.trim()) && Boolean((field === "name" ? en?.name : en?.description)?.includes(excerpt)),
          `unaligned ${field} English evidence ${review.sourceKey}`);
      }
      const bodyOnlyProblems = new Set(["suspected-unparsed-boundary", "malformed-table",
        "empty-body", "missing-fields"]);
      const resolution = candidate.targetId === null ? null : resolutions.get(candidate.targetId);
      const selected = candidate.duplicateDecision === "single"
        || resolution?.selectedSourceKey === candidate.sourceKey;
      const validTarget = candidate.targetId !== null && selected
        && (field === "name" ? candidate.problems.every((problem) => bodyOnlyProblems.has(problem))
          : candidate.problems.length === 0);
      if (decision.status === "accepted") {
        assert(validTarget, `unsafe accepted identity ${review.sourceKey}`);
        assert(decision.englishEvidence.length > 0 || decision.classification === "exact"
          || decision.classification === "formatting-only", `accepted without English evidence ${review.sourceKey}`);
        assert(Boolean(decision.replacementText?.trim()), `missing replacement ${review.sourceKey}`);
        const inputText = field === "name" ? candidate.zhName : candidate.bodyHtml;
        assert(Boolean(inputText), `accepted empty input ${review.sourceKey}`);
        if (field === "name") assert(candidate.zhName !== candidate.baselineName,
          `unchanged name must retain CHM ${review.sourceKey}`);
        if (decision.replacementText !== inputText) {
          const key = `${review.sourceKey}:${field}`;
          const correction = correctionByKey.get(key);
          assert(correction && correction.sourceText === inputText
            && correction.baselineText === (field === "name" ? candidate.baselineName : candidate.baselineBody)
            && correction.replacementText === decision.replacementText,
          `corrected text needs a separately reviewed correction ${key}`);
          assert(Boolean(correction.reason.trim()) && Boolean(correction.reviewer.trim())
            && correction.englishEvidence.length > 0, `incomplete correction ${key}`);
          for (const excerpt of correction.englishEvidence) {
            assert(Boolean(excerpt.trim()) && Boolean((field === "name" ? en?.name : en?.description)?.includes(excerpt)),
              `unaligned correction English evidence ${key}`);
          }
          usedCorrections.add(key);
        }
      } else {
        assert(decision.replacementText === undefined, `unapplied decision has replacement ${review.sourceKey}`);
      }
      if (decision.status === "excluded" && candidate.targetId !== null) {
        assert((resolution && resolution.selectedSourceKey !== candidate.sourceKey)
          || (field === "name" ? candidate.zhName === candidate.baselineName
            : candidate.bodyText === candidate.baselineBody),
        `changed ${field} requires reject or defer ${review.sourceKey}`);
      }
      if (!validTarget) assert(decision.status !== "accepted", `unsafe accepted candidate ${review.sourceKey}`);
      decisions[`${field}:${decision.status}`] = (decisions[`${field}:${decision.status}`] ?? 0) + 1;
    }
    if (candidate.targetId !== null) byTarget.set(candidate.targetId,
      [...(byTarget.get(candidate.targetId) ?? []), review]);
  }
  assert(usedCorrections.size === corrections.length, "unused correction record");
  const accepted: ReturnType<typeof validateReviews>["accepted"] = [];
  const fallback: ReturnType<typeof validateReviews>["fallback"] = [];
  const byBook: Record<string, Record<string, number>> = {};
  for (const [targetId, target] of targets) {
    const group = byTarget.get(targetId) ?? [];
    for (const field of ["name", "descriptionHtml"] as const) {
      const acceptedField = group.filter((review) => review.fields[field].status === "accepted");
      assert(acceptedField.length <= 1, `multiple accepted ${field} for target ${targetId}`);
      if (acceptedField.length) {
        const review = acceptedField[0]!;
        const output = accepted.find((row) => row.targetId === targetId) ?? {
          targetId, rulebookId: target.rulebookId, sourceKey: review.sourceKey,
        };
        output[field] = review.fields[field].replacementText!;
        if (!accepted.includes(output)) accepted.push(output);
      } else {
        fallback.push({ targetId, rulebookId: target.rulebookId, field,
          sourceKey: group.length === 1 ? group[0]!.sourceKey : null,
          status: field === "name" ? target.zhName ? "existing-Chinese" : "English"
            : target.zhBody ? "existing-Chinese" : "English" });
      }
      const disposition = acceptedField.length ? "accepted" : fallback[fallback.length - 1]!.status;
      const book = byBook[String(target.rulebookId)] ??= {};
      book[`${field}:${disposition}`] = (book[`${field}:${disposition}`] ?? 0) + 1;
    }
  }
  return { accepted, fallback, summary: { candidateOccurrences: candidates.length,
    reviewedOccurrences: reviews.length, matchedTargets: byTarget.size,
    existingTargets: targets.size, acceptedTargets: accepted.length,
    pendingFields, classifications, decisions, sourceByPublication, byBook } };
}

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing --${name}`);
  return resolve(process.argv[index + 1]!);
}

export function writeQaOutputs(dataRoot: string, reportDir: string,
  result: ReturnType<typeof validateReviews>, checkIncomplete: boolean, rulebookId?: number): void {
  if (rulebookId !== undefined) {
    const within = (parent: string, child: string): boolean => {
      const path = relative(resolve(parent), resolve(child));
      return path === "" || (!path.startsWith("..") && !isAbsolute(path));
    };
    assert(!within(dataRoot, reportDir)
      || within(join(dataRoot, "dice-qa", "books", String(rulebookId)), reportDir),
    "scoped reports inside data must stay in this rulebook directory");
  }
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "coverage.json"), JSON.stringify(result.summary, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value, 2) + "\n");
  if (!checkIncomplete) {
    const outputDir = rulebookId === undefined ? join(dataRoot, "dice-qa") : reportDir;
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "accepted.jsonl"), jsonl(result.accepted));
    writeFileSync(join(outputDir, "fallback.jsonl"), jsonl(result.fallback));
  }
}

export function loadEnglishRecords(db: Database.Database): Map<number, EnglishRecord> {
  const english = new Map<number, EnglishRecord>((db.prepare(`SELECT s.id, s.name, s.rulebook_id AS rulebookId,
    b.dnd_edition_id AS editionId, CAST(s.description AS BLOB) AS description,
    school.name AS school, subschool.name AS subschool,
    s.verbal_component AS verbal, s.somatic_component AS somatic,
    s.material_component AS material, s.arcane_focus_component AS arcaneFocus,
    s.divine_focus_component AS divineFocus, s.xp_component AS xp,
    s.meta_breath_component AS metaBreath, s.true_name_component AS trueName,
    s.corrupt_component AS corrupt, s.extra_components AS extra,
    s.casting_time AS castingTime, s.range, s.target, s.effect, s.area, s.duration,
    s.saving_throw AS savingThrow, s.spell_resistance AS spellResistance
    FROM dnd_spell s JOIN dnd_rulebook b ON b.id = s.rulebook_id
    JOIN dnd_spellschool school ON school.id = s.school_id
    LEFT JOIN dnd_spellsubschool subschool ON subschool.id = s.sub_school_id`)
    .all() as Array<{ id: number; name: string; rulebookId: number; editionId: number;
      school: string; subschool: string | null; verbal: number; somatic: number;
      material: number; arcaneFocus: number; divineFocus: number; xp: number;
      metaBreath: number; trueName: number; corrupt: number; extra: string | null;
      description: Buffer; castingTime: string | null; range: string | null; target: string | null;
      effect: string | null; area: string | null; duration: string | null;
      savingThrow: string | null; spellResistance: string | null }>).map((row) =>
    [row.id, { name: row.name, rulebookId: row.rulebookId, editionId: row.editionId,
      description: row.description.toString("utf8"), mechanics: {
        school: row.school, subschool: row.subschool, descriptors: [],
        components: { verbal: row.verbal, somatic: row.somatic, material: row.material,
          arcaneFocus: row.arcaneFocus, divineFocus: row.divineFocus, xp: row.xp,
          metaBreath: row.metaBreath, trueName: row.trueName, corrupt: row.corrupt,
          extra: row.extra },
        castingTime: row.castingTime, range: row.range, target: row.target, effect: row.effect,
        area: row.area, duration: row.duration, savingThrow: row.savingThrow,
        spellResistance: row.spellResistance, classLevels: [], domainLevels: [],
      } }] as [number, EnglishRecord]));
  for (const row of db.prepare(`SELECT sd.spell_id AS spellId, d.name FROM dnd_spell_descriptors sd
    JOIN dnd_spelldescriptor d ON d.id = sd.spelldescriptor_id ORDER BY sd.spell_id, d.name`)
    .all() as Array<{ spellId: number; name: string }>) {
    english.get(row.spellId)?.mechanics.descriptors.push(row.name);
  }
  for (const row of db.prepare("SELECT spell_id AS spellId, character_class_id AS classId, level, extra FROM dnd_spellclasslevel ORDER BY id")
    .all() as Array<{ spellId: number; classId: number; level: number; extra: string }>) {
    english.get(row.spellId)?.mechanics.classLevels.push([row.classId, row.level, row.extra]);
  }
  for (const row of db.prepare("SELECT spell_id AS spellId, domain_id AS domainId, level, extra FROM dnd_spelldomainlevel ORDER BY id")
    .all() as Array<{ spellId: number; domainId: number; level: number; extra: string }>) {
    english.get(row.spellId)?.mechanics.domainLevels.push([row.domainId, row.level, row.extra]);
  }
  return english;
}

function main(): void {
  const dataRoot = arg("data-root");
  const rulesPath = arg("rules-db");
  const contentPath = arg("content-db");
  const checkIncomplete = process.argv.includes("--check-incomplete");
  const rulebookAt = process.argv.indexOf("--rulebook-id");
  const rulebookId = rulebookAt < 0 ? undefined : Number(process.argv[rulebookAt + 1]);
  assert(rulebookId === undefined || (Number.isSafeInteger(rulebookId) && rulebookId > 0),
    "--rulebook-id requires a positive integer");
  const bookDir = rulebookId === undefined ? undefined
    : join(dataRoot, "dice-qa", "books", String(rulebookId));
  const input = <T>(name: string, file: string, required = false): T[] => {
    if (process.argv.includes(`--${name}`)) return rows<T>(arg(name));
    const path = bookDir && join(bookDir, file);
    if (path && existsSync(path)) return rows<T>(path);
    assert(!required, `missing --${name}${path ? ` or ${path}` : ""}`);
    return [];
  };
  const reviews = input<Review>("reviews", "decisions.jsonl", true);
  const corrections = input<Correction>("corrections", "corrections.jsonl");
  const duplicates = input<DuplicateResolution>("duplicates", "duplicate-resolutions.jsonl");
  const reportDir = arg("report-dir");
  const mappingRevision = execFileSync("git", ["-C", dataRoot, "log", "-1", "--format=%H", "--",
    "dice-intake/publication-map.json"], { encoding: "utf8" }).trim();
  assert(mappingRevision, "missing committed publication map");
  assert(!execFileSync("git", ["-C", dataRoot, "status", "--porcelain", "--",
    "spells-dice-db-by-mo", "dice-intake/publication-map.json"], { encoding: "utf8" }).trim(),
  "source or publication map is dirty");
  const candidates = rows<Candidate>(join(dataRoot, "dice-intake", "candidates.jsonl"));
  const fullBodyAudits = input<FullBodyAudit>("full-body-audit", "full-body-audit.jsonl", !checkIncomplete);
  const boundaries = input<BoundaryDecision>("boundaries", "boundary-decisions.jsonl", bookDir === undefined);
  const inventory = rows<SourceInventory>(join(dataRoot, "dice-intake", "source-inventory.jsonl"));
  const sourceRevision = execFileSync("git", ["-C", dataRoot, "log", "-1", "--format=%H", "--",
    "spells-dice-db-by-mo"], { encoding: "utf8" }).trim();
  const inputDir = join(dataRoot, "spells-dice-db-by-mo");
  const sourceFiles = readdirSync(inputDir).filter((name) => name.endsWith(".txt")).sort()
    .map((name) => { const bytes = readFileSync(join(inputDir, name));
      return { bytes: bytes.length, parsed: parseDiceFile(name, bytes) }; });
  validateSourceCoverage(sourceFiles, inventory, candidates);
  const parsed = new Map<string, DiceRecord>();
  const records: DiceRecord[] = [];
  for (const { parsed: file } of sourceFiles) {
    for (const row of file.records) {
      parsed.set(`${sourceRevision}:${file.file}:${row.startLine}:${row.ordinal}`, row);
      records.push(row);
    }
  }
  for (const candidate of candidates) {
    const source = parsed.get(candidate.sourceKey);
    assert(source && source.rawBody === candidate.rawBody && source.header === candidate.rawHeader,
      `stale source candidate ${candidate.sourceKey}`);
  }
  const db = new Database(rulesPath, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  const english = loadEnglishRecords(db);
  db.close();
  const content = new Database(contentPath, { readonly: true, fileMustExist: true });
  content.pragma("query_only = ON");
  const zh = new Map((content.prepare("SELECT spellId, name, descriptionText FROM I18nSpellText WHERE lang='zh' AND variant='chm'")
    .all() as Array<{ spellId: number; name: string | null; descriptionText: string | null }>).map((row) =>
    [row.spellId, row] as const));
  content.close();
  const targets = new Map([...english].map(([id, en]) => [id, {
    rulebookId: en.rulebookId, zhName: zh.get(id)?.name ?? null,
    zhBody: zh.get(id)?.descriptionText ?? null,
  }] as const));
  const mappings = JSON.parse(readFileSync(join(dataRoot, "dice-intake", "publication-map.json"), "utf8")) as PublicationMap[];
  const aliases = JSON.parse(readFileSync(join(dataRoot, "chm-mapping", "enName-aliases-global.json"), "utf8")) as Record<string, string>;
  const rulebooks = new Database(rulesPath, { readonly: true, fileMustExist: true });
  rulebooks.pragma("query_only = ON");
  const books = rulebooks.prepare("SELECT id, dnd_edition_id AS editionId, name FROM dnd_rulebook")
    .all() as Rulebook[];
  rulebooks.close();
  const regenerated = reconcile(records, mappings, books, [...targets].map(([id, target]) => ({
    id, rulebookId: target.rulebookId, enName: english.get(id)!.name,
    zhName: target.zhName, zhBody: target.zhBody,
  })), sourceRevision, aliases).candidates;
  assert(regenerated.length === candidates.length, "stale candidate count");
  for (let index = 0; index < candidates.length; index += 1) {
    assert(JSON.stringify(regenerated[index]) === JSON.stringify(candidates[index]),
      `stale intake candidate ${candidates[index]?.sourceKey}`);
  }
  if (rulebookId !== undefined) assert(books.some((book) => book.id === rulebookId), "unknown rulebook ID");
  const scope = rulebookId === undefined ? { candidates, targets, inventory }
    : selectRulebookScope(rulebookId, candidates, targets, inventory);
  validateBoundaries(scope.candidates, reviews, scope.inventory, boundaries, sourceRevision, mappingRevision);
  const result = validateReviews(scope.candidates, reviews, mappingRevision, english, scope.targets, corrections,
    checkIncomplete, duplicates);
  result.summary.pendingFullBodyAudits = validateFullBodyAudits(reviews, fullBodyAudits, checkIncomplete);
  result.summary.scope = rulebookId === undefined ? { kind: "global" } : { kind: "rulebook", rulebookId };
  result.summary.validation = checkIncomplete ? "incomplete-check" : "validated-proposal";
  result.summary.sourceRevision = sourceRevision;
  result.summary.mappingRevision = mappingRevision;
  result.summary.sourceCoverage = { files: sourceFiles.length, candidateOccurrences: candidates.length };
  writeQaOutputs(dataRoot, reportDir, result, checkIncomplete, rulebookId);
  const { candidateOccurrences, matchedTargets, existingTargets, acceptedTargets,
    pendingFields, pendingFullBodyAudits, decisions } =
    result.summary;
  console.log(JSON.stringify({ candidateOccurrences, matchedTargets, existingTargets,
    acceptedTargets, pendingFields, pendingFullBodyAudits, decisions }));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/dice-intake/qa.ts")) main();
