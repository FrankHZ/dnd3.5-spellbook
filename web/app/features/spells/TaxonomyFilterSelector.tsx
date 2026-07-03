import type {
  SpellFilterVocabularyItem,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import {
  MultiSelectPicker,
  type PickerItem,
} from "~/components/MultiSelectPicker";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { countTaxonomyFilters } from "./taxonomy-filter-state";

function toPickerItem(
  item: SpellFilterVocabularyItem,
  displayName: ReturnType<typeof useAppI18n>["name"],
): PickerItem {
  return {
    id: item.id,
    name: displayName(item),
  };
}

export function TaxonomyFilterSelector({
  value,
  onChangeSchools,
  onChangeSubschools,
  onChangeDescriptors,
}: {
  value: SpellTaxonomyFilterIds;
  onChangeSchools: (next: number[]) => void;
  onChangeSubschools: (next: number[]) => void;
  onChangeDescriptors: (next: number[]) => void;
}) {
  const { t } = useTranslation("spell-filters");
  const { lang, name, nameWithEn } = useAppI18n();
  const displayPrefs = useDisplayPrefs();
  const displayName =
    lang === "zh" && displayPrefs.zhDisplay.filterFacetLabelsWithEnglish
      ? nameWithEn
      : name;
  const boot = useBootstrap();
  const taxonomy = boot.spellFilterVocabulary.data?.taxonomy;
  const activeCount = countTaxonomyFilters(value);
  const [open, setOpen] = useState(activeCount > 0);

  const schoolItems =
    taxonomy?.schools.map((item) => toPickerItem(item, displayName)) ?? [];
  const subschoolItems =
    taxonomy?.subschools.map((item) => toPickerItem(item, displayName)) ?? [];
  const descriptorItems =
    taxonomy?.descriptors.map((item) => toPickerItem(item, displayName)) ?? [];

  return (
    <details
      className="group space-y-3"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>{t("taxonomy.title")}</span>
          <span className="text-xs font-normal text-muted-foreground group-hover:text-accent-foreground">
            {activeCount > 0
              ? t("taxonomy.active-count", { count: activeCount })
              : t("taxonomy.collapsed-hint")}
          </span>
        </div>
      </summary>

      <div className="space-y-3 pt-1">
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
          selectedIds={value.descriptorIds}
          onChange={onChangeDescriptors}
          badgeVariant="outline"
        />
      </div>
    </details>
  );
}
