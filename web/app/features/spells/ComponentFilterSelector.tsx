import type { SpellComponentFilterKey } from "@dnd/contracts";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { normalizeComponentFilters } from "./taxonomy-filter-state";

export function ComponentFilterSelector({
  value,
  onChange,
}: {
  value: SpellComponentFilterKey[];
  onChange: (next: SpellComponentFilterKey[]) => void;
}) {
  const { t } = useTranslation("spell-filters");
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
    <details
      className="group space-y-3"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>{t("components.title")}</span>
          <span className="text-xs font-normal text-muted-foreground group-hover:text-accent-foreground">
            {activeCount > 0
              ? t("components.active-count", { count: activeCount })
              : t("components.collapsed-hint")}
          </span>
        </div>
      </summary>

      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("components.mode-all")}</span>
          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onChange([])}
            >
              {t("actions.clear", { ns: "translation" })}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {vocabulary.map((item) => {
            const checked = selected.has(item.key);
            const inputId = `component-filter-${item.key}`;
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
                  aria-label={item.label}
                />
                <Badge
                  variant={checked ? "default" : "outline"}
                  className="min-w-8 rounded-sm px-1.5"
                >
                  {item.abbreviation}
                </Badge>
                <span className="min-w-0 truncate">{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}
