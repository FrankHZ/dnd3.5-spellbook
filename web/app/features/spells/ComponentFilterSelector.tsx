import type { SpellComponentFilterKey } from "@dnd/contracts";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { FilterDisclosure } from "./FilterDisclosure";
import { SpellComponentBadge } from "./SpellComponentBadge";
import { normalizeComponentFilters } from "./taxonomy-filter-state";

export function getComponentFilterLabel(
  key: SpellComponentFilterKey,
  translateDetail: (key: string) => string,
  fallback: string,
  useLocalizedLabel: boolean,
) {
  if (!useLocalizedLabel) return fallback;

  switch (key) {
    case "verbal":
      return translateDetail("components.full.verbal");
    case "somatic":
      return translateDetail("components.full.somatic");
    case "material":
      return translateDetail("components.full.material");
    case "arcane_focus":
      return translateDetail("components.full.arcane-focus");
    case "divine_focus":
      return translateDetail("components.full.divine-focus");
    case "xp":
      return translateDetail("components.full.xp");
    case "metabreath":
      return translateDetail("components.full.metabreath");
    case "truename":
      return translateDetail("components.full.truename");
    case "corrupt":
      return translateDetail("components.full.corrupt");
    default:
      return fallback;
  }
}

export function ComponentFilterSelector({
  value,
  onChange,
}: {
  value: SpellComponentFilterKey[];
  onChange: (next: SpellComponentFilterKey[]) => void;
}) {
  const { t, i18n } = useTranslation("spell-filters");
  const boot = useBootstrap();
  const vocabulary = boot.spellFilterVocabulary.data?.components.base ?? [];
  const normalizedValue = useMemo(
    () => normalizeComponentFilters({ componentKeys: value }).componentKeys,
    [value],
  );
  const activeCount = normalizedValue.length;
  const selected = useMemo(() => new Set(normalizedValue), [normalizedValue]);
  const [open, setOpen] = useState(activeCount > 0);
  const useCompactOnly = !i18n.language.startsWith("zh");

  function getLocalizedComponentLabel(
    key: SpellComponentFilterKey,
    fallback: string,
  ) {
    switch (key) {
      case "verbal":
        return t("components.full.verbal", { ns: "spell-detail" });
      case "somatic":
        return t("components.full.somatic", { ns: "spell-detail" });
      case "material":
        return t("components.full.material", { ns: "spell-detail" });
      case "arcane_focus":
        return t("components.full.arcane-focus", { ns: "spell-detail" });
      case "divine_focus":
        return t("components.full.divine-focus", { ns: "spell-detail" });
      case "xp":
        return t("components.full.xp", { ns: "spell-detail" });
      case "metabreath":
        return t("components.full.metabreath", { ns: "spell-detail" });
      case "truename":
        return t("components.full.truename", { ns: "spell-detail" });
      case "corrupt":
        return t("components.full.corrupt", { ns: "spell-detail" });
      default:
        return fallback;
    }
  }

  function toggle(key: SpellComponentFilterKey) {
    const next = new Set(normalizedValue);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(
      normalizeComponentFilters({ componentKeys: Array.from(next) })
        .componentKeys,
    );
  }

  return (
    <FilterDisclosure
      title={t("components.title")}
      summary={
        activeCount > 0
          ? t("components.active-count", { count: activeCount })
          : t("components.collapsed-hint")
      }
      open={open}
      onToggle={setOpen}
    >
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{t("components.mode-all")}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {vocabulary.map((item) => {
          const checked = selected.has(item.key);
          const inputId = `component-filter-${item.key}`;
          const label = useCompactOnly
            ? item.label
            : getLocalizedComponentLabel(item.key, item.label);
          return (
            <label
              key={item.key}
              htmlFor={inputId}
              className={cn(
                "flex min-w-0 cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm transition-colors",
                checked
                  ? "border-primary/60 bg-primary/5 text-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={() => toggle(item.key)}
                aria-label={label}
              />
              <SpellComponentBadge className="min-w-8">
                {item.abbreviation}
              </SpellComponentBadge>
              {!useCompactOnly && (
                <span className="min-w-0 truncate">{label}</span>
              )}
            </label>
          );
        })}
      </div>
    </FilterDisclosure>
  );
}
