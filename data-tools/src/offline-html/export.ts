import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { load, type Cheerio } from "cheerio";
import type { Element } from "domhandler";
import sanitizeHtml from "sanitize-html";
import { repoRoot } from "../shared/env";
import { selectedSummaryVariant } from "../db/content-search-documents";
import { selectPdfTypography, type PdfTypographyPresentation } from "../zh-parser/pdf-typography";
import { isMechanismLine } from "../zh-parser/header";
import { listIdentity, type ListIdentity } from "../spell-list-markers/markers";
import { selectProcessedMembershipMarkers, type MachineMarker } from "../spell-list-markers/automatic";
import { readPrintedMarkerRecords } from "../spell-list-markers/storage";

type Spell = {
  id: string; legacySpellId: number; canonicalName: string; sourceRulebookId: number;
  sourcePage: number | null; schoolRaw: string | null; subschoolRaw: string | null;
  componentsRaw: string | null; corruptLevel: number | null; castingTimeRaw: string | null; rangeRaw: string | null;
  targetRaw: string | null; effectRaw: string | null; areaRaw: string | null;
  durationRaw: string | null; savingThrowRaw: string | null; resistanceRaw: string | null;
  descriptionText: string; descriptionHtml: string | null;
};
type Text = { spellId: number; rulebookId: number; name: string | null;
  descriptionText: string | null; descriptionHtml: string | null;
  nameProvenanceJson: string | null; bodyProvenanceJson: string | null };
export type ExportOptions = { contentDb: string; book: number; variant: string; outDir: string };
type ListEntry = ListIdentity & { ownerName: string; ownerSlug: string };
type ListGroup = { name: string; slug: string; rows: ListEntry[] };
type Summary = { spellId: number; rulebookId: number; lang: string; variant: string; summaryText: string; reviewStatus: string };
export type SummaryGap = { spellId: number; lang: string; variant: string;
  reason: "missing" | "multiple" | "wrong-book" | "not-accepted" | "empty" };
export class SummarySelectionError extends Error {
  constructor(readonly gaps: SummaryGap[]) { super(`Selected summary gaps: ${JSON.stringify(gaps)}`); }
}
const present = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const compact = (v: string) => v.replace(/\s/gu, "");
// Escape plain text without interpreting strings such as '<target>' as HTML.
const text = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const spellAnchor = (id: number) => `spell-${id}`;
const websiteRoot = "https://www.d20spellcodex.com/spells/";
function selectSummaries(rows: Summary[], ids: Set<number>, book: number, variant: string, englishTargets: Set<number>) {
  const selected = new Map<number, { en: string; zh: string }>(), gaps: SummaryGap[] = [];
  for (const id of [...ids].sort((a, b) => a - b)) {
    const values = { en: "", zh: "" };
    for (const lang of ["en", "zh"] as const) {
      if (lang === "en" && !englishTargets.has(id)) continue;
      const owner = selectedSummaryVariant(lang, variant);
      const candidates = rows.filter(row => row.spellId === id && row.lang === lang && row.variant === owner);
      const row = candidates[0];
      const reason = !row ? "missing" : candidates.length !== 1 ? "multiple" : row.rulebookId !== book ? "wrong-book"
        : row.reviewStatus !== "accepted" ? "not-accepted" : !present(row.summaryText) ? "empty" : null;
      if (reason) gaps.push({ spellId: id, lang, variant: owner, reason });
      else values[lang] = row!.summaryText;
    }
    selected.set(id, values);
  }
  if (gaps.length) throw new SummarySelectionError(gaps);
  return selected;
}

/** Only reads display language from the existing writer envelope. This is not QA acceptance. */
function language(raw: string | null, id: number, field: string, variant: string): "zh" | "en" {
  if (!raw) {
    if (variant === "effective") throw new Error(`spell ${id}: missing ${field} language metadata`);
    return "zh";
  }
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error(`spell ${id}: invalid ${field} language metadata`); }
  const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  if (!record(value) || value.schemaVersion !== 1 || value.targetId !== id || value.field !== field
    || (value.language !== "zh" && value.language !== "en") || !record(value.origin)
    || typeof value.origin.kind !== "string" || !["native", "independent", "chm", "english"].includes(value.origin.kind)
    || value.language !== (value.origin.kind === "english" ? "en" : "zh")) {
    throw new Error(`spell ${id}: conflicting ${field} language metadata`);
  }
  return value.language;
}

