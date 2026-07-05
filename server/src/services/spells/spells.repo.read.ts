import {
  RulebookId,
  SpellComponentFilters,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { Prisma } from "#prisma-rules-clean/generated/client";
import {
  fetchSpellsInOrder as fetchRulesSpellsInOrder,
  queryByClassAndDomainAllLevels as queryRulesByClassAndDomainAllLevels,
  queryByClassAndDomainWithLevel as queryRulesByClassAndDomainWithLevel,
  queryByExactNames as queryRulesByExactNames,
  queryIdsByName as queryRulesIdsByName,
  querySpellDetail as queryRulesSpellDetail,
  querySpellsByIds as queryRulesSpellsByIds,
  SELECT_SPELL_DETAIL,
  SELECT_SPELL_LIST,
  SELECT_SPELL_MIN,
  type SpellRow,
} from "#server/services/spells/spells.repo.rules";
import {
  fetchNormalizedSpellsInOrder,
  queryNormalizedByClassAndDomainAllLevels,
  queryNormalizedByClassAndDomainWithLevel,
  queryNormalizedByExactNames,
  queryNormalizedIdsByName,
  queryNormalizedSpellDetail,
  queryNormalizedSpellsByIds,
} from "#server/services/spells/spells.repo.normalized-content";

export { SELECT_SPELL_DETAIL, SELECT_SPELL_LIST, SELECT_SPELL_MIN };
export type { SpellRow };

export function activeSpellReadSource() {
  return process.env.SPELL_READ_SOURCE === "rules" ? "rules" : "content";
}

export async function fetchSpellsInOrder<T extends Prisma.SpellSelect>(
  ids: number[],
  select: T,
) {
  if (activeSpellReadSource() === "content") {
    return fetchNormalizedSpellsInOrder(ids) as Promise<SpellRow<T>[]>;
  }
  return fetchRulesSpellsInOrder(ids, select);
}

export async function queryIdsByName(
  name: string,
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  maxCandidates: number,
) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedIdsByName(
      name,
      rulebookIds,
      taxonomyFilters,
      componentFilters,
      maxCandidates,
    );
  }
  return queryRulesIdsByName(
    name,
    rulebookIds,
    taxonomyFilters,
    componentFilters,
    maxCandidates,
  );
}

export async function queryByClassAndDomainWithLevel(
  classIds: number[],
  domainIds: number[],
  level: number,
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  page: number,
  pageSize: number,
) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedByClassAndDomainWithLevel(
      classIds,
      domainIds,
      level,
      rulebookIds,
      taxonomyFilters,
      componentFilters,
      page,
      pageSize,
    );
  }
  return queryRulesByClassAndDomainWithLevel(
    classIds,
    domainIds,
    level,
    rulebookIds,
    taxonomyFilters,
    componentFilters,
    page,
    pageSize,
  );
}

export async function queryByClassAndDomainAllLevels(
  classIds: number[],
  domainIds: number[],
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  page: number,
  pageSize: number,
) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedByClassAndDomainAllLevels(
      classIds,
      domainIds,
      rulebookIds,
      taxonomyFilters,
      componentFilters,
      page,
      pageSize,
    );
  }
  return queryRulesByClassAndDomainAllLevels(
    classIds,
    domainIds,
    rulebookIds,
    taxonomyFilters,
    componentFilters,
    page,
    pageSize,
  );
}

export async function querySpellDetail(id: number) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedSpellDetail(id);
  }
  return queryRulesSpellDetail(id);
}

export async function querySpellsByIds(ids: number[]): Promise<SpellRow[]> {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedSpellsByIds(ids);
  }
  return queryRulesSpellsByIds(ids);
}

export async function queryByExactNames(
  names: string[],
  rulebookIds: RulebookId[],
): Promise<SpellRow<typeof SELECT_SPELL_MIN>[]> {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedByExactNames(
      names,
      rulebookIds,
    ) as Promise<SpellRow<typeof SELECT_SPELL_MIN>[]>;
  }
  return queryRulesByExactNames(names, rulebookIds);
}
