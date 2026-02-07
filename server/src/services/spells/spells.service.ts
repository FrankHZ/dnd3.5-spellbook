import type {
  SpellNameSearchResponse,
  I18nContext,
  SpellBatchResponse,
  SpellDetailView,
} from "@dnd/contracts";
import { mapSpellItem, mapSpellDetail } from "./spells.mapper";
import {
  fetchSpellsInOrder,
  queryI18nMap,
  queryIdsByI18nName,
  queryIdsByName,
  querySpellDetail,
  querySpellI18nDetail,
  querySpellsByIds,
  SELECT_SPELL_LIST,
} from "./spells.repo";
import { listByClassAndDomainLevel } from "./spells.service.by-level";

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

    const i18nMap = await queryI18nMap(
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
  listByClassAndDomainLevel,
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
      queryI18nMap(uniqueIds, input.i18n),
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