function document(title: string, body: string) {
  return `<!doctype html>\n<html lang="zh"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${text(title)}</title><link rel="stylesheet" href="style.css"></head><body><div id="content">${body}</div></body></html>\n`;
}
const navigation = '<p class="navigation"><a href="index.html#classes">职业目录</a> | <a href="index.html#domains">领域目录</a> | <a href="index.html#letters">A–Z 正文</a></p>';
const preview = '<p class="notice">中文内容预览，自然排版待视觉验收。</p>';
const membershipNotice = '<p class="notice">职业目录保留当前归属与附注；部分外部归属的原书核对仍待完成，目录不构成来源 QA 通过。</p>';
const domainNotice = '<p class="notice">本书收录的领域法术：仅列本书正文范围内的条目，并非原书完整领域法表。</p>';
const featNotice = '<p class="notice">专长授予法术，归属来源待核实。</p>';
const style = `body { margin: 2em; color: #222; background: #fff; font-family: "Microsoft YaHei", "SimSun", serif; line-height: 1.65; }
#content { max-width: 62em; margin: auto; } h1 { font-size: 1.7em; } h2 { border-bottom: 1px solid #bbb; }
a { color: #164f91; } .notice { padding: .6em; border: 1px solid #aaa; background: #f5f5f5; }
.spell-entry { margin-bottom: 3em; } .spell-body p, .spell-body pre, .spell-body ul, .spell-body ol, .spell-body dl, .spell-body table, .spell-body blockquote { margin-top: 0; margin-bottom: 1.65em; }
.spell-entry > h2 { font-size: 1.17em; }
.website-link { font-size: .85em; margin-left: .35em; text-decoration: none; }
.component-labels { font-size: .75em; }
.membership-note { display: block; } .spell-body li p, .spell-body td p, .spell-body th p { margin-bottom: .5em; }
.spell-body ul.pdf-typography-marked-list { list-style: none; }
.spell-body ul.pdf-typography-marked-list ul { list-style-type: disc; }
.spell-body ul.pdf-typography-marked-list ol { list-style-type: decimal; }
.spell-body ul.pdf-typography-marked-list ul.pdf-typography-marked-list { list-style: none; }
pre, .plain { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
.spell-body pre.plain-lines { white-space: normal; }
.spell-body pre.plain-lines > span { display: block; white-space: pre-wrap; }
.spell-body pre.plain-lines > span.plain-paragraph { margin-bottom: .8em; }
.spell-body pre.plain-lines > span:empty { min-height: .8em; }
.spell-body .mechanism-field { margin-top: 0; margin-bottom: 0; }
.spell-body .mechanism-end { margin-bottom: 1.65em; }
.spell-body pre.plain-lines > span.mechanism-gap, .spell-body p.mechanism-gap { margin: 0; min-height: 0; height: 0; line-height: 0; white-space: normal; }
table { border-collapse: collapse; }
th, td { border: 1px solid #999; padding: .3em .7em; }
.navigation { font-size: .95em; } li { margin: .2em 0; }\n`;

