import type {
  SpellComponentFilterVocabularyItem,
  SpellFilterVocabularyItem,
  SpellMechanicFilterVocabularyItem,
} from "@dnd/contracts";

export type SpellFilterLabelTranslator = (
  key: string,
  options?: { defaultValue?: string; ns?: string },
) => string;

export type SpellMechanicFilterGroupId =
  | "castingTimes"
  | "ranges"
  | "durations"
  | "savingThrows"
  | "spellResistances";

const MECHANIC_GROUP_LABEL_KEYS: Record<SpellMechanicFilterGroupId, string> = {
  castingTimes: "casting-times",
  ranges: "ranges",
  durations: "durations",
  savingThrows: "saving-throws",
  spellResistances: "spell-resistances",
};

function keySegment(value: string) {
  return value.replaceAll("_", "-");
}

function translateWithFallback(
  t: SpellFilterLabelTranslator,
  key: string,
  fallback: string,
) {
  const label = t(key, {
    defaultValue: fallback,
    ns: "spell-filter-vocabulary",
  });
  return label.trim() || fallback;
}

function withSourceLabel(
  label: string,
  sourceLabel: string,
  includeSourceLabel: boolean,
) {
  if (!includeSourceLabel || label === sourceLabel) return label;
  return `${label} - ${sourceLabel}`;
}

export function getTaxonomyFilterDisplayLabel(
  item: SpellFilterVocabularyItem,
  t: SpellFilterLabelTranslator,
  options?: { includeEnglish?: boolean },
) {
  const sourceLabel = item.name;
  const fallback = item.i18n?.name ?? sourceLabel;
  const key = keySegment(item.bucketKey ?? item.key);
  const label = translateWithFallback(
    t,
    `taxonomy.options.${keySegment(item.category)}.${key}`,
    fallback,
  );

  return withSourceLabel(label, sourceLabel, options?.includeEnglish === true);
}

export function getComponentFilterDisplayLabel(
  item: SpellComponentFilterVocabularyItem,
  t: SpellFilterLabelTranslator,
) {
  return translateWithFallback(
    t,
    `components.options.${keySegment(item.key)}`,
    item.label,
  );
}

export function getMechanicFilterDisplayLabel(
  groupId: SpellMechanicFilterGroupId,
  item: SpellMechanicFilterVocabularyItem,
  t: SpellFilterLabelTranslator,
) {
  return translateWithFallback(
    t,
    `mechanics.${MECHANIC_GROUP_LABEL_KEYS[groupId]}.options.${keySegment(item.key)}`,
    item.label,
  );
}
