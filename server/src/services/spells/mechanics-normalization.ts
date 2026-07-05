import type {
  SpellCastingTimeFilterKey,
  SpellDurationFilterKey,
  SpellMechanicFilters,
  SpellRangeFilterKey,
  SpellSavingThrowFilterKey,
} from "@dnd/contracts";
import {
  SPELL_CASTING_TIME_FILTER_KEYS,
  SPELL_DURATION_FILTER_KEYS,
  SPELL_RANGE_FILTER_KEYS,
  SPELL_SAVING_THROW_FILTER_KEYS,
} from "@dnd/contracts";

export const CASTING_TIME_FILTER_VOCABULARY: Array<{
  key: SpellCastingTimeFilterKey;
  label: string;
  sortOrder: number;
}> = [
  { key: "immediate_action", label: "Immediate action", sortOrder: 10 },
  { key: "swift_action", label: "Swift action", sortOrder: 20 },
  { key: "free_action", label: "Free action", sortOrder: 30 },
  { key: "standard_action", label: "Standard action", sortOrder: 40 },
  { key: "full_round_action", label: "Full-round action", sortOrder: 50 },
  { key: "round", label: "Rounds", sortOrder: 60 },
  { key: "minute", label: "Minutes", sortOrder: 70 },
  { key: "hour", label: "Hours", sortOrder: 80 },
];

export const RANGE_FILTER_VOCABULARY: Array<{
  key: SpellRangeFilterKey;
  label: string;
  sortOrder: number;
}> = [
  { key: "personal", label: "Personal", sortOrder: 10 },
  { key: "touch", label: "Touch", sortOrder: 20 },
  { key: "close", label: "Close", sortOrder: 30 },
  { key: "medium", label: "Medium", sortOrder: 40 },
  { key: "long", label: "Long", sortOrder: 50 },
  { key: "fixed", label: "Fixed distance", sortOrder: 60 },
  { key: "unlimited", label: "Unlimited", sortOrder: 70 },
];

export const DURATION_FILTER_VOCABULARY: Array<{
  key: SpellDurationFilterKey;
  label: string;
  sortOrder: number;
}> = [
  { key: "instantaneous", label: "Instantaneous", sortOrder: 10 },
  { key: "timed", label: "Timed", sortOrder: 20 },
  { key: "concentration", label: "Concentration", sortOrder: 30 },
  { key: "permanent", label: "Permanent", sortOrder: 40 },
];

export const SAVING_THROW_FILTER_VOCABULARY: Array<{
  key: SpellSavingThrowFilterKey;
  label: string;
  sortOrder: number;
}> = [
  { key: "none", label: "No save", sortOrder: 10 },
  { key: "fortitude", label: "Fortitude", sortOrder: 20 },
  { key: "reflex", label: "Reflex", sortOrder: 30 },
  { key: "will", label: "Will", sortOrder: 40 },
];

const CASTING_TIME_KEY_SET = new Set<string>(SPELL_CASTING_TIME_FILTER_KEYS);
const RANGE_KEY_SET = new Set<string>(SPELL_RANGE_FILTER_KEYS);
const DURATION_KEY_SET = new Set<string>(SPELL_DURATION_FILTER_KEYS);
const SAVING_THROW_KEY_SET = new Set<string>(SPELL_SAVING_THROW_FILTER_KEYS);

export function normalizeMechanicFilters(
  filters: Partial<SpellMechanicFilters>,
): SpellMechanicFilters {
  return {
    castingTimeKeys: normalizeKeys(
      filters.castingTimeKeys,
      SPELL_CASTING_TIME_FILTER_KEYS,
      CASTING_TIME_KEY_SET,
    ),
    rangeKeys: normalizeKeys(
      filters.rangeKeys,
      SPELL_RANGE_FILTER_KEYS,
      RANGE_KEY_SET,
    ),
    durationKeys: normalizeKeys(
      filters.durationKeys,
      SPELL_DURATION_FILTER_KEYS,
      DURATION_KEY_SET,
    ),
    savingThrowKeys: normalizeKeys(
      filters.savingThrowKeys,
      SPELL_SAVING_THROW_FILTER_KEYS,
      SAVING_THROW_KEY_SET,
    ),
  };
}

export function hasMechanicScope(filters: SpellMechanicFilters) {
  return (
    filters.castingTimeKeys.length > 0 ||
    filters.rangeKeys.length > 0 ||
    filters.durationKeys.length > 0 ||
    filters.savingThrowKeys.length > 0
  );
}

function normalizeKeys<T extends string>(
  values: readonly T[] | undefined,
  orderedKeys: readonly T[],
  allowed: Set<string>,
) {
  const selected = new Set(
    (values ?? []).map((value) => String(value).trim().toLowerCase()),
  );
  return orderedKeys.filter((key) => allowed.has(key) && selected.has(key));
}
