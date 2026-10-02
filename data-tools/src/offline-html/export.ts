import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { load } from "cheerio";
import sanitizeHtml from "sanitize-html";
import { repoRoot } from "../shared/env";

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
const present = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const compact = (v: string) => v.replace(/\s/gu, "");
// Escape plain text without interpreting strings such as '<target>' as HTML.
const text = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pageName = (id: number) => `spell-${id}.html`;
// Same component vocabulary as the normalized runtime mapper.
const componentLabels: Record<string, string> = { verbal: "V", somatic: "S", material: "M",
  arcane_focus: "AF", divine_focus: "DF", xp: "XP", metabreath: "Metabreath / 超息",
  truename: "Truename / 真名", corrupt: "Corrupt / 腐化" };

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
const navigation = '<p class="navigation"><a href="index.html">中文索引</a> | <a href="index-en.html">English index</a></p>';
const style = `body { margin: 2em; color: #222; background: #fff; font-family: "Microsoft YaHei", "SimSun", serif; line-height: 1.65; }
#content { max-width: 62em; margin: auto; } h1 { font-size: 1.7em; } h2 { border-bottom: 1px solid #bbb; }
a { color: #164f91; } .notice { padding: .6em; border: 1px solid #aaa; background: #f5f5f5; }
pre, .plain { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; } table { border-collapse: collapse; }
th, td { border: 1px solid #999; padding: .3em .7em; } .rules th { text-align: left; } .rules td { white-space: pre-wrap; }
.navigation { font-size: .95em; } li { margin: .2em 0; }\n`;

