import {
  I18nContext,
  SpellByLevelResponse,
  SpellComponentFilters,
  SpellItemView,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import {
  queryByClassAndDomainAllLevels,
  queryByClassAndDomainWithLevel,
  SpellRow,
} from "./spells.repo.read";
import { mapSpellItem } from "./spells.mapper";
import { queryI18nMap, queryI18nSummaryMap } from "./spells.repo.content";

type HasLevel = { level: number };
type SpellClassIndex = SpellRow["spellClassIndexes"][number];
type SpellDomainIndex = SpellRow["spellDomainIndexes"][number];

function filterByIdsAndOptionalLevel<T extends HasLevel>(
  ids: Set<number> | null,
  getId: (t: T) => number,
  level: number | null,
) {
  if (!ids) return (_: T) => false;

  if (level === null) {
    return (x: T) => ids.has(getId(x));
  }

  return (x: T) => ids.has(getId(x)) && x.level === level;
}

function filterSpellIndexes(
  spell: SpellRow,
  classIds: Set<number> | null,
  domainIds: Set<number> | null,
  level: number | null,
) {
  const classPred = filterByIdsAndOptionalLevel(
    classIds,
    (c: SpellClassIndex) => c.classId,
    level,
  );
  const domainPred = filterByIdsAndOptionalLevel(
    domainIds,
    (d: SpellDomainIndex) => d.domainId,
    level,
  );

  spell.spellClassIndexes = spell.spellClassIndexes.filter(classPred);
  spell.spellDomainIndexes = spell.spellDomainIndexes.filter(domainPred);
}

export type LevelMode = "single" | "all";

function groupSingleLevel(level: number, spells: SpellItemView[]) {
  return [{ level, items: spells }];
}

function groupAllLevels(spells: SpellItemView[], levels: number[]) {
  const map = new Map<number, SpellItemView[]>();

  for (let i = 0; i < spells.length; i++) {
    const lv = levels[i]!;
    const arr = map.get(lv);
    if (arr) arr.push(spells[i]!);
    else map.set(lv, [spells[i]!]);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, items]) => ({ level, items }));
}

async function prepareSpellItems(
  spellsInOrder: SpellRow[],
  classSet: Set<number> | null,
  domainSet: Set<number> | null,
  level: number | null,
  i18n: I18nContext,
): Promise<SpellItemView[]> {
  spellsInOrder.forEach((spell) => {
    filterSpellIndexes(spell, classSet, domainSet, level);
  });

  const spellIds = spellsInOrder.map((s) => s.id);
  const [i18nMap, summaryMap] = await Promise.all([
    queryI18nMap(spellIds, i18n),
    queryI18nSummaryMap(spellIds, i18n),
  ]);

  return spellsInOrder.map((s) =>
    mapSpellItem(s, i18nMap.get(s.id) ?? null, summaryMap.get(s.id) ?? null),
  );
}

export async function listByClassAndDomainLevel(input: {
  classIds: number[];
  domainIds: number[];
  levelMode: LevelMode;
  level: number | null;
  rulebookIds: number[];
  taxonomyFilters: SpellTaxonomyFilterIds;
  componentFilters: SpellComponentFilters;
  page: number;
  pageSize: number;
  i18n: I18nContext;
}): Promise<SpellByLevelResponse> {
  const classSet = input.classIds.length ? new Set(input.classIds) : null;
  const domainSet = input.domainIds.length ? new Set(input.domainIds) : null;

  if (input.levelMode === "all") {
    const { total, spellsInOrder, levelsInOrder } =
      await queryByClassAndDomainAllLevels(
        input.classIds,
        input.domainIds,
        input.rulebookIds,
        input.taxonomyFilters,
        input.componentFilters,
        input.page,
        input.pageSize,
      );

    const items = await prepareSpellItems(
      spellsInOrder,
      classSet,
      domainSet,
      null, // IMPORTANT: all-level should not filter by a single level
      input.i18n,
    );

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      classIds: input.classIds,
      domainIds: input.domainIds,
      rulebookIds: input.rulebookIds,
      ...input.taxonomyFilters,
      ...input.componentFilters,
      groups: groupAllLevels(items, levelsInOrder),
    };
  } else {
    const { total, spellsInOrder } = await queryByClassAndDomainWithLevel(
      input.classIds,
      input.domainIds,
      input.level as number,
      input.rulebookIds,
      input.taxonomyFilters,
      input.componentFilters,
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

    const spellIds = spellsInOrder.map((s) => s.id);
    const [i18nMap, summaryMap] = await Promise.all([
      queryI18nMap(spellIds, input.i18n),
      queryI18nSummaryMap(spellIds, input.i18n),
    ]);

    const items: SpellItemView[] = spellsInOrder.map((s) =>
      mapSpellItem(s, i18nMap.get(s.id) ?? null, summaryMap.get(s.id) ?? null),
    );

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      classIds: input.classIds,
      domainIds: input.domainIds,
      rulebookIds: input.rulebookIds,
      ...input.taxonomyFilters,
      ...input.componentFilters,
      groups: groupSingleLevel(input.level as number, items),
    };
  }
}
