import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual as equal } from "node:util";
import type Database from "better-sqlite3";
import acceptance from "./closeout-acceptance.json";
import { bindCommittedInputs } from "./db-english-handoff";
import { closeoutReferenceFiles, validateCloseoutReferences } from "./closeout-references";
import { parseDiceFile } from "./parse";
import { noAlias } from "./paths";
import { reconcile, type Candidate, type Rulebook } from "./reconcile";
import {
  loadEnglishRecords, selectRulebookScope, validateBoundaries,
  validateFullBodyAudits, validateReviews, validateSourceCoverage,
  type Field, type Review,
} from "./qa";
import type {
  CloseoutField, CloseoutProvenance, CloseoutResidual, CloseoutRetained,
  CloseoutTargetInput, DiceCloseout,
} from "./closeout-types";

type Owner = (typeof acceptance.owners)[number];
// Accepted evidence has several historical formats. These adapters inspect only
// committed records, and always compare their full English/CHM input snapshots.
type EvidenceRow = Record<string, any>;
const fields = ["name", "descriptionHtml"] as const;
export const protectedCloseoutBooks = [6, 86, 106] as const;
export const closeoutAcceptance = {
  issue: 586,
  revision: "d58c677ea541592c2fb8c19cfc046b4546764855",
  path: "dice-handoffs/issue-586/accepted",
} as const;
const nativeFiles = ["decisions.jsonl", "corrections.jsonl", "full-body-audit.jsonl",
  "duplicate-resolutions.jsonl", "boundary-decisions.jsonl"];
const evidenceFiles = [...nativeFiles, "target-inputs.jsonl", "current-target-inputs.jsonl",
  "referenced-inputs.jsonl", "semantic-review.json", "semantic-findings.json", "clause-review.jsonl",
  "reviews.jsonl", "numeric-checks.jsonl", "reference-name-qa.json", "unresolved.jsonl",
  "residuals.jsonl", "proposals.jsonl", "unactivated-proposals.jsonl", "unactivated-references.jsonl",
  "scope.json", "target-dispositions.jsonl", "input-manifest.json", ...closeoutReferenceFiles];

const json = <T = EvidenceRow>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
const rows = <T = EvidenceRow>(path: string): T[] => readFileSync(path, "utf8").trim()
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const locator = (key: string) => key.slice(key.indexOf(":") + 1);

export function requireCloseoutTarget(targetId: number, book: number,
  targets: Map<number, { rulebookId: number }>) {
  assert(Number.isSafeInteger(targetId) && targetId > 0 && targets.get(targetId)?.rulebookId === book,
    "closeout target publication drift");
  assert(!(protectedCloseoutBooks as readonly number[]).includes(book),
    "SC and suspended PHB cannot enter dice closeout");
}

/** Only reviewed, complete independent fields may supplement native receipts.
 * Mechanical residuals do not disqualify a complete accepted body. */
export function independentAfter(row: EvidenceRow): {
  name: string; descriptionHtml: string; bodyAccepted: boolean;
} {
  assert(row.activation === false, "independent evidence must be unactivated");
  const name = row.proposedName ?? row.name ?? row.fields?.name?.proposedText;
  const descriptionHtml = row.proposedDescriptionHtml ?? row.descriptionHtml
    ?? row.fields?.body?.proposedDescriptionHtml;
  assert(typeof name === "string" && name.trim() && typeof descriptionHtml === "string"
    && descriptionHtml.trim(), "missing independent actual after");
  const body = row.fields?.body;
  if (body) assert(["reviewed-proposal", "reviewed-proposal-with-residual", "reviewed-usable-proposal",
    "reference-draft-with-material-residual"].includes(body.status), `unreviewed independent body: ${body.status}`);
  // These flags are the original accepted dispositions, not new semantic judgments.
  const bodyAccepted = row.sourceGap !== true
    && row.bodyStatus !== "partial-or-ambiguous-DB-English"
    && body?.status !== "reference-draft-with-material-residual"
    && !(body?.residualCodes?.length > 0);
  return { name, descriptionHtml, bodyAccepted };
}