function bodyHtml(html: string | null, plain: string, prefix: string, destinations: Map<number, string>, counts: {
  detachedReferences: number; htmlTextDifferences: number;
}, naturalChinese = false) {
  if (!present(html)) html = `<pre>${text(plain)}</pre>`;
  const original = load(html, {}, false);
  if (compact(original.root().text()) !== compact(plain)) counts.htmlTextDifferences++;
  // Same sanitizer dependency used by CHM intake, with offline semantic/anchor attributes.
  const safe = sanitizeHtml(html, {
    allowedTags: ["p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "sup", "sub",
      "pre", "ul", "ol", "li", "dl", "dt", "dd", "table", "caption", "colgroup", "col", "thead",
      "tbody", "tfoot", "tr", "td", "th", "blockquote", "hr", "a", "h2", "h3", "h4", "h5", "h6"],
    allowedAttributes: { "*": ["id"], a: ["href", "title", "name"], td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"], ul: ["class"], ol: ["start"], li: ["value"], col: ["span"] },
    allowedClasses: { ul: ["pdf-typography-marked-list"] },
    allowedSchemes: [], allowProtocolRelative: false, disallowedTagsMode: "discard",
  });
  const $ = load(safe, {}, false);
  counts.detachedReferences += original("a[href]").length - $("a[href]").length;
  if (compact($.root().text()) !== compact(original.root().text())) {
    throw new Error(`${prefix}: unsafe HTML would remove visible content; repair the accepted input`);
  }
  const anchors = new Map<string, string>();
  $("[id], a[name]").each((_, el) => {
    const local = new Set<string>();
    for (const attribute of ["id", "name"]) {
      const id = $(el).attr(attribute);
      if (id === undefined) continue;
      if (anchors.has(id) && !local.has(id)) throw new Error(`${prefix}: duplicate body anchor`);
      const scoped = `${prefix}-${id}`;
      anchors.set(id, scoped); local.add(id); $(el).attr(attribute, scoped);
    }
  });
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    const match = /^(?:\/spells\/[^/]+\/[^/]+--|spell-)(\d+)(?:\/|\.html)(?:#(zh|en|rules))?$/.exec(href);
    let anchor: string | undefined;
    if (href.startsWith("#")) {
      try { anchor = anchors.get(decodeURIComponent(href.slice(1))); } catch { /* detached below */ }
    }
    if (anchor) $(el).attr("href", `#${encodeURIComponent(anchor)}`);
    else if (match && destinations.has(Number(match[1]))) {
      const id = Number(match[1]), destination = destinations.get(id)!;
      $(el).attr("href", match[2] === "zh" ? `${destination}-zh` : destination);
    }
    else { $(el).removeAttr("href"); counts.detachedReferences++; }
  });
  // Existing Chinese plain-text lines contain complete paragraphs, field rows
  // and flattened table rows. Space sentence paragraphs without joining lines,
  // guessing table cells or changing any decoded character. English pre/layout
  // and pre blocks containing markup retain their existing representation.
  if (naturalChinese && /[\u3400-\u9fff]/u.test($.root().text())) {
    // Consecutive recognized fields share one compact block. Only blank display
    // rows between fields are collapsed; text, tables, lists and notes stay intact.
    const compactFields = (nodes: Cheerio<Element>) => {
      const rows = nodes.toArray();
      let started = false, leading = 0;
      for (let index = 0; index < rows.length; index++) {
        const row = $(rows[index]!);
        if (!isMechanismLine(row.text())) {
          if (!row.text().trim()) continue;
          if (started || ++leading > 2) break;
          continue;
        }
        started = true;
        row.addClass("mechanism-field");
        let next = index + 1;
        while (next < rows.length && !$(rows[next]!).text().trim()) next++;
        if (next < rows.length && isMechanismLine($(rows[next]!).text())) {
          for (let gap = index + 1; gap < next; gap++) $(rows[gap]!).addClass("mechanism-gap");
        } else row.addClass("mechanism-end");
      }
    };
    $("pre").each((_, element) => {
      if ($(element).contents().toArray().some(node => node.type !== "text")) return;
      const value = $(element).text();
      if (!value.includes("\n")) return;
      const lines = value.split(/(\r?\n)/u);
      const spaced = lines.map((line, index) => {
        if (index % 2) return line;
        // Labels, markers and short table rows stay compact. A complete Chinese
        // sentence provides a conservative display boundary, not PDF authority.
        const paragraph = !/^[^：:\n]{1,12}[：:]/u.test(line.trimStart())
          && /[。！？][”’」』）)\s]*$/u.test(line) && Boolean(lines[index + 2]?.trim());
        return `<span${paragraph ? ' class="plain-paragraph"' : ""}>${text(line)}</span>`;
      }).join("");
      $(element).attr("class", "plain-lines").html(spaced);
      compactFields($(element).children("span"));
      if ($(element).text() !== value) throw new Error(`${prefix}: plain layout changed text`);
    });
    // Work only with sibling paragraph rows; never classify table/list cells or
    // paragraphs inside an independently headed reader-note container.
    const parents = new Set($("p").toArray().map(node => node.parent));
    for (const parent of parents) {
      if (!parent || $(parent).closest("table,ul,ol,dl,blockquote").length
        || (parent.type !== "root" && $(parent).children("h2,h3,h4,h5,h6").length)) continue;
      const children = $(parent).children();
      // Non-paragraph blocks interrupt the group, even when their text is empty.
      let group: Cheerio<Element> = children.slice(0, 0);
      let firstGroup = true;
      for (const node of children.toArray()) {
        if (node.tagName === "p" && !$(node).find("table,ul,ol,dl").length) group = group.add(node);
        else {
          if (firstGroup) compactFields(group);
          if (group.length) firstGroup = false;
          group = children.slice(0, 0);
        }
      }
      if (firstGroup) compactFields(group);
    }
  }
  return $.root().html()!;
}

