import { RulebookId } from "@dnd/contracts";
import { Prisma } from "prisma-rules-clean/generated/client";
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
} from "./spells.repo.rules";
import {
  fetchNormalizedSpellsInOrder,
  queryNormalizedByClassAndDomainAllLevels,
  queryNormalizedByClassAndDomainWithLevel,
  queryNormalizedByExactNames,
  queryNormalizedIdsByName,
  queryNormalizedSpellDetail,
  queryNormalizedSpellsByIds,
} from "./spells.repo.normalized-content";

export { SELECT_SPELL_DETAIL, SELECT_SPELL_LIST, SELECT_SPELL_MIN };
export type { SpellRow };

export function activeSpellReadSource() {
  return process.env.SPELL_READ_SOURCE === "content" ? "content" : "rules";
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
  maxCandidates: number,
) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedIdsByName(name, rulebookIds, maxCandidates);
  }
  return queryRulesIdsByName(name, rulebookIds, maxCandidates);
}

export async function queryByClassAndDomainWithLevel(
  classIds: number[],
  domainIds: number[],
  level: number,
  rulebookIds: number[],
  page: number,
  pageSize: number,
) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedByClassAndDomainWithLevel(
      classIds,
      domainIds,
      level,
      rulebookIds,
      page,
      pageSize,
    );
  }
  return queryRulesByClassAndDomainWithLevel(
    classIds,
    domainIds,
    level,
    rulebookIds,
    page,
    pageSize,
  );
}

export async function queryByClassAndDomainAllLevels(
  classIds: number[],
  domainIds: number[],
  rulebookIds: number[],
  page: number,
  pageSize: number,
) {
  if (activeSpellReadSource() === "content") {
    return queryNormalizedByClassAndDomainAllLevels(
      classIds,
      domainIds,
      rulebookIds,
      page,
      pageSize,
    );
  }
  return queryRulesByClassAndDomainAllLevels(
    classIds,
    domainIds,
    rulebookIds,
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