export function assertCloseoutSnapshot(row: EvidenceRow, current: CloseoutTargetInput) {
  const id = current.targetId;
  assert(equal(row.english, current.english), `complete English input drift: ${id}`);
  if (Object.hasOwn(row, "englishHtml")) assert(row.englishHtml === current.englishHtml, `English HTML drift: ${id}`);
  const zh = current.chinese.find(x => x.variant === "chm");
  if (Object.hasOwn(row, "baselineName")) assert(row.baselineName === (zh?.name ?? null)
    && row.baselineBody === (zh?.descriptionText ?? null), `CHM input drift: ${id}`);
  if (Object.hasOwn(row, "baselineHtml")) assert(row.baselineHtml === (zh?.descriptionHtml ?? null), `CHM HTML drift: ${id}`);
  if (Array.isArray(row.chinese)) {
    const prior = row.chinese.filter((x: EvidenceRow) => x.variant === "chm");
    const now = current.chinese.filter(x => x.variant === "chm");
    assert(prior.length === now.length, `CHM row coverage drift: ${id}`);
    for (let i = 0; i < prior.length; i++) for (const key of Object.keys(prior[i]))
      assert(equal(prior[i][key], now[i]![key]), `CHM snapshot drift: ${id}:${key}`);
  } else if (row.chinese && typeof row.chinese === "object") {
    for (const key of ["name", "descriptionText", "descriptionHtml"])
      assert(row.chinese[key] === (zh?.[key] ?? null), `CHM slice drift: ${id}:${key}`);
  }
}

export function assertRecoveredCandidate(row: Candidate, current: Candidate | undefined, review: Review | undefined) {
  assert(current && locator(row.sourceKey) === locator(current.sourceKey), "historical occurrence missing from current sources");
  for (const key of ["rawHeader", "rawBody", "zhName", "bodyText", "bodyHtml", "baselineName", "baselineBody"] as const)
    assert(equal(row[key], current[key]), `recovered source or CHM drift: ${row.targetId}:${key}`);
  if (row.targetId !== current.targetId) assert(review && fields.every(field => review.fields[field].status !== "accepted"),
    "accepted recovered identity changed");
}

export function putCloseoutField(output: Map<string, CloseoutField>, row: CloseoutField,
  targets: Map<number, { rulebookId: number }>) {
  requireCloseoutTarget(row.targetId, row.rulebookId, targets);
  assert(fields.includes(row.field) && typeof row.after === "string" && row.after.trim(),
    "unsupported or empty closeout field");
  assert(Object.keys(row).sort().join() === ["targetId", "rulebookId", "field", "before", "after",
    "language", "authority", "provenance", "residuals"].sort().join(), "unexpected closeout field property");
  const key = `${row.targetId}:${row.field}`, previous = output.get(key);
  assert(!previous || (equal(previous, row)), `conflicting closeout owners: ${key}`);
  output.set(key, row);
}

function provenance(owner: Owner, file: string, index: number, sourceKey: string | null): CloseoutProvenance {
  return { issue: owner.issue, pr: owner.pr, publicHead: owner.publicHead, revision: owner.revision,
    path: `${owner.path}/${file}`, row: index + 1, sourceKey,
    historicalRevision: owner.historicalRevision, historicalContinuityAuthenticated: owner.kind !== "recovered" };
}

/** Read-only, fixed acceptance table; callers cannot supply a replacement list.
 * The content DB may contain a previously applied exact result. This function
 * authenticates source/CHM acceptance; the selective writer owns effective-state
 * first-apply/retry/drift checks, including the complete target snapshots. */
