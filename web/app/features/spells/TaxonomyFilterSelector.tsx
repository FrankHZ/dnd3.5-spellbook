import type {
  Rulebook,
  SpellDescriptorBucketKey,
  SpellFilterVocabularyItem,
  SpellTaxonomyVocabularyCategory,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import {
  MultiSelectPicker,
  type PickerItem,
} from "~/components/MultiSelectPicker";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useUserPrefs } from "~/state/user-prefs-state";
import { FilterDisclosure } from "./FilterDisclosure";
import { countTaxonomyFilters } from "./taxonomy-filter-state";

const DESCRIPTOR_BUCKET_PICKER_IDS: Record<SpellDescriptorBucketKey, number> = {
  other: -1,
};

const TOME_OF_BATTLE_ABBR = "ToB";
const TOME_OF_BATTLE_SLUG = "tome-of-battle-the-book-of-nine-swords";

function toPickerItem(
  item: SpellFilterVocabularyItem & { id: number },
  displayName: ReturnType<typeof useAppI18n>["name"],
  group?: string,
): PickerItem {
  return {
    id: item.id,
    name: displayName(item),
    group,
  };
}

function hasVocabularyId(
  item: SpellFilterVocabularyItem,
): item is SpellFilterVocabularyItem & { id: number } {
  return typeof item.id === "number";
}

function toDescriptorPickerItem(
  item: SpellFilterVocabularyItem,
  displayName: ReturnType<typeof useAppI18n>["name"],
): PickerItem | null {
  if (hasVocabularyId(item)) return toPickerItem(item, displayName);
  if (item.bucketKey) {
    return {
      id: DESCRIPTOR_BUCKET_PICKER_IDS[item.bucketKey],
      name: displayName(item),
    };
  }
  return null;
}

function taxonomyGroupKey(category: SpellTaxonomyVocabularyCategory) {
  switch (category) {
    case "spell_school":
      return "taxonomy.groups.spell-school";
    case "spell_subschool":
      return "taxonomy.groups.spell-subschool";
    case "spell_descriptor":
      return "taxonomy.groups.spell-descriptor";
    case "maneuver_discipline":
      return "taxonomy.groups.maneuver-discipline";
    case "maneuver_category":
      return "taxonomy.groups.maneuver-category";
  }
}

export function isManeuverTaxonomyItem(item: SpellFilterVocabularyItem) {
  return (
    item.sourceKind === "maneuver" || item.category.startsWith("maneuver_")
  );
}

export function isTomeOfBattleRulebook(rulebook: Rulebook) {
  return (
    rulebook.slug === TOME_OF_BATTLE_SLUG ||
    rulebook.abbr === TOME_OF_BATTLE_ABBR ||
    rulebook.displayAbbr === TOME_OF_BATTLE_ABBR
  );
}

export function selectedRulebooksIncludeTomeOfBattle(
  rulebooks: Rulebook[],
  selectedRulebookIds: number[],
) {
  if (selectedRulebookIds.length === 0) return false;
  const selected = new Set(selectedRulebookIds);
  return rulebooks.some(
    (rulebook) => selected.has(rulebook.id) && isTomeOfBattleRulebook(rulebook),
  );
}

function splitDescriptorPickerIds(ids: number[]) {
  const descriptorIds = ids.filter((id) => id > 0);
  const descriptorBuckets = ids
    .filter((id) => id === DESCRIPTOR_BUCKET_PICKER_IDS.other)
    .map(() => "other" as const);

  return {
    descriptorIds,
    descriptorBuckets: Array.from(new Set(descriptorBuckets)),
  };
}

