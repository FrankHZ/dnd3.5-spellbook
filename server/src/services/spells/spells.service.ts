import type {
  SpellBatchResponse,
  SpellItem,
  SpellByClassLevelResponse,
  SpellDetail,
  SpellNameSearchResponse,
} from "@dnd/contracts";

import { mapSpellItem, mapSpellDetail } from "./spells.mapper";
import {
  queryByClassAndDomainLevels as queryByClassAndDomainLevel,
  queryByName,
  querySpellDetail,
  querySpellsByIds,
} from "./spells.repo";

type FilterFunction<T> = (item: T) => boolean;

function filterByRulebookId(
  rulebookIds: Set<number>,
): FilterFunction<{ rulebookId: number }> {
  return (classOrDomain: { rulebookId: number }) =>
    rulebookIds.has(classOrDomain.rulebookId);
}

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
  rulebookIds: Set<number>,
  classIds: Set<number> | null,
  domainIds: Set<number> | null,
  level: number | null,
) {
  spell.spellClassIndexes = spell.spellClassIndexes.filter(
    filterByRulebookId(rulebookIds),
  );
  if (classIds && level !== null)
    spell.spellClassIndexes = spell.spellClassIndexes.filter(
      filterByClassIdAndLevel(classIds, level),
    );

  spell.spellDomainIndexes = spell.spellDomainIndexes.filter(
    filterByRulebookId(rulebookIds),
  );
  if (domainIds && level !== null)
    spell.spellDomainIndexes = spell.spellDomainIndexes.filter(
      filterByDomainIdAndLevel(domainIds, level),
    );
}

export const spellsService = {
  async searchByName(input: {
    q: string;
    rulebookIds: number[];
    page: number;
    pageSize: number;
  }): Promise<SpellNameSearchResponse> {
    const { total, spellsInOrder } = await queryByName(
      input.q,
      input.rulebookIds,
      input.page,
      input.pageSize,
    );

    spellsInOrder.forEach((spell) => {
      filterSpellIndexes(spell, new Set(input.rulebookIds), null, null, null);
    });

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      q: input.q,
      rulebookIds: input.rulebookIds,
      items: spellsInOrder.map(mapSpellItem),
    };
  },

  async listByClassAndDomainLevel(input: {
    classIds: number[];
    domainIds: number[];
    level: number;
    rulebookIds: number[];
    page: number;
    pageSize: number;
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
        new Set(input.rulebookIds),
        input.classIds.length == 0 ? null : new Set(input.classIds),
        input.domainIds.length == 0 ? null : new Set(input.domainIds),
        input.level,
      );
    });
    const items: SpellItem[] = spellsInOrder.map(mapSpellItem);

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

  async getSpellDetail(input: { id: number }): Promise<SpellDetail | null> {
    const spell = await querySpellDetail(input.id);
    if (!spell) {
      return null;
    }

    return mapSpellDetail(spell);
  },

  async batch(input: { ids: number[] }): Promise<SpellBatchResponse> {
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

    const rows = await querySpellsByIds(uniqueIds);

    const byId = new Map<number, (typeof rows)[number]>();
    for (const r of rows) byId.set(r.id, r);

    const items = inputIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map(mapSpellItem);

    const missingIds = inputIds.filter((id) => !byId.has(id));

    return {
      ids: inputIds,
      items,
      missingIds,
    };
  },
};
