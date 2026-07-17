import type Database from "better-sqlite3";

export const CONTENT_SEARCH_SCHEMA_VERSION = 1;

export type ContentSearchSpellRow = {
  spellId: number;
  canonicalName: string;
  slug: string;
  descriptionText: string;
  castingTimeRaw: string | null;
  rangeRaw: string | null;
  targetRaw: string | null;
  effectRaw: string | null;
  areaRaw: string | null;
  durationRaw: string | null;
  savingThrowRaw: string | null;
  resistanceRaw: string | null;
};

export type ContentSearchTextRow = {
  spellId: number;
  lang: string;
  variant: string;
  name: string | null;
  descriptionText: string | null;
};

export type ContentSearchSummaryRow = {
  spellId: number;
  lang: string;
  variant: string;
  summaryText: string;
};

export type ContentSearchMechanicRow = {
  spellId: number;
  rawText: string | null;
  category: string;
  normalizedText: string | null;
};

export type ContentSearchDocument = {
  spellId: number;
  lang: string;
  variant: string;
  name: string;
  aliases: string;
  summary: string;
  mechanics: string;
  body: string;
};

export type ContentSearchSource = {
  spells: ContentSearchSpellRow[];
  texts: ContentSearchTextRow[];
  summaries: ContentSearchSummaryRow[];
  mechanics: ContentSearchMechanicRow[];
};

export function buildContentSearchDocuments(
  source: ContentSearchSource,
): ContentSearchDocument[] {
  const textsBySpell = groupBy(source.texts, (row) => row.spellId);
  const summariesBySpell = groupBy(source.summaries, (row) => row.spellId);
  const mechanicsBySpell = groupBy(source.mechanics, (row) => row.spellId);
  const documents: ContentSearchDocument[] = [];

  for (const spell of source.spells) {
    const texts = textsBySpell.get(spell.spellId) ?? [];
    const summaries = summariesBySpell.get(spell.spellId) ?? [];
    const mechanics = mechanicsBySpell.get(spell.spellId) ?? [];
    const localizedNames = texts.map((row) => row.name).filter(isText);
    const aliases = uniqueText([
      spell.slug.replaceAll("-", " "),
      ...localizedNames,
    ]);
    const mechanicText = uniqueText([
      spell.castingTimeRaw,
      spell.rangeRaw,
      spell.targetRaw,
      spell.effectRaw,
      spell.areaRaw,
      spell.durationRaw,
      spell.savingThrowRaw,
      spell.resistanceRaw,
      ...mechanics.flatMap((row) => [
        row.normalizedText,
        row.rawText,
        row.category,
      ]),
    ]).join("\n");

    const drafts = new Map<
      string,
      Pick<ContentSearchDocument, "lang" | "variant" | "name" | "body">
    >();
    drafts.set("en:default", {
      lang: "en",
      variant: "default",
      name: spell.canonicalName,
      body: spell.descriptionText,
    });

    for (const text of texts) {
      const key = `${text.lang}:${text.variant}`;
      const existing = drafts.get(key);
      drafts.set(key, {
        lang: text.lang,
        variant: text.variant,
        name: text.name ?? existing?.name ?? spell.canonicalName,
        body: text.descriptionText ?? existing?.body ?? "",
      });
    }

    for (const summary of summaries) {
      const key = `${summary.lang}:${summary.variant}`;
      if (!drafts.has(key)) {
        drafts.set(key, {
          lang: summary.lang,
          variant: summary.variant,
          name: spell.canonicalName,
          body: "",
        });
      }
    }

    for (const draft of drafts.values()) {
      const summaryText = summaries
        .filter((row) => row.lang === draft.lang)
        .sort((left, right) => {
          const leftExact = left.variant === draft.variant ? 0 : 1;
          const rightExact = right.variant === draft.variant ? 0 : 1;
          return leftExact - rightExact || left.variant.localeCompare(right.variant);
        })
        .map((row) => row.summaryText);
      documents.push({
        spellId: spell.spellId,
        lang: draft.lang,
        variant: draft.variant,
        name: draft.name,
        aliases: uniqueText([
          spell.canonicalName,
          ...aliases,
        ]).filter((value) => value !== draft.name).join("\n"),
        summary: uniqueText(summaryText).join("\n"),
        mechanics: mechanicText,
        body: draft.body,
      });
    }
  }

  return documents.sort(
    (left, right) =>
      left.spellId - right.spellId ||
      left.lang.localeCompare(right.lang) ||
      left.variant.localeCompare(right.variant),
  );
}

export function replaceContentSearchIndex(
  db: Database.Database,
  documents: ContentSearchDocument[],
) {
  const insert = db.prepare(`
    INSERT INTO "SpellSearchDocument" (
      "spellId", "lang", "variant", "name", "aliases", "summary",
      "mechanics", "body"
    ) VALUES (
      @spellId, @lang, @variant, @name, @aliases, @summary, @mechanics, @body
    )
  `);
  const replace = db.transaction(() => {
    db.prepare('DELETE FROM "SpellSearchDocument"').run();
    for (const document of documents) insert.run(document);
    db.prepare('DELETE FROM "SpellSearchIndexState" WHERE "id" = 1').run();
    db.prepare(`
      INSERT INTO "SpellSearchIndexState" (
        "id", "schemaVersion", "rebuiltAt", "documentCount"
      ) VALUES (1, ?, CURRENT_TIMESTAMP, ?)
    `).run(CONTENT_SEARCH_SCHEMA_VERSION, documents.length);
  });
  replace();
}

function groupBy<T, K>(rows: T[], keyOf: (row: T) => K) {
  const grouped = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

function isText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!isText(value)) continue;
    const normalized = value.trim();
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}
