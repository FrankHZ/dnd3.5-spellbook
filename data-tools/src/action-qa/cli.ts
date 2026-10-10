import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { localDataDir, repoRoot } from "../shared/env";
import { noAlias, within } from "../dice-intake/paths";
import { englishActions, inspectActions, kinds } from "./actions";
import { actionFrequency, type FrequencyRow } from "./frequency";

export type SpellRow = { spellId: number; book: number; name: string; english: string; castingTime: string | null };
export type TextRow = { variant: string; rulebookId: number; name: string | null; descriptionText: string | null;
  sourceKey: string | null; nameProvenanceJson: string | null; bodyProvenanceJson: string | null };
/** Same row-presence fallback as spells.repo.content; never fill an empty effective body from CHM. */
export function selectChinese(rows: TextRow[], variant = "effective"): TextRow | undefined {
  return rows.find(row => row.variant === variant) ?? (variant === "effective" ? rows.find(row => row.variant === "chm") : undefined);
}
export function selectSample(rows: SpellRow[], limit: number): number[] {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error("sample must be 1..1000");
  const selected = new Set<number>();
  if (rows.some(row => row.spellId === 876)) selected.add(876);
  // Sorted-ID strata intentionally oversample rare action kinds. Not a random corpus estimate.
  const buckets = [...kinds.map(kind => rows.filter(row => englishActions(row.english).some(action => action.kind === kind))),
    rows.filter(row => englishActions(row.english).length === 0)];
  const positions = buckets.map(() => 0);
  while (selected.size < Math.min(limit, rows.length)) {
    let progress = false;
    buckets.forEach((bucket, i) => {
      while (positions[i]! < bucket.length && selected.has(bucket[positions[i]!]!.spellId)) positions[i]!++;
      if (selected.size < limit && positions[i]! < bucket.length) {
        selected.add(bucket[positions[i]!]!.spellId); positions[i]!++; progress = true;
      }
    });
    if (!progress) break;
  }
  return [...selected];
}
export function scan(contentDb: string, ids: number[], variant = "effective") {
  const db = new Database(contentDb, { readonly: true, fileMustExist: true });
  try {
    const spell = db.prepare(`SELECT legacySpellId AS spellId, sourceRulebookId AS book, canonicalName AS name,
      descriptionText AS english, castingTimeRaw AS castingTime FROM SpellContent WHERE legacySpellId = ?`);
    const texts = db.prepare(`SELECT variant,rulebookId,name,descriptionText,sourceKey,nameProvenanceJson,bodyProvenanceJson
      FROM I18nSpellText WHERE spellId = ? AND lang = 'zh'`);
    return ids.map(id => {
      const row = spell.get(id) as SpellRow | undefined;
      if (!row) throw new Error(`Unknown stable ID ${id}`);
      const all = texts.all(id) as TextRow[];
      const selected = selectChinese(all, variant);
      const chm = selectChinese(all, "chm");
      let provenance: { language?: string; targetId?: number; field?: string } | null = null;
      let provenanceStatus = "absent";
      if (selected?.bodyProvenanceJson) {
        try {
          provenance = JSON.parse(selected.bodyProvenanceJson);
          provenanceStatus = provenance && provenance.targetId === id && provenance.field === "body"
            ? "identity-bound-raw-metadata" : "unbound-metadata";
        } catch { provenanceStatus = "invalid-JSON"; }
      }
      const findings = inspectActions(row.english, row.castingTime, selected?.descriptionText ?? null);
      if (selected && selected.rulebookId !== row.book) findings.forEach(f => { f.status = "unknown"; f.reason = "selected-book-mismatch"; });
      if (provenance?.language === "en") findings.forEach(f => { f.status = "unknown"; f.reason = "provenance-English-fallback"; });
      return { ...row, provenanceStatus, requestedVariant: variant, selected: selected ?? null,
        identityStatus: selected && selected.rulebookId !== row.book ? "book-mismatch" : selected ? "selected" : "missing-Chinese",
        findings,
        chmContrast: chm && selected?.variant !== "chm" ? { ...chm,
          findings: inspectActions(row.english, row.castingTime, chm.descriptionText) } : null };
    });
  } finally { db.close(); }
}
export function inventory(contentDb: string) {
  const db = new Database(contentDb, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(`SELECT legacySpellId AS spellId,sourceRulebookId AS book,canonicalName AS name,
      descriptionText AS english,castingTimeRaw AS castingTime FROM SpellContent ORDER BY legacySpellId`).all() as SpellRow[];
  } finally { db.close(); }
}
export function frequency(contentDb: string) {
  const db = new Database(contentDb, { readonly: true, fileMustExist: true });
  try {
    const rows = db.prepare(`SELECT s.legacySpellId AS spellId, s.descriptionText AS english,
      s.castingTimeRaw AS castingTime, i.descriptionText AS chinese FROM SpellContent s
      LEFT JOIN I18nSpellText i ON i.spellId=s.legacySpellId AND i.lang='zh' AND i.variant=CASE WHEN EXISTS
        (SELECT 1 FROM I18nSpellText chosen WHERE chosen.spellId=s.legacySpellId AND chosen.lang='zh' AND chosen.variant='effective')
        THEN 'effective' ELSE 'chm' END ORDER BY s.legacySpellId`).iterate() as Iterable<FrequencyRow>;
    return actionFrequency(rows);
  } finally { db.close(); }
}
/** Bounded context retrieval; compact records cover every canonical identity exactly once. */
export function actionInventory(contentDb: string) {
  const rows = inventory(contentDb);
  if (new Set(rows.map(row => row.spellId)).size !== rows.length) throw new Error("Duplicate canonical identity");
  return rows.flatMap((_, index) => index % 100 ? [] : scan(contentDb, rows.slice(index, index + 100).map(row => row.spellId)).map(row => {
    let language: string | null = null;
    try { language = JSON.parse(row.selected?.bodyProvenanceJson ?? "null")?.language ?? null; } catch { /* raw status retained */ }
    const missing = !row.selected?.descriptionText?.trim();
    const fallback = language === "en" || row.selected?.descriptionText?.trim() === row.english.trim();
    return { spellId: row.spellId, book: row.book, selectedVariant: row.selected?.variant ?? null,
      identityStatus: row.identityStatus, provenanceStatus: row.provenanceStatus,
      languageStatus: missing ? "missing-Chinese" : fallback ? "English-fallback" : "Chinese-present-unverified",
      scReadonly: row.book === 86,
      findings: row.findings.map(({kind, field, role, line, offset, status, reason, expectedOccurrences, chineseOccurrences}) =>
        ({kind, field, role, line, offset, status, reason, expectedOccurrences, chineseOccurrences})) };
  }));
}
export function outputDirectory(out: string) {
  const root = path.join(localDataDir(), "term-qa");
  noAlias(root); noAlias(out);
  if (!within(root, out) || path.resolve(out) === path.resolve(root)) throw new Error("Output must be a new child of DATA_REPO_PATH/term-qa");
  if (fs.existsSync(out)) throw new Error("Output already exists; preserve previous evidence");
  return out;
}
export function main(args: string[]) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("action:qa --content-db <file> --out <new-private-directory> [--inventory | --sample 100 | --ids 1,2] [--variant effective|chm] [--frequency]\nInventory covers all current identities in bounded chunks and refuses sample/ids/variant overrides. Relative paths resolve from the checkout root. Default/effective selection uses row presence then CHM fallback. Every lexical match remains context-unverified. Readonly DB; private evidence only; no acceptance or writer."); return;
  }
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length;) {
    const key = args[i++]!;
    if (["--frequency", "--inventory"].includes(key) && !flags.has(key)) { flags.set(key, "true"); continue; }
    const value = args[i++];
    if (!["--content-db", "--out", "--sample", "--ids", "--variant"].includes(key) || !value || value.startsWith("--") || flags.has(key)) throw new Error("Use --help; invalid/duplicate arguments");
    flags.set(key, value);
  }
  if (!flags.has("--content-db") || !flags.has("--out") || (flags.has("--sample") && flags.has("--ids"))) throw new Error("Use --help; missing or conflicting flags");
  if (flags.has("--inventory") && ["--sample", "--ids", "--variant"].some(key => flags.has(key))) throw new Error("inventory always covers all current identities; no sample/ids/variant overrides");
  const contentDb = path.resolve(repoRoot(), flags.get("--content-db")!);
  const out = outputDirectory(path.resolve(repoRoot(), flags.get("--out")!));
  const variant = flags.get("--variant") ?? "effective";
  if (!["effective", "chm"].includes(variant)) throw new Error("variant must be effective or chm");
  const before = fs.statSync(contentDb); const started = performance.now();
  const rows = inventory(contentDb);
  if (flags.has("--inventory")) {
    const records = actionInventory(contentDb);
    const frequencies = flags.has("--frequency") ? frequency(contentDb) : null;
    const serialized = records.map(row => JSON.stringify(row)).join("\n") + "\n";
    const frequencyJson = frequencies ? JSON.stringify(frequencies, null, 2) + "\n" : "";
    if (Buffer.byteLength(serialized) + Buffer.byteLength(frequencyJson) > 50 * 1024 * 1024) throw new Error("Inventory exceeds 50 MiB budget");
    const after = fs.statSync(contentDb);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error("DB metadata changed during inventory");
    const report = {schemaVersion: 1, selection: "all canonical identities, ascending stable ID, chunks of 100",
      comparisonBaseline: "canonical DB English; retrieval only, no semantic acceptance", inventoryEntries: records.length,
      inventoryEnglishBytes: rows.reduce((n, row) => n + Buffer.byteLength(row.english), 0),
      candidateEntries: records.filter(row => row.findings.some(f => f.status === "candidate")).length,
      candidateOccurrences: records.reduce((n, row) => n + row.findings.filter(f => f.status === "candidate").length, 0),
      noSeededActionEntries: records.filter(row => !row.findings.length).length,
      elapsedMs: performance.now() - started, peakRssBytes: process.resourceUsage().maxRSS * 1024,
      evidenceBytes: Buffer.byteLength(serialized), frequencyBytes: Buffer.byteLength(frequencyJson), dbMetadataUnchanged: true, modelApiCalls: 0};
    fs.mkdirSync(out, {recursive: true});
    fs.writeFileSync(path.join(out, "inventory.jsonl"), serialized, {encoding: "utf8", flag: "wx"});
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n", {encoding: "utf8", flag: "wx"});
    if (frequencies) fs.writeFileSync(path.join(out, "frequency.json"), frequencyJson, {encoding: "utf8", flag: "wx"});
    console.log(JSON.stringify(report, null, 2)); return;
  }
  const ids = flags.has("--ids") ? flags.get("--ids")!.split(",").map(Number) : selectSample(rows, Number(flags.get("--sample") ?? 100));
  if (!ids.length || ids.length > 1000 || new Set(ids).size !== ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error("ids must be unique positive integers, at most 1000");
  const evidence = scan(contentDb, ids, variant);
  const frequencies = flags.has("--frequency") ? frequency(contentDb) : null;
  const frequencyJson = frequencies ? JSON.stringify(frequencies, null, 2) + "\n" : "";
  const serialized = evidence.map(row => JSON.stringify(row)).join("\n") + "\n";
  if (Buffer.byteLength(serialized) + Buffer.byteLength(frequencyJson) > 50 * 1024 * 1024) throw new Error("Evidence exceeds 50 MiB pilot budget");
  const after = fs.statSync(contentDb);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error("DB metadata changed during scan; rerun against a stable readonly input");
  const report = { schemaVersion: 1, comparisonBaseline: "canonical DB English; no original-book verification", requestedVariant: variant,
    selection: flags.has("--ids") ? "explicit stable IDs" : "anchor plus sorted-ID round-robin body-action strata and no-body-action controls",
    selectionBias: flags.has("--ids") ? "Caller-defined stable IDs; consult the separately frozen selection; no corpus precision/recall estimate"
      : "Rare actions oversampled; early IDs favored; no corpus precision/recall estimate", entries: ids.length,
    inventoryEntries: rows.length, inventoryEnglishBytes: rows.reduce((n, row) => n + Buffer.byteLength(row.english), 0),
    findings: evidence.reduce((n, row) => n + row.findings.length, 0),
    candidates: evidence.reduce((n, row) => n + row.findings.filter(f => f.status === "candidate").length, 0),
    unknown: evidence.reduce((n, row) => n + row.findings.filter(f => f.status === "unknown").length, 0),
    elapsedMs: performance.now() - started, peakRssBytes: process.resourceUsage().maxRSS * 1024,
    evidenceBytes: Buffer.byteLength(serialized), frequencyBytes: Buffer.byteLength(frequencyJson), dbMetadataUnchanged: true, modelApiCalls: 0,
    review: "Unperformed; separate private decisions required. Unknown is never a pass." };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "evidence.jsonl"), serialized, { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  if (frequencies) fs.writeFileSync(path.join(out, "frequency.json"), frequencyJson, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main(process.argv.slice(2));
