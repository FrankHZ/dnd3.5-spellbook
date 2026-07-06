import type {
  SpellFilterVocabularyResponse,
  SpellMechanicFilterVocabularyItem,
  SpellMechanicFilters,
} from "@dnd/contracts";

import {
  countMechanicFilters,
  normalizeMechanicFilters,
} from "./taxonomy-filter-state";

export const MECHANIC_FILTER_GROUPS = [
  {
    id: "castingTimes",
    valueKey: "castingTimeKeys",
  },
  {
    id: "ranges",
    valueKey: "rangeKeys",
  },
  {
    id: "durations",
    valueKey: "durationKeys",
  },
  {
    id: "savingThrows",
    valueKey: "savingThrowKeys",
  },
  {
    id: "spellResistances",
    valueKey: "spellResistanceKeys",
  },
] as const;

export type MechanicFilterGroupState = {
  id: (typeof MECHANIC_FILTER_GROUPS)[number]["id"];
  valueKey: (typeof MECHANIC_FILTER_GROUPS)[number]["valueKey"];
  queryParam: string | undefined;
  mode: "any" | undefined;
  buckets: SpellMechanicFilterVocabularyItem[];
  selectedKeys: string[];
  activeCount: number;
};

export function buildMechanicFilterGroupStates(
  mechanics: SpellFilterVocabularyResponse["mechanics"] | undefined,
  filters: Partial<SpellMechanicFilters>,
): MechanicFilterGroupState[] {
  const normalized = normalizeMechanicFilters(filters);

  return MECHANIC_FILTER_GROUPS.map((config) => {
    const source = mechanics?.[config.id];
    const selectedKeys = normalized[config.valueKey];

    return {
      id: config.id,
      valueKey: config.valueKey,
      queryParam: source?.queryParam,
      mode: source?.mode,
      buckets: [...(source?.buckets ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
      selectedKeys,
      activeCount: selectedKeys.length,
    };
  });
}

export function countMechanicFilterGroupStates(
  groups: MechanicFilterGroupState[],
) {
  return groups.reduce((total, group) => total + group.activeCount, 0);
}

export function hasMechanicFilterSelection(
  filters: Partial<SpellMechanicFilters>,
) {
  return countMechanicFilters(normalizeMechanicFilters(filters)) > 0;
}
