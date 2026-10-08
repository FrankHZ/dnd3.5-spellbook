import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { localDataDir, repoRoot } from "../shared/env";
import { readRulebookPublicationMetadataJsonlText } from "../rulebooks/publication-metadata";

export type BookScope = { publicationId: number; prefix: string; contentsLabel: string };
export type Scope = {
  schemaVersion: 1;
  books: BookScope[];
  pages: string[];
  probes: { classId: number; publicationId: number }[];
};
export type Evidence = {
  id: string;
  source: string;
  ordinal: number;
  label: string;
  ancestors: string[];
  local: string | null;
  targetExists: boolean;
  targetPublicationId: number | null;
  contextPublicationId: number | null;
  role: "spell-list-reference" | "variant" | "class-entry" | "other";
};
export type Identity = { id: number; name: string; slug: string; prestige: number; aliases: string[] };
export type Candidate = {
  key: string;
  classId: number;
  publicationId: number;
  variantId: number | null;
  page: number | null;
  name: string;
  aliases: string[];
  evidenceIds: string[];
  proposedDisposition: "ambiguous" | "absent";
};
export type Proposal = {
  key: string;
  disposition: "accepted" | "ambiguous" | "absent" | "not-applicable";
  relation: "class-entry" | "variant" | "reprint" | "spell-list-reference" | "cross-book-reference" | "unknown";
  evidenceIds: string[];
  rationale: string;
};

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const positive = (n: unknown): n is number => Number.isInteger(n) && Number(n) > 0;
const nonempty = (s: unknown): s is string => typeof s === "string" && !!s.trim();
export function relativeLocator(value: string) {
  const normalized = value.replace(/\\/g, "/");
  requireValue(normalized && !/^[a-z]+:|^\/|[?#\0]/i.test(normalized) && !normalized.split("/").some(x => x === ".." || !x), `Unsafe source locator: ${value}`);
  return normalized;
}
export function parseScope(value: unknown): Scope {
  requireValue(record(value) && value.schemaVersion === 1 && Array.isArray(value.books) && value.books.length > 0 && Array.isArray(value.pages) && Array.isArray(value.probes), "Invalid scope");
  const ids = new Set<number>(), labels = new Set<string>();
  for (const b of value.books) {
    requireValue(record(b) && positive(b.publicationId) && nonempty(b.prefix) && nonempty(b.contentsLabel), "Invalid book binding");
    requireValue(!ids.has(b.publicationId) && !labels.has(b.contentsLabel), "Duplicate book binding");
    b.prefix = relativeLocator(b.prefix);
    ids.add(b.publicationId); labels.add(b.contentsLabel);
  }
  const books = value.books as BookScope[];
  for (const b of books) for (const other of books) {
    if (b !== other) requireValue(!b.prefix.startsWith(other.prefix + "/") && b.prefix !== other.prefix, "Overlapping book prefixes");
  }
  for (const p of value.pages) requireValue(nonempty(p) && relativeLocator(p) === p && /\.html?$/i.test(p) && books.some(b => p.startsWith(b.prefix + "/")), "Page outside scoped books");
  requireValue(new Set(value.pages).size === value.pages.length, "Duplicate page");
  const probes = new Set<string>();
  for (const p of value.probes) {
    requireValue(record(p) && positive(p.classId) && positive(p.publicationId) && ids.has(p.publicationId), "Invalid probe");
    const key = `${p.publicationId}:${p.classId}`;
    requireValue(!probes.has(key), "Duplicate probe"); probes.add(key);
  }
  return value as unknown as Scope;
}

export function decodeHtml(bytes: Buffer) {
  const declaration = bytes.subarray(0, 2048).toString("ascii").match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const encoding = bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])) ? "utf8" : declaration ?? "gbk";
  requireValue(["utf8", "utf-8", "gbk", "gb2312", "gb18030"].includes(encoding), `Unsupported HTML encoding: ${encoding}`);
  const text = iconv.decode(bytes, encoding);
  requireValue(!text.includes("\ufffd"), "HTML decoding produced replacement characters");
  return text;
}