export function TaxonomyFilterSelector({
  value,
  onChangeSchools,
  onChangeSubschools,
  onChangeDescriptorFilters,
}: {
  value: SpellTaxonomyFilterIds;
  onChangeSchools: (next: number[]) => void;
  onChangeSubschools: (next: number[]) => void;
  onChangeDescriptorFilters: (next: {
    descriptorIds: number[];
    descriptorBuckets: SpellDescriptorBucketKey[];
  }) => void;
}) {
  const { t } = useTranslation("spell-filters");
  const { lang, name, nameWithEn } = useAppI18n();
  const { state } = useUserPrefs();
  const displayPrefs = useDisplayPrefs();
  const displayName =
    lang === "zh" && displayPrefs.zhDisplay.filterFacetLabelsWithEnglish
      ? nameWithEn
      : name;
  const boot = useBootstrap();
  const taxonomy = boot.spellFilterVocabulary.data?.taxonomy;
  const rulebooks = boot.rulebooks.data?.items ?? [];
  const rulebookScopeReady =
    state.selectedRulebookIds.length === 0 || rulebooks.length > 0;
  const showManeuverTaxonomy = selectedRulebooksIncludeTomeOfBattle(
    rulebooks,
    state.selectedRulebookIds,
  );
  const hideManeuverTaxonomy = rulebookScopeReady && !showManeuverTaxonomy;
  const activeCount = countTaxonomyFilters(value);
  const [open, setOpen] = useState(activeCount > 0);
  const groupLabel = (item: SpellFilterVocabularyItem) =>
    t(taxonomyGroupKey(item.category));

  const visibleSchools = useMemo(
    () =>
      (taxonomy?.schools ?? []).filter(
        (item) => !hideManeuverTaxonomy || !isManeuverTaxonomyItem(item),
      ),
    [hideManeuverTaxonomy, taxonomy?.schools],
  );
  const visibleSubschools = useMemo(
    () =>
      (taxonomy?.subschools ?? []).filter(
        (item) => !hideManeuverTaxonomy || !isManeuverTaxonomyItem(item),
      ),
    [hideManeuverTaxonomy, taxonomy?.subschools],
  );
  const visibleSchoolIds = useMemo(
    () =>
      new Set(visibleSchools.filter(hasVocabularyId).map((item) => item.id)),
    [visibleSchools],
  );
  const visibleSubschoolIds = useMemo(
    () =>
      new Set(visibleSubschools.filter(hasVocabularyId).map((item) => item.id)),
    [visibleSubschools],
  );

  useEffect(() => {
    if (!taxonomy || !rulebookScopeReady) return;
    const nextSchoolIds = value.schoolIds.filter((id) =>
      visibleSchoolIds.has(id),
    );
    if (nextSchoolIds.length !== value.schoolIds.length) {
      onChangeSchools(nextSchoolIds);
    }
  }, [
    onChangeSchools,
    rulebookScopeReady,
    taxonomy,
    value.schoolIds,
    visibleSchoolIds,
  ]);

  useEffect(() => {
    if (!taxonomy || !rulebookScopeReady) return;
    const nextSubschoolIds = value.subschoolIds.filter((id) =>
      visibleSubschoolIds.has(id),
    );
    if (nextSubschoolIds.length !== value.subschoolIds.length) {
      onChangeSubschools(nextSubschoolIds);
    }
  }, [
    onChangeSubschools,
    rulebookScopeReady,
    taxonomy,
    value.subschoolIds,
    visibleSubschoolIds,
  ]);

  const schoolItems =
    visibleSchools
      .filter(hasVocabularyId)
      .map((item) => toPickerItem(item, displayName, groupLabel(item))) ?? [];
  const subschoolItems =
    visibleSubschools
      .filter(hasVocabularyId)
      .map((item) => toPickerItem(item, displayName, groupLabel(item))) ?? [];
  const descriptorItems: PickerItem[] = (taxonomy?.descriptors ?? []).flatMap(
    (item) => {
      const pickerItem = toDescriptorPickerItem(item, displayName);
      return pickerItem ? [{ ...pickerItem, group: groupLabel(item) }] : [];
    },
  );
  const selectedDescriptorPickerIds = [
    ...value.descriptorIds,
    ...value.descriptorBuckets.map(
      (bucket) => DESCRIPTOR_BUCKET_PICKER_IDS[bucket],
    ),
  ];

  return (
    <FilterDisclosure
      title={t("taxonomy.title")}
      summary={
        activeCount > 0
          ? t("taxonomy.active-count", { count: activeCount })
          : t("taxonomy.collapsed-hint")
      }
      open={open}
      onToggle={setOpen}
    >
      <MultiSelectPicker
        title={t("taxonomy.schools")}
        placeholder={t("taxonomy.schools-placeholder")}
        items={schoolItems}
        selectedIds={value.schoolIds}
        onChange={onChangeSchools}
        badgeVariant="outline"
      />
      <MultiSelectPicker
        title={t("taxonomy.subschools")}
        placeholder={t("taxonomy.subschools-placeholder")}
        items={subschoolItems}
        selectedIds={value.subschoolIds}
        onChange={onChangeSubschools}
        badgeVariant="outline"
      />
      <MultiSelectPicker
        title={t("taxonomy.descriptors")}
        placeholder={t("taxonomy.descriptors-placeholder")}
        items={descriptorItems}
        selectedIds={selectedDescriptorPickerIds}
        onChange={(nextIds) => {
          onChangeDescriptorFilters(splitDescriptorPickerIds(nextIds));
        }}
        badgeVariant="outline"
      />
    </FilterDisclosure>
  );
}