/** Validate every emitted local link/anchor before creating any output directory. */
export function validatePages(pages: Map<string, string>) {
  let links = 0;
  const anchors = new Map<string, Set<string>>();
  for (const [name, html] of pages) {
    if (!name.endsWith(".html")) continue;
    const $ = load(html); const found = new Set<string>();
    $("[id], a[name]").each((_, el) => {
      for (const id of new Set([$(el).attr("id"), $(el).attr("name")].filter(present))) {
        if (found.has(id)) throw new Error(`${name}: duplicate anchor`);
        found.add(id);
      }
    });
    anchors.set(name, found);
  }
  for (const [name, html] of pages) {
    if (!name.endsWith(".html")) continue;
    const $ = load(html);
    if ($("script, iframe, object, img, [style], [onclick]").length) throw new Error(`${name}: active content`);
    $("a[href], link[href]").each((_, el) => {
      const href = $(el).attr("href")!; links++;
      if (href.startsWith(websiteRoot)) {
        const entryId = $(el).closest(".spell-entry").attr("id");
        const id = entryId?.match(/^spell-([1-9]\d*)$/)?.[1];
        if (el.tagName !== "a" || !id || !Number.isSafeInteger(Number(id))
          || $(el).attr("class") !== "website-link" || $(el).text() !== "↗"
          || $(el).attr("title") !== "在网站查看" || $(el).attr("aria-label") !== "在网站查看"
          || href !== websiteRoot + id || $(el).closest(".spell-body").length
          || $(el).closest(".spell-entry").find("a.website-link").length !== 1) {
          throw new Error(`${name}: invalid generated website link`);
        }
        return;
      }
      const [target, fragment] = href.split("#");
      if (href.includes("\\") || /[:/?]/.test(target!) || !pages.has(target || name)) {
        throw new Error(`${name}: missing or non-local link`);
      }
      if (fragment && !anchors.get(target || name)?.has(decodeURIComponent(fragment))) {
        throw new Error(`${name}: missing link anchor`);
      }
    });
  }
  return links;
}

function newOutput(outDir: string, contentDb: string) {
  const out = path.resolve(outDir), root = path.resolve(repoRoot(), "data-tools/out");
  const relative = path.relative(root, out);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || out === contentDb
    || contentDb.startsWith(out + path.sep)) throw new Error("Output must be a new child of this worktree's data-tools/out");
  if (fs.existsSync(out)) throw new Error("Output already exists; choose a new directory (no overwrite)");
  let ancestor = path.dirname(out);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  if (fs.realpathSync.native(ancestor).toLowerCase() !== ancestor.toLowerCase()) {
    throw new Error("Output ancestors must not contain symlinks or junctions");
  }
  return out;
}