/** HHC often omits LI end tags; preserve its UL hierarchy without browser repair. */
export function parseDirectory(text: string, source: string): Evidence[] {
  const rows: Evidence[] = [], ancestors: string[] = [];
  let last = "", ordinal = 0;
  for (const token of text.matchAll(/<\/?ul\b[^>]*>|<object\b[^>]*>[\s\S]*?<\/object\s*>/gi)) {
    if (/^<\/ul/i.test(token[0])) { ancestors.pop(); continue; }
    if (/^<ul/i.test(token[0])) { ancestors.push(last); continue; }
    const $ = cheerio.load(token[0], {}, false);
    if ($("object").attr("type")?.toLowerCase() !== "text/sitemap") continue;
    ordinal++;
    const params: Record<string, string> = {};
    $("param").each((_, el) => { params[($(el).attr("name") ?? "").toLowerCase()] = $(el).attr("value") ?? ""; });
    last = params.name ?? "";
    // Preserve fragments in evidence; filesystem resolution strips them later.
    const local = params.local?.replace(/\\/g, "/") || null;
    rows.push({ id: `${source}:${ordinal}`, source, ordinal, label: last, ancestors: ancestors.filter(Boolean), local, targetExists: false, targetPublicationId: null, contextPublicationId: null, role: classify(last, ancestors, local) });
  }
  return rows;
}
function classify(label: string, ancestors: string[], local: string | null): Evidence["role"] {
  const context = [label, ...ancestors, local ?? ""].join(" ");
  if (/法术列?表|法术清单|spell\s*list/i.test(context)) return "spell-list-reference";
  if (/变体|替代|替换|variant|substitution/i.test(context)) return "variant";
  if (/职业|进阶|基础|class(?:es)?/i.test(context)) return "class-entry";
  return "other";
}
function targetFile(local: string) { return relativeLocator(local.split("#")[0]!); }
function inside(root: string, target: string) { const rel = path.relative(root, target); return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel); }
function sourceFile(root: string, locator: string) {
  const file = path.join(root, targetFile(locator));
  requireValue(inside(fs.realpathSync(root), fs.realpathSync(file)), `Source link escapes root: ${locator}`);
  return file;
}
export function nameKeys(label: string) {
  const clean = label.replace(/^\[[^\]]+\]\s*/, "").trim();
  if (!/[\u3400-\u9fff]/.test(clean)) return [nameKey(clean)];
  const bilingual = clean.match(/([A-Za-z][A-Za-z '\u2019-]+)$/)?.[1];
  return [...new Set([clean, clean.replace(/\s*[（(][^()（）]*[）)]\s*$/, ""), ...(bilingual ? [bilingual] : []), ...Array.from(clean.matchAll(/[（(]([^()（）]+)[）)]/g), m => m[1]!)].map(nameKey).filter(Boolean))];
}
const nameKey = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function matchEvidence(identities: Identity[], evidence: Evidence[]) {
  const index = new Map<string, Set<number>>();
  for (const c of identities) for (const key of [c.name, ...c.aliases].map(nameKey)) {
    if (!index.has(key)) index.set(key, new Set()); index.get(key)!.add(c.id);
  }
  return evidence.map(e => ({ evidenceId: e.id, classIds: e.id.endsWith(":lead") ? [] : [...new Set(nameKeys(e.label).flatMap(k => [...(index.get(k) ?? [])]))] }));
}

export function validateProposals(input: unknown, candidates: Candidate[], evidence: Evidence[]): Proposal[] {
  requireValue(Array.isArray(input), "Proposals must be an array");
  const byKey = new Map(candidates.map(c => [c.key, c])), byEvidence = new Map(evidence.map(e => [e.id, e]));
  const seen = new Set<string>();
  for (const p of input) {
    requireValue(record(p) && nonempty(p.key) && byKey.has(p.key) && !seen.has(p.key), "Unknown or duplicate proposal key");
    requireValue(Object.keys(p).every(k => ["key", "disposition", "relation", "evidenceIds", "rationale"].includes(k)), "Unknown proposal field");
    seen.add(p.key);
    requireValue(["accepted", "ambiguous", "absent", "not-applicable"].includes(String(p.disposition)) && ["class-entry", "variant", "reprint", "spell-list-reference", "cross-book-reference", "unknown"].includes(String(p.relation)) && nonempty(p.rationale), "Invalid proposal disposition/relation/rationale");
    requireValue(Array.isArray(p.evidenceIds) && p.evidenceIds.length > 0 && new Set(p.evidenceIds).size === p.evidenceIds.length, "Evidence required");
    const candidate = byKey.get(p.key)!;
    const references = p.evidenceIds.map(id => { requireValue(typeof id === "string" && byEvidence.has(id), "Unknown evidence locator"); return byEvidence.get(id)!; });
    requireValue(references.every(e => e.targetPublicationId === candidate.publicationId || e.contextPublicationId === candidate.publicationId), "Evidence from unrelated book");
    if (p.disposition === "accepted") {
      requireValue(["class-entry", "variant", "reprint"].includes(String(p.relation)), "References cannot establish class origin");
      requireValue(references.some(e => e.targetExists && e.targetPublicationId === candidate.publicationId && ["class-entry", "variant"].includes(e.role)), "Accepted proposal needs a local class/variant entry");
    }
  }
  requireValue(seen.size === candidates.length, "Proposals must cover the entire declared candidate scope");
  return input as Proposal[];
}

export function scan(options: { chmRoot: string; rulesDb: string; contentDb: string; scope: string; out: string; proposals?: string }) {
  const started = performance.now();
  const resolve = (p: string) => path.resolve(repoRoot(), p);
  const chmRoot = resolve(options.chmRoot), rulesDb = resolve(options.rulesDb), contentDb = resolve(options.contentDb);
  requireValue(![rulesDb, contentDb].some(p => /app-state/i.test(path.basename(p))), "App-state is outside this workflow");
  const scope = parseScope(JSON.parse(fs.readFileSync(resolve(options.scope), "utf8")));
  const dataRoot = fs.realpathSync(localDataDir()), out = resolve(options.out);
  requireValue(inside(dataRoot, out) && !fs.existsSync(out) && fs.existsSync(path.dirname(out)) && inside(dataRoot, fs.realpathSync(path.dirname(out))), "Output must be a new directory inside an existing private data subdirectory");
  requireValue(!inside(chmRoot, out), "Output cannot be inside the CHM source");
  const git = (...args: string[]) => execFileSync("git", ["-C", chmRoot, ...args], { encoding: "utf8" }).trim();
  const revision = git("rev-parse", "HEAD"), sourceStatus = git("status", "--porcelain", "--untracked-files=all");
  requireValue(!sourceStatus, "CHM source must be clean; preserve and resolve source changes separately");
  const publicationsPath = path.join(dataRoot, "rulebook-publications/publications.jsonl");
  const publications = readRulebookPublicationMetadataJsonlText(fs.readFileSync(publicationsPath, "utf8"));
  requireValue(!publications.errors.length, publications.errors.join("\n"));
  const rules = new Database(rulesDb, { readonly: true, fileMustExist: true });
  const content = new Database(contentDb, { readonly: true, fileMustExist: true });
  let identities: Identity[], variants: { id: number; classId: number; publicationId: number; page: number | null }[], books: { id: number; name: string; abbr: string; slug: string }[];
  try {
    identities = (rules.prepare("SELECT id, name, slug, prestige FROM dnd_characterclass ORDER BY id").all() as Omit<Identity, "aliases">[]).map(c => ({ ...c, aliases: [] }));
    const aliases = content.prepare("SELECT classId, name FROM I18nCharacterClassText WHERE lang = 'zh' AND name IS NOT NULL ORDER BY classId, variant").all() as { classId: number; name: string }[];
    const identityMap = new Map(identities.map(c => [c.id, c]));
    for (const alias of aliases) identityMap.get(alias.classId)?.aliases.push(alias.name);
    variants = rules.prepare("SELECT id, character_class_id AS classId, rulebook_id AS publicationId, page FROM dnd_characterclassvariant ORDER BY id").all() as typeof variants;
    books = rules.prepare("SELECT id, name, abbr, slug FROM dnd_rulebook ORDER BY id").all() as typeof books;
    for (const b of scope.books) {
      const db = books.find(x => x.id === b.publicationId), pub = publications.rows.find(x => x.legacyRulebookId === b.publicationId);
      requireValue(db && pub && db.name === pub.name && db.abbr === pub.abbr, `Publication identity mismatch: ${b.publicationId}`);
    }
    for (const p of scope.probes) requireValue(identityMap.has(p.classId), "Unknown probe class ID");
  } finally { rules.close(); content.close(); }
  let htmlFiles = 0, htmlBytes = 0;
  const inventory = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const file = path.join(dir, entry.name);
      requireValue(!entry.isSymbolicLink(), `CHM inventory refuses links: ${file}`);
      if (entry.isDirectory()) inventory(file);
      else if (/\.html?$/i.test(entry.name)) { htmlFiles++; htmlBytes += fs.statSync(file).size; }
    }
  };
  inventory(chmRoot);
  let bytesRead = 0, directoryRows = 0;
  const evidence: Evidence[] = [];
  const bookForPath = (local: string | null) => scope.books.find(b => local?.startsWith(b.prefix + "/"))?.publicationId ?? null;
  for (const name of ["Contents.hhc", "Index.hhk"]) {
    const bytes = fs.readFileSync(sourceFile(chmRoot, name)); bytesRead += bytes.length;
    const rows = parseDirectory(decodeHtml(bytes), name); directoryRows += rows.length;
    for (const e of rows) {
      e.targetPublicationId = bookForPath(e.local);
      e.contextPublicationId = [...e.ancestors, e.label].map(label => scope.books.find(b => b.contentsLabel === label)?.publicationId).filter(x => x !== undefined).at(-1) ?? null;
      if (e.targetPublicationId === null && e.contextPublicationId === null) continue;
      if (e.local) {
        const local = targetFile(e.local);
        if (fs.existsSync(path.join(chmRoot, local))) { sourceFile(chmRoot, local); e.targetExists = true; }
      }
      evidence.push(e);
    }
  }
  for (const book of scope.books) requireValue(evidence.some(e => e.label === book.contentsLabel && e.targetPublicationId === book.publicationId), `Unverified Contents binding: ${book.publicationId}`);
  for (const local of scope.pages) {
    const bytes = fs.readFileSync(sourceFile(chmRoot, local)); bytesRead += bytes.length;
    const $ = cheerio.load(decodeHtml(bytes)); $("script,style").remove();
    // Only explicitly requested pages; headings retain English titles without exporting whole bodies.
    const labels = new Set<string>();
    $("title,h1,h2,h3,h4,b,strong").each((_, el) => { const text = $(el).text().replace(/\s+/g, " ").trim(); if (text && text.length <= 240) labels.add(text); });
    let ordinal = 0;
    for (const label of labels) {
      ordinal++;
      evidence.push({ id: `${local}:heading:${ordinal}`, source: local, ordinal, label, ancestors: [], local, targetExists: true, targetPublicationId: bookForPath(local), contextPublicationId: null, role: classify(label, [], local) });
    }
    evidence.push({ id: `${local}:lead`, source: local, ordinal: 0, label: $("body").text().replace(/\s+/g, " ").trim().slice(0, 1000), ancestors: [], local, targetExists: true, targetPublicationId: bookForPath(local), contextPublicationId: null, role: "other" });
  }
  const matches = matchEvidence(identities, evidence);
  const evidenceByClass = new Map<number, Evidence[]>(), evidenceById = new Map(evidence.map(e => [e.id, e]));
  for (const match of matches) for (const id of match.classIds) {
    if (!evidenceByClass.has(id)) evidenceByClass.set(id, []);
    evidenceByClass.get(id)!.push(evidenceById.get(match.evidenceId)!);
  }
  const selected = new Set(scope.books.map(b => b.publicationId)), identityMap = new Map(identities.map(c => [c.id, c]));
  const targets = variants.filter(v => selected.has(v.publicationId)).map(v => ({ classId: v.classId, publicationId: v.publicationId, variantId: v.id as number | null, page: v.page }));
  for (const p of scope.probes) {
    requireValue(!targets.some(t => t.classId === p.classId && t.publicationId === p.publicationId), "Probe duplicates a DB variant");
    targets.push({ ...p, variantId: null, page: null });
  }
  const candidates: Candidate[] = targets.map(t => {
    const c = identityMap.get(t.classId)!;
    const hits = (evidenceByClass.get(c.id) ?? []).filter(e => e.targetPublicationId === t.publicationId || e.contextPublicationId === t.publicationId);
    return { ...t, key: `${t.publicationId}:${t.classId}:${t.variantId ?? "probe"}`, name: c.name, aliases: c.aliases, evidenceIds: hits.map(e => e.id), proposedDisposition: hits.length ? "ambiguous" : "absent" };
  });
  const proposals = options.proposals ? validateProposals(JSON.parse(fs.readFileSync(resolve(options.proposals), "utf8")), candidates, evidence) : null;
  requireValue(git("rev-parse", "HEAD") === revision && git("status", "--porcelain", "--untracked-files=all") === sourceStatus, "CHM changed during scan");
  fs.mkdirSync(out);
  const write = (name: string, value: unknown) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  const jsonl = (name: string, rows: unknown[]) => fs.writeFileSync(path.join(out, name), rows.map(x => JSON.stringify(x)).join("\n") + "\n", { flag: "wx" });
  write("scope.json", scope);
  write("identities.json", { classes: identities, publications: books.filter(b => selected.has(b.id)), publicationMetadata: publications.rows.filter(b => selected.has(b.legacyRulebookId)) });
  jsonl("evidence.jsonl", evidence); jsonl("matches.jsonl", matches); jsonl("candidates.jsonl", candidates);
  if (proposals) jsonl("proposals.jsonl", proposals.map(p => {
    const { proposedDisposition: _hint, ...identity } = candidates.find(c => c.key === p.key)!;
    return { schemaVersion: 1, reviewStatus: "proposed", sourceRevision: revision, ...identity, ...p };
  }));
  const report = {
    schemaVersion: 1, reviewStatus: "proposed", source: { chmRoot, revision, status: sourceStatus }, inputs: { rulesDb, contentDb, publicationsPath },
    scope: { publicationIds: [...selected], variantTargets: targets.filter(t => t.variantId !== null).length, probes: scope.probes.length, bodyPages: scope.pages.length },
    inventory: { htmlFiles, htmlBytes, directoryRows, directoryAndPageBytesRead: bytesRead, dbClasses: identities.length, dbVariants: variants.length, dbPublications: books.length },
    results: { candidates: candidates.length, directoryOrHeadingHits: candidates.filter(c => c.evidenceIds.length).length, noExactNameHit: candidates.filter(c => !c.evidenceIds.length).length, homonymEvidence: matches.filter(m => m.classIds.length > 1).length, proposals: proposals?.reduce<Record<string, number>>((a, p) => { a[p.disposition] = (a[p.disposition] ?? 0) + 1; return a; }, {}) ?? null },
    resources: { elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS / 1024, outputBytesBeforeReport: fs.readdirSync(out).reduce((sum, name) => sum + fs.statSync(path.join(out, name)).size, 0) },
    limits: "No acceptance or DB writes. Absent means no matched evidence in this scope, not nonexistence. DB variant rows are leads, not source verification. Full parent coverage remains pending.",
  };
  write("report.json", report);
  return report;
}
