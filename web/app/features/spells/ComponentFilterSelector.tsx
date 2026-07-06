import type { SpellComponentFilterKey } from "@dnd/contracts";
import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { getComponentFilterDisplayLabel } from "~/i18n/display/spell-filter";
import { cn } from "~/lib/utils";
import { FilterDisclosure } from "./FilterDisclosure";
import { SpellComponentBadge } from "./SpellComponentBadge";
import { normalizeComponentFilters } from "./taxonomy-filter-state";

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
          const label = getComponentFilterDisplayLabel(item, t);
          return (
            <button
              key={item.key}
              id={inputId}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(item.key)}
              className={cn(
                "flex min-w-0 cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left text-sm transition-colors",
                checked
                  ? "border-primary/60 bg-primary/5 text-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-4 shrink-0 place-content-center rounded-[4px] border border-input shadow-xs",
                  checked &&
                    "border-primary bg-primary text-primary-foreground",
                )}
              >
                {checked && <CheckIcon className="size-3.5" />}
              </span>
              <SpellComponentBadge className="min-w-8">
                {item.abbreviation}
              </SpellComponentBadge>
              {!useCompactOnly && (
                <span className="min-w-0 truncate">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </FilterDisclosure>
  );
}
