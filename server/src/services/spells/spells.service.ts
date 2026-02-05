import type {
  SpellBatchResponse,
  SpellByClassLevelResponse,
  SpellNameSearchResponse,
  I18nContext,
  SpellDetailView,
  SpellItemView,
} from "@dnd/contracts";
import { Prisma as AppPrisma } from "DB_APP/client";
import { mapSpellItem, mapSpellDetail } from "./spells.mapper";
import {
  fetchSpellsInOrder,
  queryByClassAndDomainLevels as queryByClassAndDomainLevel,
  queryIdsByI18nName,
  queryIdsByName,
  querySpellDetail,
  querySpellI18nDetail,
  querySpellI18nNamesByIds,
  querySpellsByIds,
  SELECT_SPELL_I18N_MIN,
  SELECT_SPELL_LIST,
} from "./spells.repo";
import { hasCjk } from "~/utils/i18n";

type FilterFunction<T> = (item: T) => boolean;

function filterByDomainIdAndLevel(
  ids: Set<number>,
  level: number,
): FilterFunction<{ domainId: number; level: number }> {
  return (classOrDomain: { domainId: number; level: number }) =>
    ids.has(classOrDomain.domainId) && classOrDomain.level === level;
}

function filterByClassIdAndLevel(
  ids: Set<number>,
  level: number,
): FilterFunction<{ classId: number; level: number }> {
  return (classOrDomain: { classId: number; level: number }) =>
    ids.has(classOrDomain.classId) && classOrDomain.level === level;
}

function filterSpellIndexes(
  spell: any,
  classIds: Set<number> | null,
  domainIds: Set<number> | null,
  level: number | null,
) {
  if (level !== null) {
    spell.spellClassIndexes = classIds
      ? spell.spellClassIndexes.filter(filterByClassIdAndLevel(classIds, level))
      : [];
    spell.spellDomainIndexes = domainIds
      ? spell.spellDomainIndexes.filter(
          filterByDomainIdAndLevel(domainIds, level),
        )
      : [];
  }
}

async function getI18nMap(spellIds: number[], i18n: I18nContext) {
  const i18nMap = new Map<
    number,
    AppPrisma.I18nSpellTextGetPayload<{
      select: typeof SELECT_SPELL_I18N_MIN;
    }>
  >();
  if (i18n.lang != "en") {
    const spellI18n = await querySpellI18nNamesByIds(
      spellIds,
      i18n.lang,
      i18n.variant,
    );
    spellI18n.forEach((s) => i18nMap.set(s.spellId, s));
  }
  return i18nMap;
}

export const spellsService = {
  async searchByName(input: {
    q: string;
    rulebookIds: number[];
    page: number;
    pageSize: number;
    i18n: I18nContext;
  }): Promise<SpellNameSearchResponse> {
    const doAppQuery = input.i18n.lang != "en";
    const maxCandidates = Math.min(2000, input.page * input.pageSize * 20);

    const idsEn = await queryIdsByName(
      input.q,
      input.rulebookIds,
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
        maxCandidates,
      );
      for (const id of idsI18n)
        if (!seen.has(id)) {
          seen.add(id);
          merged.push(id);
        }
    }

    const total = merged.length; // capped

    const spells = await fetchSpellsInOrder(merged, SELECT_SPELL_LIST);
    spells.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);

    const offset = (input.page - 1) * input.pageSize;
    const pagedSpells = spells.slice(offset, offset + input.pageSize);

    const i18nMap = await getI18nMap(
      pagedSpells.map((s) => s.id),
      input.i18n,
    );

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      q: input.q,
      rulebookIds: input.rulebookIds,
      items: pagedSpells.map((s) => mapSpellItem(s, i18nMap.get(s.id) ?? null)),
    };
  },

  async listByClassAndDomainLevel(input: {
    classIds: number[];
    domainIds: number[];
    level: number;
    rulebookIds: number[];
    page: number;
    pageSize: number;
    i18n: I18nContext;
  }): Promise<SpellByClassLevelResponse> {
    const { total, spellsInOrder } = await queryByClassAndDomainLevel(
      input.classIds,
      input.domainIds,
      input.level,
      input.rulebookIds,
      input.page,
      input.pageSize,
    );

    spellsInOrder.forEach((spell) => {
      filterSpellIndexes(
        spell,
        input.classIds.length == 0 ? null : new Set(input.classIds),
        input.domainIds.length == 0 ? null : new Set(input.domainIds),
        input.level,
      );
    });

    const i18nMap = await getI18nMap(
      spellsInOrder.map((s) => s.id),
      input.i18n,
    );

    const items: SpellItemView[] = spellsInOrder.map((s) =>
      mapSpellItem(s, i18nMap.has(s.id) ? i18nMap.get(s.id)! : null),
    );

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      level: input.level,
      classIds: input.classIds,
      rulebookIds: input.rulebookIds,
      items,
    };
  },

  async getSpellDetail(input: {
    id: number;
    i18n: I18nContext;
  }): Promise<SpellDetailView | null> {
    const spellPromise = querySpellDetail(input.id);

    const spellI18nPromise =
      input.i18n.lang != "en"
        ? querySpellI18nDetail(input.id, input.i18n.lang, input.i18n.variant)
        : null;

    const [spell, spellI18n] = await Promise.all([
      spellPromise,
      spellI18nPromise,
    ]);
    if (!spell) {
      return null;
    }

    return mapSpellDetail(spell, spellI18n);
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

    const [rows, i18nMap] = await Promise.all([
      querySpellsByIds(uniqueIds),
      getI18nMap(uniqueIds, input.i18n),
    ]);

    const byId = new Map<number, (typeof rows)[number]>();
    for (const r of rows) byId.set(r.id, r);

    const items = inputIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((s) =>
        mapSpellItem(s, i18nMap.has(s.id) ? i18nMap.get(s.id)! : null),
      );

    const missingIds = inputIds.filter((id) => !byId.has(id));

    return {
      ids: inputIds,
      items,
      missingIds,
    };
  },
};