function bodyHtml(html: string | null, plain: string, prefix: string, ids: Set<number>, counts: {
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
      th: ["colspan", "rowspan", "scope"], ol: ["start"], li: ["value"], col: ["span"] },
    allowedSchemes: [], allowProtocolRelative: false, disallowedTagsMode: "discard",
  });
  const $ = load(safe, {}, false);
  counts.detachedReferences += original("a[href]").length - $("a[href]").length;
  if (compact($.root().text()) !== compact(original.root().text())) {
    throw new Error(`${prefix}: unsafe HTML would remove visible content; repair the accepted input`);
  }
  const anchors = new Map<string, string>();
  $("[id], a[name]").each((_, el) => {
    const id = $(el).attr("id") ?? $(el).attr("name")!;
    if (anchors.has(id)) throw new Error(`${prefix}: duplicate body anchor`);
    const scoped = `${prefix}-${id}`;
    anchors.set(id, scoped); $(el).attr("id", scoped).removeAttr("name");
  });
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    const match = /^(?:\/spells\/[^/]+\/[^/]+--|spell-)(\d+)(?:\/|\.html)$/.exec(href);
    let anchor: string | undefined;
    if (href.startsWith("#")) {
      try { anchor = anchors.get(decodeURIComponent(href.slice(1))); } catch { /* detached below */ }
    }
    if (anchor) $(el).attr("href", `#${encodeURIComponent(anchor)}`);
    else if (match && ids.has(Number(match[1]))) $(el).attr("href", pageName(Number(match[1])));
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
    $("[id]").each((_, el) => {
      const id = $(el).attr("id")!;
      if (found.has(id)) throw new Error(`${name}: duplicate anchor`);
      found.add(id);
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

export function exportOfflineHtml(options: ExportOptions) {
  if (!Number.isSafeInteger(options.book) || options.book <= 0 || !present(options.variant)) {
    throw new Error("A positive book ID and explicit variant are required");
  }
  const contentDb = path.resolve(repoRoot(), options.contentDb);
  const out = newOutput(path.resolve(repoRoot(), options.outDir), contentDb);
  const db = new Database(contentDb, { readonly: true, fileMustExist: true });
  try {
    return db.transaction(() => {
      const spells = db.prepare(`SELECT id, legacySpellId, canonicalName, sourceRulebookId, sourcePage,
        schoolRaw, subschoolRaw, componentsRaw, corruptLevel, castingTimeRaw, rangeRaw, targetRaw, effectRaw, areaRaw,
        durationRaw, savingThrowRaw, resistanceRaw, descriptionText, descriptionHtml
        FROM SpellContent WHERE sourceRulebookId=? ORDER BY legacySpellId`).all(options.book) as Spell[];
      if (!spells.length) throw new Error("Book has no scoped SpellContent targets");
      const ids = new Set<number>(), keys = new Set<string>();
      for (const s of spells) {
        if (!Number.isSafeInteger(s.legacySpellId) || s.legacySpellId <= 0 || !present(s.id)
          || ids.has(s.legacySpellId) || keys.has(s.id)) throw new Error("Missing/duplicate target identity");
        if (s.id !== `spell:${s.legacySpellId}`) throw new Error(`spell ${s.legacySpellId}: conflicting normalized ID`);
        if (!present(s.canonicalName) || !present(s.descriptionText)) throw new Error(`spell ${s.legacySpellId}: missing English name/body`);
        ids.add(s.legacySpellId); keys.add(s.id);
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
      const counts = { spells: spells.length, chineseNames: 0, chineseBodies: 0,
        englishNameFallbacks: 0, englishBodyFallbacks: 0, detachedReferences: 0, htmlTextDifferences: 0 };
      const pages = new Map<string, string>([["style.css", style]]);
      const indexRows: { id: number; en: string; zh: string; nameLang: string }[] = [];
      for (const s of spells) {
        const id = s.legacySpellId, t = translations.get(id);
        if (!t || !present(t.name) || !present(t.descriptionText)) throw new Error(`spell ${id}: missing name/body for zh/${options.variant}`);
        const nameLang = language(t.nameProvenanceJson, id, "name", options.variant);
        const bodyLang = language(t.bodyProvenanceJson, id, "body", options.variant);
        counts[nameLang === "zh" ? "chineseNames" : "englishNameFallbacks"]++;
        counts[bodyLang === "zh" ? "chineseBodies" : "englishBodyFallbacks"]++;
        indexRows.push({ id, en: s.canonicalName, zh: t.name, nameLang });
        const levels = db.prepare("SELECT listType, ownerName, level, rawExtra, variantLabel, note FROM SpellListEntry WHERE spellId=? ORDER BY listType, ownerName, level").all(s.id) as { listType: string; ownerName: string; level: number; rawExtra: string | null; variantLabel: string | null; note: string | null }[];
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
        const zh = bodyHtml(t.descriptionHtml, t.descriptionText, `zh-${id}`, ids, counts);
        const en = bodyHtml(s.descriptionHtml, s.descriptionText, `en-${id}`, ids, counts);
        pages.set(pageName(id), document(`${t.name} / ${s.canonicalName}`, `${navigation}<h1>${text(t.name)} / ${text(s.canonicalName)}</h1>
          <p>${text(book[0]!.name)}${s.sourcePage === null ? "" : ` · p. ${s.sourcePage}`} · ID ${id}</p>
          <p class="notice">内容预览 / Content preview. 文字按所选数据库保留；此导出不构成最终内容 QA 接受。</p>
          ${nameLang === "en" ? '<p class="notice">中文名称缺失：显示英文名称。 / English name fallback.</p>' : ""}
          <h2 id="rules">Current rules / 当前规则</h2><table class="rules">${rules}</table>
          <h2 id="zh">${bodyLang === "zh" ? "中文正文" : "中文正文缺失：英文回退 / English body fallback"}</h2><div lang="${bodyLang}">${zh}</div>
          <h2 id="en">English</h2><div lang="en">${en}</div>${navigation}`));
      }
      for (const lang of ["zh", "en"] as const) {
        const sorted = [...indexRows].sort((a, b) => a[lang].localeCompare(b[lang], lang === "zh" ? "zh-Hans-CN-u-co-pinyin" : "en") || a.id - b.id);
        let previous = "";
        const entries = sorted.map(row => {
          const group = lang === "en" ? row.en.charAt(0).toUpperCase() : "";
          const heading = group !== previous ? `<h2 id="letter-${text(group)}">${text(group)}</h2>` : "";
          previous = group;
          return `${heading}<p><a href="${pageName(row.id)}#${lang}">${text(row[lang])}</a> — ${text(row[lang === "zh" ? "en" : "zh"])}${row.nameLang === "en" ? " (英文名称回退 / English name fallback)" : ""}</p>`;
        }).join("\n");
        pages.set(lang === "zh" ? "index.html" : "index-en.html", document(`${book[0]!.name} — ${lang} index`, `${navigation}<h1>${lang === "zh" ? "中文索引（拼音排序）" : "English alphabetical index"}</h1><p>${spells.length} spells · ${counts.englishBodyFallbacks} English body fallbacks</p>${entries}`));
      }
      const links = validatePages(pages);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.mkdirSync(out);
      for (const [name, html] of pages) fs.writeFileSync(path.join(out, name), html, { encoding: "utf8", flag: "wx" });
      const report = { ...counts, files: pages.size + 1, links, book: options.book, variant: options.variant,
        contentCertification: false, htmlTextPolicy: "Complete sanitized HTML when present; otherwise exact plain text. Input representation differences counted, never repaired." };
      fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
      return report;
    })();
  } finally { db.close(); }
}
