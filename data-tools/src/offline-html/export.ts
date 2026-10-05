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
import type { DomainPower, DomainPowers } from "./domain-powers";
import type { CompleteDomainList, CompleteDomainLists } from "./domain-lists";

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
type ListGroup = { name: string; slug: string; rows: ListEntry[]; sharedOwnerIds?: readonly number[] };

function selectDomainPowers(content: DomainPowers | undefined, book: number, domains: Map<number, ListGroup>) {
  const selected = new Map<number, DomainPower>();
  if (content === undefined) return selected;
  const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(present);
  if (!content || content.schemaVersion !== 1 || content.rulebookId !== 86 || book !== 86 || content.language !== "zh"
    || !Array.isArray(content.domains) || !content.sharedRules || typeof content.sharedRules !== "object" || Array.isArray(content.sharedRules)
    || Object.values(content.sharedRules).some(value => !strings(value) || !value.length)) throw new Error("Invalid SC domain-power content");
  const owners = new Map<number, DomainPower>();
  for (const power of content.domains) {
    if (!power || !Number.isSafeInteger(power.ownerLegacyId) || power.ownerLegacyId <= 0 || power.ownerLegacyId === 28
      || owners.has(power.ownerLegacyId) || !present(power.ownerName) || !present(power.grantedPowerText)
      || !strings(power.entryIds) || !power.entryIds.length || new Set(power.entryIds).size !== power.entryIds.length
      || !strings(power.readerNotes) || (power.requirementText !== null && !present(power.requirementText))
      || (power.sharedRulesKey !== null && (!present(power.sharedRulesKey) || !Object.hasOwn(content.sharedRules, power.sharedRulesKey)))) {
      throw new Error("Invalid/duplicate domain-power identity, text or shared rules");
    }
    owners.set(power.ownerLegacyId, power);
  }
  for (const [owner, group] of domains) {
    const power = owners.get(owner);
    if (!power || power.ownerName !== group.name || group.rows.some(row => row.rulebookId !== content.rulebookId || !power.entryIds.includes(row.id))) {
      throw new Error(`Missing/stale domain-power binding for owner ${owner}`);
    }
    selected.set(owner, power);
  }
  return selected;
}
type Summary = { spellId: number; rulebookId: number; lang: string; variant: string; summaryText: string; reviewStatus: string };
export type ClassSummaryReplacement = Summary & { previousSummaryText: string };
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
const directoryNavigation = (introduction: boolean) => `<p class="navigation">${introduction ? '<a href="introduction.html">引言</a> | ' : ""}<a href="index.html#classes">职业目录</a> | <a href="index.html#domains">领域目录</a> | <a href="index.html#letters">A–Z 正文</a></p>`;
const preview = '<p class="notice">中文内容预览，自然排版待视觉验收。</p>';
const membershipNotice = '<p class="notice">职业目录保留当前归属与附注；部分外部归属的原书核对仍待完成，目录不构成来源 QA 通过。</p>';
const domainNotice = '<p class="notice">本书收录的领域法术：仅列本书正文范围内的条目，并非原书完整领域法表。</p>';
const completeDomainNotice = '<p class="notice">† 表示 SC 收录的法术；其他法术可在线查看。</p>';
const style = `body { margin: 2em; color: #222; background: #fff; font-family: "Microsoft YaHei", "SimSun", serif; line-height: 1.65; }
#content { max-width: 62em; margin: 0; } h1 { font-size: 1.7em; } h2 { border-bottom: 1px solid #bbb; }
a { color: #164f91; } .notice { padding: .6em; border: 1px solid #aaa; background: #f5f5f5; }
.spell-entry { margin-bottom: 3em; } .spell-body p, .spell-body pre, .spell-body ul, .spell-body ol, .spell-body dl, .spell-body table, .spell-body blockquote { margin-top: 0; margin-bottom: 1.65em; }
.spell-entry > h2 { font-size: 1.17em; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .2em .8em; }
.spell-name, .spell-metadata { display: inline-block; max-width: 100%; word-wrap: break-word; overflow-wrap: anywhere; }
.spell-metadata { font-size: .72em; font-weight: normal; color: #555; }
.website-link { font-size: .85em; margin-left: .35em; text-decoration: none; }
.component-labels { font-size: .75em; }
.domain-online-label { font-size: .8em; } .domain-footnotes { font-size: .9em; }
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

function selectCompleteDomainLists(content: CompleteDomainLists | undefined, groups: Map<number, ListGroup>,
  spells: Map<number, Spell>, destinations: Map<number, string>) {
  const selected = new Map<number, CompleteDomainList>();
  if (content === undefined) return selected;
  if (!content || content.schemaVersion !== 1 || content.rulebookId !== 86 || content.language !== "zh"
    || content.reviewStatus !== "source-reviewed-proposal-awaiting-main-gate"
    || !Array.isArray(content.domains)) throw new Error("Invalid SC complete domain-list content");
  const owners = new Map<number, CompleteDomainList>();
  for (const domain of content.domains) {
    if (!domain || !Number.isSafeInteger(domain.ownerLegacyId) || domain.ownerLegacyId <= 0
      || domain.ownerLegacyId === 28 || owners.has(domain.ownerLegacyId)) throw new Error("Invalid/duplicate complete domain-list owner");
    owners.set(domain.ownerLegacyId, domain);
  }
  const sourceKeys = new Set<string>();
  for (const [owner, group] of groups) {
    const domain = owners.get(owner);
    if (!domain || domain.ownerName !== group.name || !present(domain.nameZh)
      || typeof domain.planar !== "boolean" || domain.levelChoiceCount !== 1
      || !Array.isArray(domain.occurrences) || !Array.isArray(domain.footnotes)) throw new Error(`Missing/stale complete domain-list owner ${owner}`);
    const symbols = new Set<string>();
    for (const note of domain.footnotes) {
      if (!note || !present(note.symbol) || symbols.has(note.symbol) || !present(note.text)) throw new Error("Invalid domain footnote");
      symbols.add(note.symbol);
    }
    const covered = new Set<string>();
    for (const row of domain.occurrences) {
      if (!row || !present(row.sourceKey) || sourceKeys.has(row.sourceKey)
        || !Number.isInteger(row.level) || row.level < 1 || row.level > 9
        || row.choiceGroup !== (domain.planar ? `domain:${owner}:level:${row.level}` : null)
        || ![null, "alignment"].includes(row.alternativePolicy) || !Array.isArray(row.bindings)
        || row.bindings.length !== (row.alternativePolicy === "alignment" ? 2 : 1) || !present(row.summaryText)
        || !(row.printedMarkers === null || /^(?:M?F?X?)$/.test(row.printedMarkers))
        || row.markerStatus !== (row.printedMarkers === null ? "unknown" : "printed")
        || !Array.isArray(row.footnoteSymbols) || row.footnoteSymbols.some(symbol => !symbols.has(symbol))
        || !Array.isArray(row.readerNotes) || row.readerNotes.some(note => !present(note))) throw new Error("Invalid complete domain-list occurrence");
      sourceKeys.add(row.sourceKey);
      const bindingIds = new Set<number>();
      for (const binding of row.bindings) {
        const id = binding.spellLegacyId, local = binding.sourceRulebookId === 86;
        if (!Number.isSafeInteger(id) || id <= 0 || binding.spellId !== `spell:${id}` || bindingIds.has(id)
          || !Number.isSafeInteger(binding.sourceRulebookId) || binding.sourceRulebookId <= 0
          || !present(binding.canonicalName) || !present(binding.nameZh) || !present(binding.summaryText)
          || binding.daggerDisplay !== local || !Array.isArray(binding.relationshipEntryIds)
          || binding.relationshipEntryIds.some(entry => !present(entry))
          || !binding.link || binding.link.kind !== (local ? "local" : "online")
          || binding.link.href !== (local ? destinations.get(id) : websiteRoot + id)
          || (local && (!spells.has(id) || spells.get(id)!.canonicalName !== binding.canonicalName))) {
          throw new Error("Invalid/stale complete domain-list spell binding or link");
        }
        bindingIds.add(id);
        for (const entry of binding.relationshipEntryIds) {
          const current = group.rows.find(item => item.id === entry);
          if (current && (current.level !== row.level || current.spellId !== binding.spellId)) throw new Error("Stale complete domain-list relationship");
          if (current) covered.add(entry);
        }
      }
    }
    if (group.rows.some(row => !covered.has(row.id))) throw new Error("Missing complete domain-list relationship");
    for (let level = 1; level <= 9; level++) {
      if (domain.occurrences.filter(row => row.level === level).length !== (domain.planar ? 2 : 1)) throw new Error("Incomplete domain-list level");
    }
    selected.set(owner, domain);
  }
  return selected;
}

function renderCompleteDomainList(domain: CompleteDomainList) {
  const filename = `domain-${domain.ownerLegacyId}.html`;
  const noteId = (index: number) => `domain-${domain.ownerLegacyId}-footnote-${index + 1}`;
  const levels = Array.from({ length: 9 }, (_, index) => {
    const level = index + 1;
    const rows = domain.occurrences.filter(row => row.level === level).map(row => {
      const names = row.bindings.map(binding => {
        const local = binding.sourceRulebookId === 86;
        const label = `${text(binding.nameZh)}（${text(binding.canonicalName)}）`;
        const link = `<a class="${local ? "domain-local-link" : "domain-online-link"}"${local ? "" : ` data-spell-id="${binding.spellLegacyId}" title="在线查看"`} href="${text(binding.link.href)}">${label}</a>`;
        return `<span class="domain-binding">${link}${local ? '<sup class="domain-dagger" title="SC 收录">†</sup>' : ' <span class="domain-online-label">（在线查看）</span>'}${row.bindings.length > 1 ? `：<span class="summary" lang="zh">${text(binding.summaryText)}</span>` : ""}</span>`;
      }).join('；或 ');
      const marks = row.printedMarkers ? `<sup class="component-labels" title="原书法表标记：M 昂贵材料；F 成分包外器材；X 施法者支付经验值">${text(row.printedMarkers)}</sup>` : "";
      const stars = row.footnoteSymbols.map(symbol => `<sup class="domain-footnote-symbol"><a href="${filename}#${noteId(domain.footnotes.findIndex(note => note.symbol === symbol))}">${text(symbol)}</a></sup>`).join("");
      return `<li class="domain-occurrence">${names}${stars}${marks}${row.bindings.length === 1 ? `：<span class="summary" lang="zh">${text(row.summaryText)}</span>` : ""}${row.readerNotes.map(note => `<span class="membership-note">${text(note)}</span>`).join("")}</li>`;
    });
    return `<h2 id="level-${level}">${level} 环</h2>${domain.planar ? '<p class="domain-choice">每环选择下列两个法术之一。</p>' : ""}<ul class="spell-list">${rows.join("\n")}</ul>`;
  }).join("\n");
  const footnotes = domain.footnotes.length ? `<div class="domain-footnotes" lang="zh"><h3>法表附注</h3>${domain.footnotes.map((note, index) => `<p id="${noteId(index)}">${text(note.symbol)} ${text(note.text)}</p>`).join("\n")}</div>` : "";
  return `<section class="domain-complete">${levels}${footnotes}</section>`;
}

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
        const onlineId = $(el).attr("data-spell-id");
        if (/^domain-[1-9]\d*\.html$/.test(name) && el.tagName === "a"
          && $(el).attr("class") === "domain-online-link" && /^[1-9]\d*$/.test(onlineId ?? "")
          && Number.isSafeInteger(Number(onlineId)) && href === websiteRoot + onlineId
          && $(el).closest(".domain-complete .domain-binding").length
          && $(el).attr("title") === "在线查看") return;
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

/** Reader/presentation/machine inputs are caller-authenticated by main-gate; rendering does not grant source acceptance. */
export function exportOfflineHtml(options: ExportOptions,
  presentations: ReadonlyMap<number, PdfTypographyPresentation> = new Map(), sourceDb?: Database.Database,
  machine: readonly MachineMarker[] = [], introduction?: string, domainPowerContent?: DomainPowers,
  domainListContent?: CompleteDomainLists, classSummaryReplacements: readonly ClassSummaryReplacement[] = []) {
  if (!Number.isSafeInteger(options.book) || options.book <= 0 || !present(options.variant)) {
    throw new Error("A positive book ID and explicit variant are required");
  }
  if (introduction !== undefined && (options.book !== 86 || !present(introduction))) {
    throw new Error("Introduction requires a nonempty accepted SC fragment");
  }
  if (domainPowerContent !== undefined && options.book !== 86) throw new Error("Invalid SC domain-power content");
  if (domainListContent !== undefined && options.book !== 86) throw new Error("Invalid SC complete domain-list content");
  const navigation = directoryNavigation(introduction !== undefined);
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
      const excludedMemberships: { issue: number; listEntryId: string; listType: string; ownerLegacyId: number; spellId: number; level: number; reason: string }[] = [];
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
          // This additional feat grant is outside the original SC appendix scope.
          // Preserve its source relationship and spell body, but emit no directory.
          if (options.book === 86 && row.ownerLegacyId === 28) {
            if (row.spellId !== "spell:3921" || row.level !== 1) throw new Error("Unrecognized pending feat membership");
            excludedMemberships.push({ issue: 354, listEntryId: row.id, listType: kind, ownerLegacyId: row.ownerLegacyId,
              spellId: 3921, level: row.level, reason: "outside-original-book-directory" });
            continue;
          }
        }
        const groups = kind === "class" ? classes : domains;
        const group = groups.get(row.ownerLegacyId);
        if (group && (group.name !== row.ownerName || group.slug !== row.ownerSlug)) throw new Error(`Conflicting ${kind} owner identity`);
        if (group) group.rows.push(row);
        else groups.set(row.ownerLegacyId, { name: row.ownerName, slug: row.ownerSlug, rows: [row] });
        (kind === "class" ? classTargets : domainTargets).add(Number(row.spellId.slice("spell:".length)));
      }
      // Reuse the existing entity-name overlay contract; no summary/body fallback invents names.
      const classNames = new Map<number, string>(), domainNames = new Map<number, string>();
      for (const [table, key, groups, names] of [
        ["I18nCharacterClassText", "classId", classes, classNames],
        ["I18nDomainText", "domainId", domains, domainNames],
      ] as const) {
        for (const row of db.prepare(`SELECT ${key} AS ownerId, name FROM ${table} WHERE lang='zh' AND variant='default'`).all() as { ownerId: number; name: string | null }[]) {
          if (!groups.has(row.ownerId) || !present(row.name)) continue;
          if (names.has(row.ownerId)) throw new Error(`Duplicate Chinese ${key} name`);
          names.set(row.ownerId, row.name);
        }
      }
      const schoolNames = new Map<string, string>();
      for (const row of db.prepare(`SELECT DISTINCT f.name, t.name AS zh FROM SpellTaxonomyFacet f
        JOIN I18nSpellSchoolText t ON t.schoolId=f.legacyFacetId
        JOIN SpellContent s ON s.id=f.spellId
        WHERE s.sourceRulebookId=? AND f.facetType='school' AND f.reviewStatus='accepted'
          AND t.lang='zh' AND t.variant='default'`).all(options.book) as { name: string; zh: string | null }[]) {
        if (!present(row.zh)) continue;
        if (schoolNames.has(row.name) && schoolNames.get(row.name) !== row.zh) throw new Error("Conflicting Chinese school name");
        schoolNames.set(row.name, row.zh);
      }
      const summaryRows = db.prepare(`SELECT spellId, rulebookId, lang, variant, summaryText, reviewStatus
        FROM I18nSpellSummaryText WHERE spellId IN
        (SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=?)`).all(options.book) as Summary[];
      const summaries = selectSummaries(summaryRows, domainListContent === undefined
        ? new Set([...classTargets, ...domainTargets]) : classTargets, options.book, options.variant, classTargets);
      // Validate the real DB summary baseline first; only class display consumes replacements.
      const classSummaryOverrides = new Map<number, string>();
      if (!Array.isArray(classSummaryReplacements)) throw new Error("Invalid class summary replacements");
      for (const row of classSummaryReplacements) {
        if (!row || options.book !== 86 || options.variant !== "effective"
          || !Number.isSafeInteger(row.spellId) || row.spellId <= 0 || !classTargets.has(row.spellId)
          || row.rulebookId !== options.book || row.lang !== "zh" || row.variant !== "chm"
          || row.reviewStatus !== "accepted" || !present(row.summaryText) || !present(row.previousSummaryText)
          || classSummaryOverrides.has(row.spellId) || summaries.get(row.spellId)!.zh !== row.previousSummaryText) {
          throw new Error("Invalid, duplicate or stale class summary replacement");
        }
        classSummaryOverrides.set(row.spellId, row.summaryText);
      }
      const byId = new Map(spells.map(spell => [spell.legacySpellId, spell]));
      const powers = selectDomainPowers(domainPowerContent, options.book, domains);
      const completeLists = selectCompleteDomainLists(domainListContent, domains, byId, destinations);
      const domainDirectoryNotice = domainListContent === undefined ? domainNotice : completeDomainNotice;
      const printedRecords = readPrintedMarkerRecords(db, options.book);
      const markerCounts = { acceptedRows: 0, machineRows: 0, unknownRows: 0, markedRows: 0, explicitEmptyRows: 0 };
      const counts = { spells: spells.length, chineseNames: 0, chineseBodies: 0,
        englishNameFallbacks: 0, englishBodyFallbacks: 0, detachedReferences: 0, htmlTextDifferences: 0 };
      const pages = new Map<string, string>([["style.css", style]]);
      const introductionCounts = { included: introduction !== undefined, sections: 0, paragraphs: 0, listItems: 0 };
      if (introduction !== undefined) {
        const source = load(introduction, {}, false);
        const safe = sanitizeHtml(introduction, { allowedTags: ["h2", "h3", "p", "ul", "li", "strong", "i"], allowedAttributes: {} });
        const fragment = load(safe, {}, false);
        // Accepted reader fragments carry no assets, links, attributes or metadata.
        // Reject changed structure rather than quietly stripping visible content.
        if (source.root().html() !== fragment.root().html()) throw new Error("Introduction contains unsupported markup");
        introductionCounts.sections = fragment("h2,h3").length;
        introductionCounts.paragraphs = fragment("p").length;
        introductionCounts.listItems = fragment("li").length;
        pages.set("introduction.html", document(`${book[0]!.name} — 引言`, `${navigation}${preview}<div id="introduction" lang="zh">${safe}</div>${navigation}`));
      }
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
        letterEntries.get(s.canonicalName.charAt(0).toUpperCase())!.push(`<div class="spell-entry" id="${spellAnchor(id)}"><h2><span class="spell-name">${text(t.name)} / ${text(s.canonicalName)}</span> <span class="spell-metadata">${s.sourcePage === null ? "" : `p. ${s.sourcePage} · `}ID ${id}<a class="website-link" href="${websiteRoot}${id}" title="在网站查看" aria-label="在网站查看">↗</a></span></h2>
          ${nameLang === "en" ? '<p class="notice">中文名称缺失：显示英文名称。</p>' : ""}
          <div class="spell-body" id="${spellAnchor(id)}-zh" lang="zh">${zh}</div></div>`);
      }
      for (const letter of letters) {
        const entries = letterEntries.get(letter)!;
        pages.set(`${letter}.html`, document(`${book[0]!.name} — ${letter}`, `${navigation}<h1>${letter}</h1>${preview}
          ${entries.length ? entries.join("\n") : '<p class="empty">此字母无法术。</p>'}`));
      }
      const classMenu: string[] = [], domainMenu: string[] = [];
      const classPages = new Map(classes);
      if (options.book === 86 && classes.get(1)?.slug === "wizard" && classes.get(4)?.slug === "sorcerer") {
        classPages.set(1, { name: "Sorcerer/Wizard", slug: "sorcerer-wizard", sharedOwnerIds: [4, 1],
          rows: [...classes.get(4)!.rows, ...classes.get(1)!.rows] });
        classPages.delete(4);
      }
      let classMemberships = 0, domainMemberships = 0;
      const schoolGroupedClassPages: number[] = [], schoolNameFallbacks = new Set<string>();
      for (const [kind, groups] of [["class", classPages], ["domain", domains]] as const) {
        for (const [owner, group] of [...groups].sort(([, a], [, b]) => a.name.localeCompare(b.name, "en"))) {
          const filename = group.sharedOwnerIds ? "class-1-4.html" : `${kind}-${owner}.html`;
          const names = kind === "class" ? classNames : domainNames;
          const name = group.sharedOwnerIds
            ? `${group.sharedOwnerIds.map(id => names.get(id) ?? classes.get(id)!.name).join("／")}（${group.name}）`
            : names.has(owner) ? `${names.get(owner)}（${group.name}）` : group.name;
          (kind === "class" ? classMenu : domainMenu).push(`<li><a href="${filename}">${text(name)}</a></li>`);
          // The SC appendix groups only the Sorcerer/Wizard list by school inside each level.
          const bySchool = options.book === 86 && kind === "class" && ["wizard", "sorcerer", "sorcerer-wizard"].includes(group.slug);
          if (bySchool) schoolGroupedClassPages.push(owner);
          const firstLevel = kind === "domain" ? 1 : 0;
          const completeList = kind === "domain" ? completeLists.get(owner) : undefined;
          if (completeList) domainMemberships += completeList.occurrences.length;
          const sections = completeList ? renderCompleteDomainList(completeList) : Array.from({ length: 10 - firstLevel }, (_, index) => {
            const level = index + firstLevel;
            const members = new Map<number, ListEntry[]>();
            for (const row of group.rows.filter(row => row.level === level)) {
              const id = Number(row.spellId.slice("spell:".length));
              members.set(id, [...(members.get(id) ?? []), row]);
            }
            const sortedMembers = [...members].sort(([a], [b]) => byId.get(a)!.canonicalName.localeCompare(byId.get(b)!.canonicalName, "en") || a - b);
            const renderRow = ([id, memberships]: [number, ListEntry[]]) => {
                if (kind === "class") classMemberships++; else domainMemberships++;
                const spell = byId.get(id)!, translation = translations.get(id)!, summary = summaries.get(id)!;
                const currentMachine = machine.filter(row => row.record.rulebookId === options.book
                  && memberships.some(entry => entry.id === row.record.listEntryId));
                if (currentMachine.some(row => row.spell.id !== spell.id || row.spell.canonicalName !== spell.canonicalName
                  || row.spell.sourceRulebookId !== spell.sourceRulebookId
                  || row.ownerName !== memberships.find(entry => entry.id === row.record.listEntryId)!.ownerName)) {
                  throw new Error("Stale machine marker spell/owner name or edition");
                }
                // Keep each owner's source binding intact before combining a shared display row.
                const selections = [...new Set(memberships.map(entry => entry.ownerLegacyId))].map(ownerId =>
                  selectProcessedMembershipMarkers(memberships.filter(entry => entry.ownerLegacyId === ownerId).map(listIdentity),
                    options.book, printedRecords, currentMachine));
                const known = selections.filter(selection => selection.status !== "unknown");
                if (new Set(known.map(selection => selection.markers)).size > 1) throw new Error("Conflicting shared class markers");
                const marker = selections.find(selection => selection.status === "unknown")
                  ?? known.find(selection => selection.status === "machine") ?? known[0]!;
                markerCounts[marker.status === "accepted" ? "acceptedRows" : marker.status === "machine" ? "machineRows" : "unknownRows"]++;
                const labels = marker.status === "unknown" ? null : marker.markers;
                if (labels === "") markerCounts.explicitEmptyRows++;
                else if (labels) markerCounts.markedRows++;
                const markerTitle = `原书法表标记${marker.status === "machine" ? "（自动匹配）" : ""}：M 昂贵材料；F 成分包外器材；X 施法者支付经验值`;
                const qualifiers = [...new Set(memberships.map(row => [row.rawExtra, row.variantLabel, row.note].filter(present).join(" — ")).filter(present))];
                if (group.sharedOwnerIds && group.sharedOwnerIds.some(id => !memberships.some(row => row.ownerLegacyId === id))) {
                  qualifiers.unshift([...new Set(memberships.map(row => names.get(row.ownerLegacyId) ?? row.ownerName))].join("／"));
                }
                const chineseSummary = kind === "class" ? classSummaryOverrides.get(id) ?? summary.zh : summary.zh;
                return `<li><a href="${destinations.get(id)}">${text(translation.name!)}（${text(spell.canonicalName)}）</a>${labels ? `<sup class="component-labels" title="${markerTitle}">${text(labels)}</sup>` : ""}：<span lang="zh" class="summary">${text(chineseSummary)}</span>
                  ${qualifiers.map(value => `<span class="membership-note">${text(value)}</span>`).join("")}</li>`;
              };
            let rows: string;
            if (bySchool) {
              const schools = new Map<string, typeof sortedMembers>();
              for (const member of sortedMembers) {
                const school = byId.get(member[0])!.schoolRaw?.trim() ?? "";
                schools.set(school, [...(schools.get(school) ?? []), member]);
              }
              rows = [...schools].sort(([a], [b]) => a.localeCompare(b, "en")).map(([school, entries]) => {
                const label = school ? school.split("/").map(part => {
                  const name = part.trim(), zh = schoolNames.get(name);
                  if (!zh) schoolNameFallbacks.add(name);
                  return zh ?? name;
                }).join("／") : "学派未标注";
                return `<h3 class="school-heading">${text(label)}</h3><ul class="spell-list">${entries.map(renderRow).join("\n")}</ul>`;
              }).join("\n");
            } else rows = sortedMembers.length ? `<ul class="spell-list">${sortedMembers.map(renderRow).join("\n")}</ul>` : "";
            return `<h2 id="level-${level}">${level} 环</h2>${rows || `<p class="empty">${kind === "class" ? "此环无法术。" : "本书收录范围内，此环暂无条目。"}</p>`}`;
          }).join("\n");
          const missingName = (group.sharedOwnerIds ? group.sharedOwnerIds.some(id => !names.has(id)) : !names.has(owner))
            ? `<p class="notice">${kind === "class" ? "职业" : "领域"}中文名称缺失：显示现有英文名称。</p>` : "";
          const power = kind === "domain" ? powers.get(owner) : undefined;
          const powerHtml = power ? `<section class="domain-power" lang="zh"><h2>领域能力</h2>
            ${power.requirementText === null ? "" : `<p class="domain-requirement">${text(power.requirementText)}</p>`}
            <p class="granted-power">${text(power.grantedPowerText)}</p>
            ${power.readerNotes.length ? `<div class="reader-note"><h3>原文疑义备注（本项目说明，非官方勘误）</h3>${power.readerNotes.map(note => `<p>${text(note)}</p>`).join("\n")}</div>` : ""}
            ${power.sharedRulesKey === null ? "" : `<div class="shared-domain-rules"><h3>位面领域共同规则</h3>${domainPowerContent!.sharedRules[power.sharedRulesKey]!.map(rule => `<p>${text(rule)}</p>`).join("\n")}</div>`}
            </section>` : "";
          pages.set(filename, document(`${book[0]!.name} — ${name}`, `${navigation}<h1>${text(name)}</h1>${kind === "class" ? membershipNotice : domainDirectoryNotice}${missingName}${powerHtml}${sections}${navigation}`));
        }
      }
      pages.set("index.html", document(book[0]!.name, `<h1>${text(book[0]!.name)}</h1>${preview}
        ${introduction !== undefined ? '<p><a href="introduction.html">引言</a></p>' : ""}
        <h2 id="classes">职业目录</h2>${membershipNotice}${classMenu.length ? `<ul>${classMenu.join("\n")}</ul>` : '<p class="empty">无职业归属。</p>'}
        <h2 id="domains">领域目录</h2>${domainDirectoryNotice}${domainMenu.length ? `<ul>${domainMenu.join("\n")}</ul>` : '<p class="empty">本书收录范围内，无常规领域条目。</p>'}
        <h2 id="letters">A–Z 正文</h2><p>${letters.map(letter => `<a href="${letter}.html">${letter}</a>`).join(" | ")}</p>`));
      const links = validatePages(pages);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.mkdirSync(out);
      for (const [name, html] of pages) fs.writeFileSync(path.join(out, name), html, { encoding: "utf8", flag: "wx" });
      const report = { ...counts, files: pages.size + 1, links, book: options.book, variant: options.variant,
        layout: "classes-domains-then-az", letterPages: letters.length, classPages: classPages.size, classMemberships,
        sharedClassPages: [...classPages.values()].flatMap(group => group.sharedOwnerIds ? [{ filename: "class-1-4.html", ownerIds: group.sharedOwnerIds }] : []),
        classListEntries: listEntries.filter(row => row.listType === "class").length, classTargets: classTargets.size, classlessTargets: spells.filter(s => !classTargets.has(s.legacySpellId)).map(s => s.legacySpellId),
        classNameFallbacks: [...classes.keys()].filter(id => !classNames.has(id)),
        schoolGroupedClassPages, schoolNameFallbacks: [...schoolNameFallbacks].sort(),
        domainPages: domains.size, ordinaryDomainPages: domains.size, specialMembershipPages: 0,
        sourceDomainListEntries: listEntries.filter(row => row.listType === "domain").length,
        domainListEntries: [...domains.values()].reduce((sum, group) => sum + group.rows.length, 0), domainMemberships, domainTargets: domainTargets.size,
        domainOnlyTargets: [...domainTargets].filter(id => !classTargets.has(id)).sort((a, b) => a - b),
        domainNameFallbacks: [...domains.keys()].filter(id => !domainNames.has(id)),
        domainEntriesNeedingStructuralReview: [...domains.values()].flatMap(group => group.rows).filter(row => row.reviewStatus === "review").length,
        excludedMemberships,
        pendingMembershipIssues: excludedMemberships.map(({ issue, listType, ownerLegacyId, spellId, level }) => ({ issue, listType, ownerLegacyId, spellId, level })),
        printedMarkers: { rulebookId: options.book, ...markerCounts },
        completeDomainLists: { included: domainListContent !== undefined, pages: completeLists.size,
          occurrences: [...completeLists.values()].reduce((sum, domain) => sum + domain.occurrences.length, 0),
          bindings: [...completeLists.values()].flatMap(domain => domain.occurrences).reduce((sum, row) => sum + row.bindings.length, 0),
          onlineBindings: [...completeLists.values()].flatMap(domain => domain.occurrences).flatMap(row => row.bindings).filter(binding => binding.sourceRulebookId !== 86).length,
          daggerBindings: [...completeLists.values()].flatMap(domain => domain.occurrences).flatMap(row => row.bindings).filter(binding => binding.sourceRulebookId === 86).length,
          markedRows: [...completeLists.values()].flatMap(domain => domain.occurrences).filter(row => !!row.printedMarkers).length,
          explicitEmptyRows: [...completeLists.values()].flatMap(domain => domain.occurrences).filter(row => row.printedMarkers === "").length,
          unknownMarkers: [...completeLists.values()].flatMap(domain => domain.occurrences).filter(row => row.printedMarkers === null).length },
        introduction: introductionCounts,
        domainPowers: { included: domainPowerContent !== undefined, pages: powers.size,
          requirementPages: [...powers.values()].filter(power => power.requirementText !== null).length,
          sharedRulePages: [...powers.values()].filter(power => power.sharedRulesKey !== null).length,
          readerNotes: [...powers.values()].reduce((sum, power) => sum + power.readerNotes.length, 0) },
        classEntriesNeedingStructuralReview: listEntries.filter(row => row.listType === "class" && row.reviewStatus === "review").length,
        selectedSummaries: summaries.size + classTargets.size, selectedChineseSummaries: summaries.size,
        selectedEnglishSummaries: classTargets.size, domainChineseSummaries: domainListContent === undefined ? domainTargets.size : 0,
        summaryVariants: { en: selectedSummaryVariant("en", options.variant), zh: selectedSummaryVariant("zh", options.variant) },
        classSummaryReplacementIds: [...classSummaryOverrides.keys()].sort((a, b) => a - b),
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