export function authenticateDiceCloseout(options: {
  dataRoot: string; rulesDb: Database.Database; contentDb: Database.Database;
}): DiceCloseout {
  const started = performance.now(), { dataRoot, rulesDb: rules, contentDb: content } = options;
  noAlias(dataRoot);
  assert(rules.readonly, "closeout requires a read-only rules connection");
  // This SELECT-only authenticator also runs inside the selective writer's
  // transaction; requiring query_only on that handle would prevent revalidation.
  for (const db of [rules, content]) for (const table of ["User", "FavoriteSpell", "SpellNote"])
    assert(!db.prepare("SELECT 1 FROM sqlite_master WHERE name=? COLLATE NOCASE").get(table), "wrong DB role: app-state");
  assert(rules.prepare("SELECT 1 FROM sqlite_master WHERE name='dnd_spell'").get()
    && !rules.prepare("SELECT 1 FROM sqlite_master WHERE name='I18nSpellText'").get(), "wrong rules DB role");
  assert(content.prepare("SELECT 1 FROM sqlite_master WHERE name='I18nSpellText'").get()
    && !content.prepare("SELECT 1 FROM sqlite_master WHERE name='dnd_spell'").get(), "wrong content DB role");
  const english = loadEnglishRecords(rules);
  const englishHtml = new Map((rules.prepare("SELECT id, CAST(description_html AS BLOB) AS html FROM dnd_spell")
    .all() as Array<{ id: number; html: Buffer | null }>).map(row => [row.id, row.html?.toString("utf8") ?? null]));
  const chinese = content.prepare("SELECT * FROM I18nSpellText WHERE lang='zh' ORDER BY spellId,variant").all() as EvidenceRow[];
  const byTarget = new Map<number, EvidenceRow[]>();
  for (const row of chinese) byTarget.set(row.spellId, [...(byTarget.get(row.spellId) ?? []), row]);
  const chm = new Map(chinese.filter(row => row.variant === "chm").map(row => [row.spellId, row]));
  const targets = new Map([...english].map(([id, en]) => [id, { rulebookId: en.rulebookId,
    zhName: chm.get(id)?.name ?? null, zhBody: chm.get(id)?.descriptionText ?? null }]));
  const books = rules.prepare("SELECT id,dnd_edition_id AS editionId,name FROM dnd_rulebook").all() as Rulebook[];
  const base = join(dataRoot, "dice-baselines/issue-520"), currentPath = join(base, "intake/candidates.jsonl");
  const inventoryPath = join(base, "intake/source-inventory.jsonl");
  bindCommittedInputs(dataRoot, acceptance.preparedRevision, [currentPath, inventoryPath]);
  const current = rows<Candidate>(currentPath), inventory = rows<any>(inventoryPath);
  const mapPath = join(dataRoot, "dice-intake/publication-map.json"), aliasesPath = join(dataRoot, "chm-mapping/enName-aliases-global.json");
  const sourcePaths = inventory.map(row => join(dataRoot, "spells-dice-db-by-mo", row.file));
  bindCommittedInputs(dataRoot, acceptance.sourceRevision, [mapPath, aliasesPath, ...sourcePaths]);
  const sourceFiles = inventory.map((row, i) => ({ bytes: readFileSync(sourcePaths[i]!).length,
    parsed: parseDiceFile(row.file, readFileSync(sourcePaths[i]!)) }));
  validateSourceCoverage(sourceFiles, inventory, current);
  const replay = reconcile(sourceFiles.flatMap(file => file.parsed.records), json(mapPath), books,
    [...targets].map(([id, target]) => ({ id, ...target, enName: english.get(id)!.name })),
    acceptance.sourceRevision, json(aliasesPath));
  assert(equal(replay.candidates, current), "current all-source intake drift");
  const oldPath = join(dataRoot, "dice-intake/candidates.jsonl"), oldInventoryPath = join(dataRoot, "dice-intake/source-inventory.jsonl");
  bindCommittedInputs(dataRoot, acceptance.sourceRevision, [oldPath, oldInventoryPath]);
  const historical = rows<Candidate>(oldPath), oldInventory = rows<any>(oldInventoryPath);
  const currentLocators = new Map(current.map(row => [locator(row.sourceKey), row]));
  const output = new Map<string, CloseoutField>(), retained: CloseoutRetained[] = [];
  const affected = new Set<number>();
  let referenceSnapshotsChecked = 0, historicalComparisonsBound = 0;

  function checkInput(row: EvidenceRow) {
    const id = row.targetId, en = english.get(id);
    assert(en, `missing English target: ${id}`);
    assertCloseoutSnapshot(row, { targetId: id, english: en, englishHtml: englishHtml.get(id)!, chinese: byTarget.get(id) ?? [] });
  }

  for (const owner of acceptance.owners) {
    assert(!(protectedCloseoutBooks as readonly number[]).includes(owner.book), "protected acceptance owner");
    const directory = join(dataRoot, owner.path);
    // Bind the files present in the accepted tree, not arbitrary new checkout files.
    const tree = execFileSync("git", ["-C", dataRoot, "ls-tree", "-r", "--name-only", owner.revision, "--", owner.path],
      { encoding: "utf8" }).trim().split(/\r?\n/);
    const ownedFiles = evidenceFiles.filter(file => tree.includes(`${owner.path}/${file}`));
    bindCommittedInputs(dataRoot, owner.revision, ownedFiles.map(file => join(directory, file)));
    const readRows = <T = EvidenceRow>(file: string): T[] => ownedFiles.includes(file) ? rows<T>(join(directory, file)) : [];
    const inputRows = [...readRows("target-inputs.jsonl"), ...readRows("current-target-inputs.jsonl")];
    for (const row of inputRows) checkInput(row);
    // Referenced input records are complete immutable snapshots too, including
    // SC references. Reading them gives no SC write authority.
    for (const file of ["referenced-inputs.jsonl", "inherited-inputs.jsonl"])
      for (const row of readRows(file)) if (row.english) { checkInput(row); referenceSnapshotsChecked++; }
    const references = validateCloseoutReferences({ book: owner.book, path: owner.path, files: ownedFiles,
      read: file => file.endsWith(".jsonl") ? readRows(file) : json(join(directory, file)), english, rules });
    referenceSnapshotsChecked += references.checked;
    historicalComparisonsBound += references.historicalComparisons;
    const residualFiles = ["unresolved.jsonl", "residuals.jsonl"].filter(file => ownedFiles.includes(file));
    const residualRows = residualFiles.flatMap(file => readRows(file).map((row, index) => ({ row, file, index })));
    const residuals = (id: number): CloseoutResidual[] => residualRows.filter(x => x.row.targetId === id || x.row.targetIds?.includes(id))
      .map(x => ({ ownerIssue: Number(x.row.ownerIssue ?? owner.issue), path: `${owner.path}/${x.file}`, row: x.index + 1 }));
    const mixed = (id: number) => residualRows.some(x => x.row.targetId === id
      && (x.row.status === "literal-English-clause-fallback" || x.row.disposition?.includes("mixed-language HTML")));
    const before = (id: number, field: Field): string | null => {
      return chm.get(id)?.[field] ?? null;
    };
    function add(id: number, field: Field, after: string, prov: CloseoutProvenance, independent: boolean) {
      requireCloseoutTarget(id, owner.book, targets); affected.add(id);
      const previous = output.get(`${id}:${field}`);
      // Only this explicit accepted lineage can replace earlier ownership.
      if (previous && previous.provenance.issue === 162 && [575, 577].includes(owner.issue)) {
        retained.push({ targetId: id, rulebookId: owner.book, field, reason: "superseded", provenance: previous.provenance });
        output.delete(`${id}:${field}`);
      } else if (previous && previous.provenance.issue === owner.issue && previous.after === after) return;
      if (independent && after === (chm.get(id)?.[field] ?? null)) {
        retained.push({ targetId: id, rulebookId: owner.book, field, reason: "existing-Chinese-unchanged", provenance: prov });
        return;
      }
      putCloseoutField(output, { targetId: id, rulebookId: owner.book, field, before: before(id, field), after,
        language: field === "descriptionHtml" && mixed(id) ? "mixed" : "zh",
        authority: independent ? "independent-db-english" : owner.kind === "recovered" ? "recovered-db-english" : "native-db-english",
        provenance: prov, residuals: residuals(id) }, targets);
    }

    if (owner.kind !== "independent") {
      for (const file of nativeFiles) assert(ownedFiles.includes(file) || !existsSync(join(directory, file)), `unbound native evidence: ${file}`);
      const reviews = readRows<Review>("decisions.jsonl");
      assert(reviews.length > 0, "missing native decisions");
      const legacy = owner.kind === "recovered", source = legacy ? historical : current;
      const scope = selectRulebookScope(owner.book, source, targets, legacy ? oldInventory : inventory);
      let selected = scope.candidates, selectedTargets = scope.targets, selectedInventory = scope.inventory;
      if (owner.kind === "slice") {
        const ids = new Set<number>(json(join(directory, "scope.json")).targetIds);
        selected = scope.candidates.filter(row => ids.has(row.targetId!));
        selectedTargets = new Map([...scope.targets].filter(([id]) => ids.has(id)));
        selectedInventory = scope.inventory.map(file => ({ ...file, unparsedSpans: file.unparsedSpans.filter(span => selected.some(row => row.file === file.file && row.startLine <= span.startLine && span.startLine <= row.endLine)) }));
      }
      if (legacy) for (const row of selected) {
        assertRecoveredCandidate(row, currentLocators.get(locator(row.sourceKey)), reviews.find(x => x.sourceKey === row.sourceKey));
      }
      const mapRevision = legacy ? acceptance.historicalMappingRevision : acceptance.sourceRevision;
      const result = validateReviews(selected, reviews, mapRevision, english, selectedTargets,
        readRows("corrections.jsonl"), false, readRows("duplicate-resolutions.jsonl"));
      validateFullBodyAudits(reviews, readRows("full-body-audit.jsonl"));
      validateBoundaries(selected, reviews, selectedInventory, readRows("boundary-decisions.jsonl"),
        legacy ? acceptance.historicalSourceRevision : acceptance.sourceRevision, mapRevision);
      for (const row of result.accepted) for (const field of fields) if (row[field] !== undefined) {
        const index = reviews.findIndex(x => x.sourceKey === row.sourceKey);
        add(row.targetId, field, row[field]!, provenance(owner, "decisions.jsonl", index, row.sourceKey), false);
      }
    }
    if (owner.independentFile) {
      assert(ownedFiles.includes(owner.independentFile), "missing committed independent proposal");
      for (const [index, row] of readRows(owner.independentFile).entries()) {
        const id = row.targetId, en = english.get(id);
        requireCloseoutTarget(id, owner.book, targets);
        const input = row.input?.english ? row.input : inputRows.find(x => x.targetId === id);
        assert(input, `independent proposal lacks complete input: ${id}`);
        checkInput({ targetId: id, ...input });
        if (row.input && input !== row.input) assert(equal(row.input, input), `proposal input drift: ${id}`);
        if (row.mechanicsReview?.english) assert(equal(row.mechanicsReview.english, en!.mechanics), `proposal mechanics drift: ${id}`);
        const after = independentAfter(row), prov = provenance(owner, owner.independentFile, index, row.sourceKey ?? null);
        if (row.field !== "descriptionHtml") add(id, "name", after.name, prov, true);
        // #153 expressly withheld 989's incomplete damage-table body; its saved
        // available-clause translation is evidence, not an accepted full body.
        if (after.bodyAccepted && !(owner.issue === 153 && id === 989)) add(id, "descriptionHtml", after.descriptionHtml, prov, true);
        else {
          const key = `${id}:descriptionHtml`, prior = output.get(key);
          if (prior) {
            assert(prior.provenance.issue === 162 && [575, 577].includes(owner.issue), "unaccepted body conflicts with another accepted owner");
            output.delete(key);
            retained.push({ targetId: id, rulebookId: owner.book, field: "descriptionHtml", reason: "superseded", provenance: prior.provenance });
          }
          retained.push({ targetId: id, rulebookId: owner.book, field: "descriptionHtml", reason: "unaccepted-body", provenance: prov });
        }
      }
    }
  }
  // Later accepted Complete Arcane dispositions explicitly withhold these five
  // bodies. Assert the final write set, so a future adapter cannot accidentally
  // revive an earlier field while merely reporting the later residual.
  for (const id of [457, 508, 529, 530, 578]) {
    assert(!output.has(`${id}:descriptionHtml`) && retained.some(row => row.targetId === id
      && row.field === "descriptionHtml" && row.reason === "unaccepted-body"), "withheld Arcane body revived");
    assert(chm.get(id)?.name && retained.some(row => row.targetId === id && row.field === "name"
      && row.reason === "existing-Chinese-unchanged"), "withheld Arcane target lost retained Chinese name");
  }
  const outputFields = [...output.values()].sort((a, b) => a.targetId - b.targetId || a.field.localeCompare(b.field));
  const outputTargets: CloseoutTargetInput[] = [...new Set(outputFields.map(row => row.targetId))].sort((a, b) => a - b)
    .map(id => ({ targetId: id, english: english.get(id)!, englishHtml: englishHtml.get(id)!, chinese: byTarget.get(id) ?? [] }));
  const byAuthority: Record<string, number> = {};
  for (const row of outputFields) byAuthority[row.authority] = (byAuthority[row.authority] ?? 0) + 1;
  // The closeout's reviewed projection is an additional exact expectation, never
  // a replacement for the original authentication above. Effective rows can be
  // added by the separate writer; canonical inputs and all other variants stay
  // exactly at this acceptance baseline.
  const acceptedDir = join(dataRoot, closeoutAcceptance.path);
  bindCommittedInputs(dataRoot, closeoutAcceptance.revision,
    ["fields.jsonl", "targets.jsonl", "retained.jsonl"].map(file => join(acceptedDir, file)));
  assert(equal(outputFields, rows<CloseoutField>(join(acceptedDir, "fields.jsonl"))), "accepted closeout field set drift");
  assert(equal(retained, rows<CloseoutRetained>(join(acceptedDir, "retained.jsonl"))), "accepted closeout retained set drift");
  const originalTargets = rows<CloseoutTargetInput>(join(acceptedDir, "targets.jsonl"));
  const stableTargets = (records: CloseoutTargetInput[]) => records.map(row => ({ ...row,
    chinese: row.chinese.filter(x => x.variant !== "effective") }));
  assert(equal(stableTargets(outputTargets), stableTargets(originalTargets)), "accepted closeout canonical/CHM input drift");
  return { fields: outputFields, targets: outputTargets, retained, report: { issue: 586,
    protectedRulebookIds: [...protectedCloseoutBooks], sourceFiles: sourceFiles.length,
    candidateOccurrences: current.length, existingTargets: english.size, fields: outputFields.length,
    targets: outputTargets.length, byAuthority, retained: retained.length, elapsedMs: performance.now() - started,
    peakRssKiB: process.resourceUsage().maxRSS, operatorWrites: false, historicalContinuityAuthenticated: false,
    referenceSnapshotsChecked, historicalComparisonsBound } };
}
