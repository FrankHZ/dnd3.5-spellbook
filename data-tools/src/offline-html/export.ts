import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { load } from "cheerio";
import sanitizeHtml from "sanitize-html";
import { repoRoot } from "../shared/env";
import { selectedSummaryVariant } from "../db/content-search-documents";
import { selectPdfTypography, type PdfTypographyPresentation } from "../zh-parser/pdf-typography";

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
type ListEntry = { id: string; spellId: string; listType: string; ownerLegacyId: number; ownerName: string;
  ownerSlug: string; level: number; rawExtra: string | null; variantLabel: string | null; note: string | null; reviewStatus: string };
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
// Same component vocabulary as the normalized runtime mapper.
const componentLabels: Record<string, string> = { verbal: "V", somatic: "S", material: "M",
  arcane_focus: "AF", divine_focus: "DF", xp: "XP", metabreath: "Metabreath / 超息",
  truename: "Truename / 真名", corrupt: "Corrupt / 腐化" };

function selectSummaries(rows: Summary[], ids: Set<number>, book: number, variant: string) {
  const selected = new Map<number, { en: string; zh: string }>(), gaps: SummaryGap[] = [];
  for (const id of [...ids].sort((a, b) => a - b)) {
    const values = { en: "", zh: "" };
    for (const lang of ["en", "zh"] as const) {
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
const navigation = '<p class="navigation"><a href="index.html#classes">职业目录 / Classes</a> | <a href="index.html#letters">A–Z 正文 / Full spells</a></p>';
const preview = '<p class="notice">内容预览 / Content preview. 全书 PDF 格式与视觉验收未完成。 / Full-book PDF formatting and visual acceptance are incomplete.</p>';
const membershipNotice = '<p class="notice">职业目录保留当前归属与附注；部分外部归属的原书核对仍待完成，目录不构成来源 QA 通过。</p>';
const style = `body { margin: 2em; color: #222; background: #fff; font-family: "Microsoft YaHei", "SimSun", serif; line-height: 1.65; }
#content { max-width: 62em; margin: auto; } h1 { font-size: 1.7em; } h2 { border-bottom: 1px solid #bbb; }
a { color: #164f91; } .notice { padding: .6em; border: 1px solid #aaa; background: #f5f5f5; }
.spell-entry { margin-bottom: 3em; } .spell-body p, .spell-body pre, .spell-body ul, .spell-body ol, .spell-body dl, .spell-body table, .spell-body blockquote { margin-top: 0; margin-bottom: 1.65em; }
.membership-note { display: block; } .spell-body li p, .spell-body td p, .spell-body th p { margin-bottom: .5em; }
.spell-body ul.pdf-typography-marked-list { list-style: none; }
.spell-body ul.pdf-typography-marked-list ul { list-style-type: disc; }
.spell-body ul.pdf-typography-marked-list ol { list-style-type: decimal; }
.spell-body ul.pdf-typography-marked-list ul.pdf-typography-marked-list { list-style: none; }
pre, .plain { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; } table { border-collapse: collapse; }
th, td { border: 1px solid #999; padding: .3em .7em; } .rules th { text-align: left; } .rules td { white-space: pre-wrap; }
.navigation { font-size: .95em; } li { margin: .2em 0; }\n`;

function bodyHtml(html: string | null, plain: string, prefix: string, destinations: Map<number, string>, counts: {
  detachedReferences: number; htmlTextDifferences: number;
}) {
  if (!present(html)) return `<div class="plain">${text(plain)}</div>`;
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
      $(el).attr("href", match[2] ? `${destination}-${match[2]}` : destination);
    }
    else { $(el).removeAttr("href"); counts.detachedReferences++; }
  });
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

/** Presentation selection is caller-authenticated by the maintained main-gate entry, not this renderer. */
export function exportOfflineHtml(options: ExportOptions,
  presentations: ReadonlyMap<number, PdfTypographyPresentation> = new Map(), sourceDb?: Database.Database) {
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
        l.level, l.rawExtra, l.variantLabel, l.note, l.reviewStatus FROM SpellListEntry l
        JOIN SpellContent s ON s.id=l.spellId WHERE s.sourceRulebookId=?
        ORDER BY l.listType, l.ownerLegacyId, l.level, l.id`).all(options.book) as ListEntry[];
      const classes = new Map<number, { name: string; slug: string; rows: ListEntry[] }>();
      const classTargets = new Set<number>(), rowIds = new Set<string>();
      for (const row of listEntries.filter(row => row.listType === "class")) {
        if (!present(row.id) || rowIds.has(row.id) || !Number.isSafeInteger(row.ownerLegacyId) || row.ownerLegacyId <= 0
          || !Number.isInteger(row.level) || row.level < 0 || row.level > 9 || !present(row.ownerName)
          || !present(row.ownerSlug) || !["accepted", "review"].includes(row.reviewStatus)) {
          throw new Error("Invalid/duplicate class membership identity, level or metadata");
        }
        rowIds.add(row.id);
        const group = classes.get(row.ownerLegacyId);
        if (group && (group.name !== row.ownerName || group.slug !== row.ownerSlug)) throw new Error("Conflicting class owner identity");
        if (group) group.rows.push(row);
        else classes.set(row.ownerLegacyId, { name: row.ownerName, slug: row.ownerSlug, rows: [row] });
        classTargets.add(Number(row.spellId.slice("spell:".length)));
      }
      const summaryRows = db.prepare(`SELECT spellId, rulebookId, lang, variant, summaryText, reviewStatus
        FROM I18nSpellSummaryText WHERE spellId IN
        (SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=?)`).all(options.book) as Summary[];
      const summaries = selectSummaries(summaryRows, classTargets, options.book, options.variant);
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
        counts[nameLang === "zh" ? "chineseNames" : "englishNameFallbacks"]++;
        counts[bodyLang === "zh" ? "chineseBodies" : "englishBodyFallbacks"]++;
        const levels = listEntries.filter(row => row.spellId === s.id).sort((a, b) => a.listType.localeCompare(b.listType)
          || a.ownerName.localeCompare(b.ownerName) || a.level - b.level || a.id.localeCompare(b.id));
        const levelText = (listType: string) => levels.filter(r => r.listType === listType).map(r => `${r.ownerName} ${r.level}${r.rawExtra ? ` ${r.rawExtra}` : ""}${r.variantLabel ? ` (${r.variantLabel})` : ""}${r.note ? ` — ${r.note}` : ""}`).join("; ");
        const descriptors = db.prepare("SELECT name, rawText FROM SpellTaxonomyFacet WHERE spellId=? AND facetType='descriptor' ORDER BY sortOrder, name").all(s.id) as { name: string; rawText: string | null }[];
        const components = db.prepare("SELECT componentType FROM SpellComponent WHERE spellId=? AND present=1 AND componentType <> 'other' ORDER BY componentType").all(s.id) as { componentType: string }[];
        const componentText = components.map(r => componentLabels[r.componentType] ?? r.componentType).join(", ");
        const headers: [string, string | null][] = [
          ["School / 学派", [s.schoolRaw, s.subschoolRaw].filter(present).join(" / ")],
          ["Descriptors / 描述符", descriptors.map(r => r.rawText ?? r.name).join(", ")],
          ["Class level / 职业等级", levelText("class")], ["Domain level / 领域等级", levelText("domain")],
          ["Components / 成分", componentText], ["Additional components / 附加成分", s.componentsRaw],
          ["Corruption cost / 腐化代价", s.corruptLevel === null ? null : String(s.corruptLevel)], ["Casting time / 施法时间", s.castingTimeRaw],
          ["Range / 距离", s.rangeRaw], ["Target / 目标", s.targetRaw], ["Effect / 效果", s.effectRaw],
          ["Area / 区域", s.areaRaw], ["Duration / 持续时间", s.durationRaw],
          ["Saving throw / 豁免", s.savingThrowRaw], ["Spell resistance / 法术抗力", s.resistanceRaw],
        ];
        const rules = headers.filter(([, value]) => present(value)).map(([label, value]) => `<tr><th>${text(label)}</th><td>${text(value!)}</td></tr>`).join("");
        const display = selectPdfTypography(id, options.book, {
          englishText: s.descriptionText, englishHtml: s.descriptionHtml ?? "",
          chineseText: t.descriptionText, chineseHtml: t.descriptionHtml ?? "",
        }, presentations.get(id));
        const zh = bodyHtml(display.chineseHtml, t.descriptionText, `zh-${id}`, destinations, counts);
        const en = bodyHtml(display.englishHtml, s.descriptionText, `en-${id}`, destinations, counts);
        letterEntries.get(s.canonicalName.charAt(0).toUpperCase())!.push(`<div class="spell-entry" id="${spellAnchor(id)}"><h2>${text(t.name)} / ${text(s.canonicalName)}</h2>
          <p>${text(book[0]!.name)}${s.sourcePage === null ? "" : ` · p. ${s.sourcePage}`} · ID ${id}</p>
          ${nameLang === "en" ? '<p class="notice">中文名称缺失：显示英文名称。 / English name fallback.</p>' : ""}
          <h3 id="${spellAnchor(id)}-rules">Current rules / 当前规则</h3><table class="rules">${rules}</table>
          <h3 id="${spellAnchor(id)}-zh">${bodyLang === "zh" ? "中文正文" : "中文正文缺失：英文回退 / English body fallback"}</h3><div class="spell-body" lang="${bodyLang}">${zh}</div>
          <h3 id="${spellAnchor(id)}-en">English</h3><div class="spell-body" lang="en">${en}</div>${navigation}</div>`);
      }
      for (const letter of letters) {
        const entries = letterEntries.get(letter)!;
        pages.set(`${letter}.html`, document(`${book[0]!.name} — ${letter}`, `${navigation}<h1>${letter}</h1>${preview}
          ${entries.length ? entries.join("\n") : '<p class="empty">此字母无法术 / No spells for this letter.</p>'}${navigation}`));
      }
      const byId = new Map(spells.map(spell => [spell.legacySpellId, spell]));
      const classMenu: string[] = []; let classMemberships = 0;
      for (const [owner, group] of [...classes].sort(([, a], [, b]) => a.name.localeCompare(b.name, "en"))) {
        const filename = `class-${owner}.html`;
        classMenu.push(`<li><a href="${filename}">${text(group.name)}</a></li>`);
        const sections = Array.from({ length: 10 }, (_, level) => {
          const members = new Map<number, ListEntry[]>();
          for (const row of group.rows.filter(row => row.level === level)) {
            const id = Number(row.spellId.slice("spell:".length));
            members.set(id, [...(members.get(id) ?? []), row]);
          }
          const rows = [...members].sort(([a], [b]) => byId.get(a)!.canonicalName.localeCompare(byId.get(b)!.canonicalName, "en") || a - b)
            .map(([id, memberships]) => {
              classMemberships++;
              const spell = byId.get(id)!, translation = translations.get(id)!, summary = summaries.get(id)!;
              const qualifiers = [...new Set(memberships.map(row => [row.rawExtra, row.variantLabel, row.note].filter(present).join(" — ")).filter(present))];
              return `<li><a href="${destinations.get(id)}">${text(translation.name!)} / ${text(spell.canonicalName)}</a>
                <div lang="zh" class="summary">${text(summary.zh)}</div><div lang="en" class="summary">${text(summary.en)}</div>
                ${qualifiers.map(value => `<span class="membership-note">${text(value)}</span>`).join("")}</li>`;
            }).join("\n");
          return `<h2 id="level-${level}">${level} 环 / Level ${level}</h2>${rows ? `<ul class="spell-list">${rows}</ul>` : '<p class="empty">此环无法术 / No spells at this level.</p>'}`;
        }).join("\n");
        pages.set(filename, document(`${book[0]!.name} — ${group.name}`, `${navigation}<h1>${text(group.name)}</h1>${membershipNotice}${sections}${navigation}`));
      }
      pages.set("index.html", document(book[0]!.name, `<h1>${text(book[0]!.name)}</h1>${preview}
        <h2 id="classes">职业目录 / Classes</h2>${membershipNotice}${classMenu.length ? `<ul>${classMenu.join("\n")}</ul>` : '<p class="empty">无职业归属 / No class memberships.</p>'}
        <h2 id="letters">A–Z 正文 / Full spells</h2><p>${letters.map(letter => `<a href="${letter}.html">${letter}</a>`).join(" | ")}</p>`));
      const links = validatePages(pages);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.mkdirSync(out);
      for (const [name, html] of pages) fs.writeFileSync(path.join(out, name), html, { encoding: "utf8", flag: "wx" });
      const report = { ...counts, files: pages.size + 1, links, book: options.book, variant: options.variant,
        layout: "classes-then-az", letterPages: letters.length, classPages: classes.size, classMemberships,
        classListEntries: rowIds.size, classTargets: classTargets.size, classlessTargets: spells.filter(s => !classTargets.has(s.legacySpellId)).map(s => s.legacySpellId),
        classEntriesNeedingStructuralReview: listEntries.filter(row => row.listType === "class" && row.reviewStatus === "review").length,
        selectedSummaries: summaries.size * 2, summaryVariants: { en: selectedSummaryVariant("en", options.variant), zh: selectedSummaryVariant("zh", options.variant) },
        pdfFormatting: presentations.size ? "partial-main-gate-selected" : "pending-431-source-mapping",
        typography: { reviewedSelectedIds: [...presentations.keys()].sort((a, b) => a - b),
          currentDisplayIds: [...ids].filter(id => !presentations.has(id)).sort((a, b) => a - b), formattingComplete: false },
        contentCertification: false, relationshipSourceQa: "pending-354",
        htmlTextPolicy: "Explicit caller-authenticated selected display derivatives; otherwise complete current HTML or exact plain text. Canonical fields are never changed; representation differences are counted." };
      fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
      return report;
    })();
  } finally { if (!sourceDb) db.close(); }
}
