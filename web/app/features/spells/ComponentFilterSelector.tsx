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
      return translateDetail("components.verbal");
    case "somatic":
      return translateDetail("components.somatic");
    case "material":
      return translateDetail("components.material");
    case "arcane_focus":
      return translateDetail("components.arcane-focus");
    case "divine_focus":
      return translateDetail("components.divine-focus");
    case "xp":
      return translateDetail("components.xp");
    case "metabreath":
      return translateDetail("components.metabreath");
    case "truename":
      return translateDetail("components.truename");
    case "corrupt":
      return translateDetail("components.corrupt");
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
  const { t: tDetail } = useTranslation("spell-detail");
  const boot = useBootstrap();
  const vocabulary = boot.spellFilterVocabulary.data?.components.base ?? [];
  const normalizedValue = useMemo(
    () => normalizeComponentFilters({ componentKeys: value }).componentKeys,
    [value],
  );
  const activeCount = normalizedValue.length;
  const selected = useMemo(() => new Set(normalizedValue), [normalizedValue]);
  const [open, setOpen] = useState(activeCount > 0);

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
          const label = getComponentFilterLabel(
            item.key,
            tDetail,
            item.label,
            i18n.language.startsWith("zh"),
          );
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
              <span className="min-w-0 truncate">{label}</span>
            </label>
          );
        })}
      </div>
    </FilterDisclosure>
  );
}