/** Presentation/machine inputs are caller-authenticated by main-gate; rendering does not grant source acceptance. */
export function exportOfflineHtml(options: ExportOptions,
  presentations: ReadonlyMap<number, PdfTypographyPresentation> = new Map(), sourceDb?: Database.Database,
  machine: readonly MachineMarker[] = []) {
  if (!Number.isSafeInteger(options.book) || options.book <= 0 || !present(options.variant)) {
    throw new Error("A positive book ID and explicit variant are required");
  }
  const contentDb = path.resolve(repoRoot(), options.contentDb);
  const out = newOutput(path.resolve(repoRoot(), options.outDir), contentDb);
  const db = sourceDb ?? new Database(contentDb, { readonly: true, fileMustExist: true });
  try {
    if (!db.readonly || (sourceDb && !db.memory && path.resolve(db.name) !== contentDb)) {
      throw new Error("Typography export requires the same read-only content DB view");
    }
    db.pragma("query_only=ON");
    return db.transaction(() => {
      const spells = db.prepare(`SELECT id, legacySpellId, canonicalName, sourceRulebookId, sourcePage,
        schoolRaw, subschoolRaw, componentsRaw, corruptLevel, castingTimeRaw, rangeRaw, targetRaw, effectRaw, areaRaw,
        durationRaw, savingThrowRaw, resistanceRaw, descriptionText, descriptionHtml
        FROM SpellContent WHERE sourceRulebookId=? ORDER BY legacySpellId`).all(options.book) as Spell[];
      if (!spells.length) throw new Error("Book has no scoped SpellContent targets");
      const ids = new Set<number>(), keys = new Set<string>();
      const destinations = new Map<number, string>();
      for (const s of spells) {
        if (!Number.isSafeInteger(s.legacySpellId) || s.legacySpellId <= 0 || !present(s.id)
          || ids.has(s.legacySpellId) || keys.has(s.id)) throw new Error("Missing/duplicate target identity");
        if (s.id !== `spell:${s.legacySpellId}`) throw new Error(`spell ${s.legacySpellId}: conflicting normalized ID`);
        if (!present(s.canonicalName) || !present(s.descriptionText)) throw new Error(`spell ${s.legacySpellId}: missing English name/body`);
        const letter = s.canonicalName.charAt(0).toUpperCase();
        if (!letters.includes(letter)) throw new Error(`spell ${s.legacySpellId}: canonical name has no A–Z initial`);
        ids.add(s.legacySpellId); keys.add(s.id);
        destinations.set(s.legacySpellId, `${letter}.html#${spellAnchor(s.legacySpellId)}`);
      }
      for (const id of presentations.keys()) {
        if (!ids.has(id) || options.book !== 86 || options.variant !== "effective") {
          throw new Error("Selected typography must match a scoped SC effective target");
        }
      }
      const schema = new Set((db.prepare("PRAGMA table_info(I18nSpellText)").all() as { name: string }[]).map(r => r.name));
      const provenance = ["nameProvenanceJson", "bodyProvenanceJson"].map(col => schema.has(col) ? col : `NULL AS ${col}`).join(", ");
      const texts = db.prepare(`SELECT spellId, rulebookId, name, descriptionText, descriptionHtml, ${provenance}
        FROM I18nSpellText WHERE lang='zh' AND variant=? AND (rulebookId=? OR spellId IN
        (SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=?))`).all(options.variant, options.book, options.book) as Text[];
      const translations = new Map<number, Text>();
      for (const t of texts) {
        if (!ids.has(t.spellId) || t.rulebookId !== options.book || translations.has(t.spellId)) throw new Error("Conflicting/duplicate localized target identity");
        translations.set(t.spellId, t);
      }
      const book = db.prepare("SELECT name FROM RulebookContent WHERE legacyRulebookId=?").all(options.book) as { name: string }[];
      if (book.length !== 1 || !present(book[0]!.name)) throw new Error("Missing/duplicate publication label");
      const listEntries = db.prepare(`SELECT l.id, l.spellId, l.listType, l.ownerLegacyId, l.ownerName, l.ownerSlug,
        l.level, l.rulebookId, l.sourceRowId, l.sourceTable, l.rawExtra, l.variantLabel, l.note, l.reviewStatus FROM SpellListEntry l
        JOIN SpellContent s ON s.id=l.spellId WHERE s.sourceRulebookId=?
        ORDER BY l.listType, l.ownerLegacyId, l.level, l.id`).all(options.book) as ListEntry[];
      const classes = new Map<number, ListGroup>(), domains = new Map<number, ListGroup>();
      const classTargets = new Set<number>(), domainTargets = new Set<number>(), rowIds = new Set<string>();
      const domainTuples = new Set<string>();
      for (const row of listEntries.filter(row => row.listType === "class" || row.listType === "domain")) {
        const kind = row.listType;
        if (!present(row.id) || rowIds.has(row.id) || !Number.isSafeInteger(row.ownerLegacyId) || row.ownerLegacyId <= 0
          || !Number.isInteger(row.level) || row.level < (kind === "domain" ? 1 : 0) || row.level > 9 || !present(row.ownerName)
          || !present(row.ownerSlug) || !["accepted", "review"].includes(row.reviewStatus)) {
          throw new Error(`Invalid/duplicate ${kind} membership identity, level or metadata`);
        }
        rowIds.add(row.id);
        if (kind === "domain") {
          const tuple = JSON.stringify([row.ownerLegacyId, row.level, row.spellId, row.rawExtra, row.variantLabel]);
          if (domainTuples.has(tuple)) throw new Error("Duplicate domain membership tuple");
          domainTuples.add(tuple);
        }
        const groups = kind === "class" ? classes : domains;
        const group = groups.get(row.ownerLegacyId);
        if (group && (group.name !== row.ownerName || group.slug !== row.ownerSlug)) throw new Error(`Conflicting ${kind} owner identity`);
        if (group) group.rows.push(row);
        else groups.set(row.ownerLegacyId, { name: row.ownerName, slug: row.ownerSlug, rows: [row] });
        (kind === "class" ? classTargets : domainTargets).add(Number(row.spellId.slice("spell:".length)));
      }
      // Reuse the existing entity-name overlay contract; no summary/body fallback invents names.
      const domainNames = new Map<number, string>();
      for (const row of db.prepare("SELECT domainId, name FROM I18nDomainText WHERE lang='zh' AND variant='default'").all() as { domainId: number; name: string | null }[]) {
        if (!domains.has(row.domainId) || !present(row.name)) continue;
        if (domainNames.has(row.domainId)) throw new Error("Duplicate Chinese domain name");
        domainNames.set(row.domainId, row.name);
      }
      const summaryRows = db.prepare(`SELECT spellId, rulebookId, lang, variant, summaryText, reviewStatus
        FROM I18nSpellSummaryText WHERE spellId IN
        (SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=?)`).all(options.book) as Summary[];
      const summaries = selectSummaries(summaryRows, new Set([...classTargets, ...domainTargets]), options.book, options.variant, classTargets);
      const printedRecords = readPrintedMarkerRecords(db, options.book);
      const markerCounts = { acceptedRows: 0, machineRows: 0, unknownRows: 0, markedRows: 0, explicitEmptyRows: 0 };
      const counts = { spells: spells.length, chineseNames: 0, chineseBodies: 0,
        englishNameFallbacks: 0, englishBodyFallbacks: 0, detachedReferences: 0, htmlTextDifferences: 0 };
      const pages = new Map<string, string>([["style.css", style]]);
      const letterEntries = new Map(letters.map(letter => [letter, [] as string[]]));
      const sortedSpells = [...spells].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "en") || a.legacySpellId - b.legacySpellId);
      for (const s of sortedSpells) {
        const id = s.legacySpellId, t = translations.get(id);
        if (!t || !present(t.name) || !present(t.descriptionText)) throw new Error(`spell ${id}: missing name/body for zh/${options.variant}`);
        const nameLang = language(t.nameProvenanceJson, id, "name", options.variant);
        const bodyLang = language(t.bodyProvenanceJson, id, "body", options.variant);
        if (bodyLang !== "zh") throw new Error(`spell ${id}: Chinese body required for Chinese-only export`);
        counts[nameLang === "zh" ? "chineseNames" : "englishNameFallbacks"]++;
        counts[bodyLang === "zh" ? "chineseBodies" : "englishBodyFallbacks"]++;
        const display = selectPdfTypography(id, options.book, {
          englishText: s.descriptionText, englishHtml: s.descriptionHtml ?? "",
          chineseText: t.descriptionText, chineseHtml: t.descriptionHtml ?? "",
        }, presentations.get(id));
        const zh = bodyHtml(display.chineseHtml, t.descriptionText, `zh-${id}`, destinations, counts, bodyLang === "zh");
        // Retain the existing English input/sanitizer integrity checks internally.
        // Its body is never included in the Chinese document or output counts.
        bodyHtml(display.englishHtml, s.descriptionText, `en-${id}`, destinations,
          { detachedReferences: 0, htmlTextDifferences: 0 });
        letterEntries.get(s.canonicalName.charAt(0).toUpperCase())!.push(`<div class="spell-entry" id="${spellAnchor(id)}"><h2>${text(t.name)} / ${text(s.canonicalName)}</h2>
          <p>${text(book[0]!.name)}${s.sourcePage === null ? "" : ` · p. ${s.sourcePage}`} · ID ${id}<a class="website-link" href="${websiteRoot}${id}" title="在网站查看" aria-label="在网站查看">↗</a></p>
          ${nameLang === "en" ? '<p class="notice">中文名称缺失：显示英文名称。</p>' : ""}
          <div class="spell-body" id="${spellAnchor(id)}-zh" lang="zh">${zh}</div></div>`);
      }
      for (const letter of letters) {
        const entries = letterEntries.get(letter)!;
        pages.set(`${letter}.html`, document(`${book[0]!.name} — ${letter}`, `${navigation}<h1>${letter}</h1>${preview}
          ${entries.length ? entries.join("\n") : '<p class="empty">此字母无法术。</p>'}`));
      }
      const byId = new Map(spells.map(spell => [spell.legacySpellId, spell]));
      const classMenu: string[] = [], domainMenu: string[] = [], featMenu: string[] = [];
      let classMemberships = 0, domainMemberships = 0, specialMembershipPages = 0;
      for (const [kind, groups] of [["class", classes], ["domain", domains]] as const) {
        for (const [owner, group] of [...groups].sort(([, a], [, b]) => a.name.localeCompare(b.name, "en"))) {
          const filename = `${kind}-${owner}.html`;
          // #354 is a known feat grant stored as a domain, not an accepted ordinary domain.
          const specialFeat = kind === "domain" && options.book === 86 && owner === 28;
          if (specialFeat && group.rows.some(row => row.spellId !== "spell:3921" || row.level !== 1)) {
            throw new Error("Unrecognized pending feat membership");
          }
          if (specialFeat) specialMembershipPages++;
          const name = kind === "domain" && domainNames.has(owner)
            ? `${domainNames.get(owner)}（${group.name}）` : group.name;
          (kind === "class" ? classMenu : specialFeat ? featMenu : domainMenu).push(`<li><a href="${filename}">${text(name)}</a></li>`);
          const firstLevel = kind === "domain" ? 1 : 0;
          const sections = Array.from({ length: 10 - firstLevel }, (_, index) => {
            const level = index + firstLevel;
            const members = new Map<number, ListEntry[]>();
            for (const row of group.rows.filter(row => row.level === level)) {
              const id = Number(row.spellId.slice("spell:".length));
              members.set(id, [...(members.get(id) ?? []), row]);
            }
            const rows = [...members].sort(([a], [b]) => byId.get(a)!.canonicalName.localeCompare(byId.get(b)!.canonicalName, "en") || a - b)
              .map(([id, memberships]) => {
                if (kind === "class") classMemberships++; else domainMemberships++;
                const spell = byId.get(id)!, translation = translations.get(id)!, summary = summaries.get(id)!;
                const currentMachine = machine.filter(row => row.record.rulebookId === options.book
                  && memberships.some(entry => entry.id === row.record.listEntryId));
                if (currentMachine.some(row => row.spell.id !== spell.id || row.spell.canonicalName !== spell.canonicalName
                  || row.spell.sourceRulebookId !== spell.sourceRulebookId || row.ownerName !== group.name)) {
                  throw new Error("Stale machine marker spell/owner name or edition");
                }
                const marker = selectProcessedMembershipMarkers(memberships.map(listIdentity), options.book, printedRecords, currentMachine);
                markerCounts[marker.status === "accepted" ? "acceptedRows" : marker.status === "machine" ? "machineRows" : "unknownRows"]++;
                const labels = marker.status === "unknown" ? null : marker.markers;
                if (labels === "") markerCounts.explicitEmptyRows++;
                else if (labels) markerCounts.markedRows++;
                const markerTitle = `原书法表标记${marker.status === "machine" ? "（自动匹配）" : ""}：M 昂贵材料；F 成分包外器材；X 施法者支付经验值`;
                const qualifiers = [...new Set(memberships.map(row => [row.rawExtra, row.variantLabel, row.note].filter(present).join(" — ")).filter(present))];
                return `<li><a href="${destinations.get(id)}">${text(translation.name!)}（${text(spell.canonicalName)}）</a>${labels ? `<sup class="component-labels" title="${markerTitle}">${text(labels)}</sup>` : ""}：<span lang="zh" class="summary">${text(summary.zh)}</span>
                  ${qualifiers.map(value => `<span class="membership-note">${text(value)}</span>`).join("")}</li>`;
              }).join("\n");
            return `<h2 id="level-${level}">${level} 环</h2>${rows ? `<ul class="spell-list">${rows}</ul>` : `<p class="empty">${kind === "class" ? "此环无法术。" : "本书收录范围内，此环暂无条目。"}</p>`}`;
          }).join("\n");
          const missingName = kind === "domain" && !domainNames.has(owner)
            ? `<p class="notice">${specialFeat ? "归属" : "领域"}中文名称缺失：显示现有英文名称。</p>` : "";
          pages.set(filename, document(`${book[0]!.name} — ${name}`, `${navigation}<h1>${text(name)}</h1>${kind === "class" ? membershipNotice : specialFeat ? featNotice : domainNotice}${missingName}${sections}${navigation}`));
        }
      }
      pages.set("index.html", document(book[0]!.name, `<h1>${text(book[0]!.name)}</h1>${preview}
        <h2 id="classes">职业目录</h2>${membershipNotice}${classMenu.length ? `<ul>${classMenu.join("\n")}</ul>` : '<p class="empty">无职业归属。</p>'}
        <h2 id="domains">领域目录</h2>${domainNotice}${domainMenu.length ? `<ul>${domainMenu.join("\n")}</ul>` : '<p class="empty">本书收录范围内，无常规领域条目。</p>'}
        ${featMenu.length ? `<h3 id="special-memberships">专长授予法术（来源待核实）</h3>${featNotice}<ul>${featMenu.join("\n")}</ul>` : ""}
        <h2 id="letters">A–Z 正文</h2><p>${letters.map(letter => `<a href="${letter}.html">${letter}</a>`).join(" | ")}</p>`));
      const links = validatePages(pages);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.mkdirSync(out);
      for (const [name, html] of pages) fs.writeFileSync(path.join(out, name), html, { encoding: "utf8", flag: "wx" });
      const report = { ...counts, files: pages.size + 1, links, book: options.book, variant: options.variant,
        layout: "classes-domains-then-az", letterPages: letters.length, classPages: classes.size, classMemberships,
        classListEntries: listEntries.filter(row => row.listType === "class").length, classTargets: classTargets.size, classlessTargets: spells.filter(s => !classTargets.has(s.legacySpellId)).map(s => s.legacySpellId),
        domainPages: domains.size, ordinaryDomainPages: domains.size - specialMembershipPages, specialMembershipPages,
        domainListEntries: listEntries.filter(row => row.listType === "domain").length, domainMemberships, domainTargets: domainTargets.size,
        domainOnlyTargets: [...domainTargets].filter(id => !classTargets.has(id)).sort((a, b) => a - b),
        domainNameFallbacks: [...domains.keys()].filter(id => !domainNames.has(id)),
        domainEntriesNeedingStructuralReview: listEntries.filter(row => row.listType === "domain" && row.reviewStatus === "review").length,
        pendingMembershipIssues: specialMembershipPages ? [{ issue: 354, listType: "domain", ownerLegacyId: 28, spellId: 3921, level: 1 }] : [],
        printedMarkers: { rulebookId: options.book, ...markerCounts },
        classEntriesNeedingStructuralReview: listEntries.filter(row => row.listType === "class" && row.reviewStatus === "review").length,
        selectedSummaries: summaries.size + classTargets.size, selectedChineseSummaries: summaries.size,
        selectedEnglishSummaries: classTargets.size, domainChineseSummaries: domainTargets.size,
        summaryVariants: { en: selectedSummaryVariant("en", options.variant), zh: selectedSummaryVariant("zh", options.variant) },
        displayLanguage: "zh", displayedBodies: spells.length, displayedSummaries: summaries.size, websiteLinks: spells.length,
        pdfFormatting: presentations.size ? "partial-main-gate-selected" : "pending-431-source-mapping",
        typography: { reviewedSelectedIds: [...presentations.keys()].sort((a, b) => a - b),
          currentDisplayIds: [...ids].filter(id => !presentations.has(id)).sort((a, b) => a - b), formattingComplete: false },
        contentCertification: false, relationshipSourceQa: "pending-354",
        htmlTextPolicy: "Chinese bodies and summaries only, bilingual names. Recognized mechanism fields are compact; complete decoded text and source order stay exact, including whitespace. Canonical bilingual fields are never changed." };
      fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
      return report;
    })();
  } finally { if (!sourceDb) db.close(); }
}
