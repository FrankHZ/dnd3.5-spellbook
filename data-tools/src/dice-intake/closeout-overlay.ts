import assert from "node:assert/strict";
import {load} from "cheerio";
import type Database from "better-sqlite3";
import type {DiceCloseout, CloseoutField, CloseoutTargetInput} from "./closeout-types";
import type {OverlayRow} from "./effective-writer";
import {acceptedOverlay, type AcceptedOverlayInput} from "./accepted-overlay";

// Bound to the independently accepted consolidation before this writer is released.
export const closeoutRevision = "d58c677ea541592c2fb8c19cfc046b4546764855";
const present = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const compact = (v: string) => v.replace(/\s/g, "");
function bodyText(html: string) {
  const $ = load(html);
  $("br").replaceWith("\n");
  $("p,div,li,tr,h1,h2,h3,h4,h5,h6,pre,blockquote").append("\n");
  $("td,th").append("\t");
  const text = $("body").text().trim();
  assert(present(text), "empty accepted body");
  assert.equal(compact(text), compact(load(html)("body").text()), "HTML materialization changed text");
  return text;
}

/** A field's accepted authority and a retained fallback never share a review label. */
function materializeField(target: CloseoutTargetInput, field: "name" | "body", accepted?: CloseoutField) {
  const chm = target.chinese.filter(r => r.lang === "zh" && r.variant === "chm");
  assert(chm.length <= 1, "ambiguous CHM predecessor");
  const old = chm[0];
  const base = {schemaVersion: 1, acceptedRevision: closeoutRevision, targetId: target.targetId, field,
    closeout: {issue: 586, revision: closeoutRevision}};
  if (accepted) {
    assert(present(accepted.after), "empty accepted field");
    assert.equal(accepted.before, old?.[accepted.field] ?? null, "accepted field predecessor differs");
    const independent = accepted.authority === "independent-db-english";
    const origin = {kind: independent ? "independent" : "native", sourceKey: independent ? null : accepted.provenance.sourceKey};
    assert(independent || present(origin.sourceKey), "accepted native field lacks source identity");
    const p = accepted.provenance;
    const provenance = {...base, language: "zh", origin,
      input: {revision: p.revision, path: p.path, row: p.row, targetId: target.targetId,
        field: accepted.field, sourceKey: p.sourceKey},
      evidence: {issue: p.issue, pr: p.pr, publicHead: p.publicHead, historicalRevision: p.historicalRevision,
        historicalContinuityAuthenticated: p.historicalContinuityAuthenticated, residuals: accepted.residuals},
      review: {kind: "DB-English", disposition: "DB-English-reviewed", acceptedRevision: closeoutRevision,
        authority: accepted.authority,
        ...(accepted.residuals.length ? {unresolved: {ownerIssues: [...new Set(accepted.residuals.map(r => r.ownerIssue))].sort((a,b) => a-b)}} : {}), ...(field === "body" ? {composition: accepted.language === "mixed" ? "mixed" : "Chinese"} : {})}};
    return {text: field === "name" ? accepted.after : bodyText(accepted.after),
      html: field === "body" ? accepted.after : null, provenance};
  }
  const oldText = old?.[field === "name" ? "name" : "descriptionText"];
  const retained = present(oldText);
  if (retained) assert(present(old!.sourceKey), "CHM fallback lacks source identity");
  const origin = retained ? {kind: "chm", sourceKey: old!.sourceKey as string} : {kind: "english", sourceKey: null};
  const text = retained ? oldText : field === "name" ? target.english.name : target.english.description;
  assert(present(text), "missing retained fallback text");
  const html = field === "name" ? null : retained ? old!.descriptionHtml as string | null : target.englishHtml;
  const provenance = {...base, language: retained ? "zh" : "en", origin,
    input: {targetId: target.targetId, field: `${retained ? "chinese" : "english"}.${field === "name" ? "name" : retained ? "descriptionText" : "description"}`},
    evidence: retained ? {table: "I18nSpellText", id: old!.id, spellId: target.targetId, lang: "zh", variant: "chm", sourceKey: origin.sourceKey}
      : {table: "dnd_spell", id: target.targetId, field: field === "name" ? "name" : "description"}};
  return {text, html, provenance};
}

/** Pure projection from independently authenticated field-level acceptance. */
export function closeoutOverlayInput(e: DiceCloseout): AcceptedOverlayInput {
  const fields = new Map<string, CloseoutField>();
  const targets = new Map(e.targets.map(t => [t.targetId, t]));
  assert.equal(targets.size, e.targets.length, "duplicate target input");
  for (const field of e.fields) {
    assert(["name", "descriptionHtml"].includes(field.field), "unsupported accepted field");
    const key = `${field.targetId}:${field.field}`;
    assert(!fields.has(key), "duplicate/conflicting accepted field");
    const target = targets.get(field.targetId);
    assert(target && target.english.rulebookId === field.rulebookId, "accepted field target/book mismatch");
    assert(field.rulebookId !== 86, "SC accepted input is forbidden");
    fields.set(key, field);
  }
  const ids = [...new Set(e.fields.map(f => f.targetId))].sort((a, b) => a - b);
  const rows: OverlayRow[] = ids.map(id => {
    const target = targets.get(id)!;
    const name = materializeField(target, "name", fields.get(`${id}:name`));
    const body = materializeField(target, "body", fields.get(`${id}:descriptionHtml`));
    const sourceKey = name.provenance.origin.kind === body.provenance.origin.kind &&
      name.provenance.origin.sourceKey === body.provenance.origin.sourceKey ? name.provenance.origin.sourceKey : null;
    return {spellId: id, rulebookId: target.english.rulebookId, name: name.text,
      descriptionText: body.text, descriptionHtml: body.html, sourceKey: sourceKey as string | null,
      nameProvenanceJson: JSON.stringify(name.provenance), bodyProvenanceJson: JSON.stringify(body.provenance), action: "insert"};
  });
  const note = {schema: "dice-db-english-closeout.v1", acceptedRevision: closeoutRevision,
    issue: 586, targets: ids, names: e.fields.filter(f => f.field === "name").length,
    bodies: e.fields.filter(f => f.field === "descriptionHtml").length,
    authority: "DB-English", protectedRulebookIds: [86], search: "rebuild-after-overlay", activation: false};
  return {rows, noteKey: "diceDbEnglishCloseout", note,
    verifyTargets(db: Database.Database) {
      for (const id of ids) {
        const t = targets.get(id)!;
        const spell = db.prepare("SELECT canonicalName,descriptionText,descriptionHtml FROM SpellContent WHERE legacySpellId=?").get(id) as Record<string, unknown>;
        assert.equal(spell.canonicalName, t.english.name, "normalized English name drift");
        assert.equal(spell.descriptionText, t.english.description, "normalized English body drift");
        assert.equal(spell.descriptionHtml, t.englishHtml, "normalized English HTML drift");
        const actualChm = db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND lang='zh' AND variant='chm' ORDER BY id").all(id);
        assert.deepEqual(actualChm, t.chinese.filter(r => r.lang === "zh" && r.variant === "chm").sort((a,b) => String(a.id).localeCompare(String(b.id))), "CHM predecessor changed");
      }
    }};
}

export function diceCloseoutOverlay(db: Database.Database, authenticate: () => DiceCloseout,
  mode: "check" | "apply" = "check", fault?: Parameters<typeof acceptedOverlay>[3]) {
  return acceptedOverlay(db, () => closeoutOverlayInput(authenticate()), mode, fault);
}
