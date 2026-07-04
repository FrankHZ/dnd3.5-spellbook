import type {
  SpellNameSearchResponse,
  I18nContext,
  SpellBatchResponse,
  SpellComponentFilters,
  SpellDetailView,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { mapSpellItem, mapSpellDetail } from "./spells.mapper";
import {
  fetchSpellsInOrder,
  queryIdsByName,
  querySpellDetail,
  querySpellsByIds,
  SELECT_SPELL_LIST,
  type SpellRow,
} from "./spells.repo.read";
import { listByClassAndDomainLevel } from "./spells.service.by-level";
import {
  queryI18nMap,
  queryIdsByI18nName,
  queryI18nDetail,
  queryI18nSummaryDetail,
  queryI18nSummaryMap,
} from "./spells.repo.content";
import { resolveSpellNames } from "./spells.service.resolve";

export const spellsService = {
  async searchByName(input: {
    q: string;
    rulebookIds: number[];
    classIds: number[];
    domainIds: number[];
    taxonomyFilters: SpellTaxonomyFilterIds;
    componentFilters: SpellComponentFilters;
    level: number | "all" | null;
    page: number;
    pageSize: number;
    i18n: I18nContext;
  }): Promise<SpellNameSearchResponse> {
    const doAppQuery = input.i18n.lang != "en";
    const hasScope =
      input.classIds.length > 0 ||
      input.domainIds.length > 0 ||
      hasTaxonomyScope(input.taxonomyFilters) ||
      hasComponentScope(input.componentFilters) ||
      input.level !== null;
    const maxCandidates = hasScope
      ? 2000
      : Math.min(2000, input.page * input.pageSize * 20);

    const idsEn = await queryIdsByName(
      input.q,
      input.rulebookIds,
      input.taxonomyFilters,
      input.componentFilters,
      maxCandidates,
    );
    const seen = new Set<number>();
    const merged: number[] = [];
    for (const id of idsEn)
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    if (doAppQuery) {
      const idsI18n = await queryIdsByI18nName(
        input.i18n.lang,
        input.q,
        input.rulebookIds,
        input.taxonomyFilters,
        input.componentFilters,
        maxCandidates,
      );
      for (const id of idsI18n)
        if (!seen.has(id)) {
          seen.add(id);
          merged.push(id);
        }
    }

    const spells = await fetchSpellsInOrder(merged, SELECT_SPELL_LIST);
    const scopedSpells = filterByBrowseScope(
      spells,
      input.classIds,
      input.domainIds,
      input.level,
    );
    scopedSpells.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);

    const total = scopedSpells.length; // capped

    const offset = (input.page - 1) * input.pageSize;
    const pagedSpells = scopedSpells.slice(offset, offset + input.pageSize);

    const pagedIds = pagedSpells.map((s) => s.id);
    const [i18nMap, summaryMap] = await Promise.all([
      queryI18nMap(pagedIds, input.i18n),
      queryI18nSummaryMap(pagedIds, input.i18n),
    ]);

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      q: input.q,
      rulebookIds: input.rulebookIds,
      ...input.taxonomyFilters,
      ...input.componentFilters,
      items: pagedSpells.map((s) =>
        mapSpellItem(
          s,
          i18nMap.get(s.id) ?? null,
          summaryMap.get(s.id) ?? null,
        ),
      ),
    };
  },
  listByClassAndDomainLevel,
  async getSpellDetail(input: {
    id: number;
    i18n: I18nContext;
  }): Promise<SpellDetailView | null> {
    const spellPromise = querySpellDetail(input.id);

    const spellI18nPromise =
      input.i18n.lang != "en"
        ? queryI18nDetail(input.id, input.i18n.lang, input.i18n.variant)
        : null;
    const spellSummaryPromise = queryI18nSummaryDetail(input.id, input.i18n);

    const [spell, spellI18n, spellSummary] = await Promise.all([
      spellPromise,
      spellI18nPromise,
      spellSummaryPromise,
    ]);
    if (!spell) {
      return null;
    }

    return mapSpellDetail(spell, spellI18n, spellSummary);
  },

  async batch(input: {
    ids: number[];
    i18n: I18nContext;
  }): Promise<SpellBatchResponse> {
    const inputIds = input.ids;

    // Dedupe for querying, but preserve original order for output
    const uniqueIds: number[] = [];
    const seen = new Set<number>();
    for (const id of inputIds) {
      if (!seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    const [rows, i18nMap, summaryMap] = await Promise.all([
      querySpellsByIds(uniqueIds),
      queryI18nMap(uniqueIds, input.i18n),
      queryI18nSummaryMap(uniqueIds, input.i18n),
    ]);

    const byId = new Map<number, (typeof rows)[number]>();
    for (const r of rows) byId.set(r.id, r);

    const items = inputIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((s) =>
        mapSpellItem(
          s,
          i18nMap.get(s.id) ?? null,
          summaryMap.get(s.id) ?? null,
        ),
      );

    const missingIds = inputIds.filter((id) => !byId.has(id));

    return {
      ids: inputIds,
      items,
      missingIds,
    };
  },
  resolveSpellNames,
};

function filterByBrowseScope(
  spells: SpellRow<typeof SELECT_SPELL_LIST>[],
  classIds: number[],
  domainIds: number[],
  level: number | "all" | null,
) {
  if (
    classIds.length === 0 &&
    domainIds.length === 0 &&
    level === null
  ) {
    return spells;
  }

  const classSet = new Set(classIds);
  const domainSet = new Set(domainIds);
  const hasListScope =
    classSet.size > 0 || domainSet.size > 0 || level !== null;
  const matchesLevel = (entry: { level: number }) =>
    level === null || level === "all" || entry.level === level;

  return spells.filter((spell) => {
    if (!hasListScope) {
      return true;
    }

    const classMatch = spell.spellClassIndexes.some(
      (entry) =>
        matchesLevel(entry) &&
        (classSet.size === 0 || classSet.has(entry.classId)),
    );
    const domainMatch = spell.spellDomainIndexes.some(
      (entry) =>
        matchesLevel(entry) &&
        (domainSet.size === 0 || domainSet.has(entry.domainId)),
    );

    if (classSet.size > 0 && domainSet.size > 0) {
      return classMatch || domainMatch;
    }
    if (classSet.size > 0) return classMatch;
    if (domainSet.size > 0) return domainMatch;
    return classMatch || domainMatch;
  });
}

export function hasTaxonomyScope(filters: SpellTaxonomyFilterIds) {
  return (
    filters.schoolIds.length > 0 ||
    filters.subschoolIds.length > 0 ||
    filters.descriptorIds.length > 0 ||
    filters.descriptorBuckets.length > 0
  );
}

export function hasComponentScope(filters: SpellComponentFilters) {
  return filters.componentKeys.length > 0;
}
