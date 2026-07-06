import type {
  SpellMechanicFilterVocabularyItem,
  SpellMechanicFilters,
} from "@dnd/contracts";
import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBootstrap } from "~/bootstrap/useBootstrap";
import { getMechanicFilterDisplayLabel } from "~/i18n/display/spell-filter";
import { cn } from "~/lib/utils";

import { FilterDisclosure } from "./FilterDisclosure";
import {
  buildMechanicFilterGroupStates,
  countMechanicFilterGroupStates,
} from "./mechanic-filter-model";
import { normalizeMechanicFilters } from "./taxonomy-filter-state";

export function MechanicsFilterSelector({
  value,
  onChange,
}: {
  value: SpellMechanicFilters;
  onChange: (next: SpellMechanicFilters) => void;
}) {
  const { t } = useTranslation("spell-filters");
  const boot = useBootstrap();
  const mechanics = boot.spellFilterVocabulary.data?.mechanics;
  const normalizedValue = useMemo(() => normalizeMechanicFilters(value), [value]);
  const groups = useMemo(
    () => buildMechanicFilterGroupStates(mechanics, normalizedValue),
    [mechanics, normalizedValue],
  );
  const groupTitles = {
    castingTimes: t("mechanics.casting-time", { ns: "spell-detail" }),
    ranges: t("mechanics.range", { ns: "spell-detail" }),
    durations: t("mechanics.duration", { ns: "spell-detail" }),
    savingThrows: t("mechanics.saving-throw", { ns: "spell-detail" }),
    spellResistances: t("mechanics.spell-resistance", {
      ns: "spell-detail",
    }),
  } satisfies Record<(typeof groups)[number]["id"], string>;
  const activeCount = countMechanicFilterGroupStates(groups);
  const [open, setOpen] = useState(activeCount > 0);

  function toggle(
    group: (typeof groups)[number],
    item: SpellMechanicFilterVocabularyItem,
  ) {
    const selected = new Set(group.selectedKeys);
    if (selected.has(item.key)) selected.delete(item.key);
    else selected.add(item.key);

    onChange(
      normalizeMechanicFilters({
        ...normalizedValue,
        [group.valueKey]: Array.from(selected),
      }),
    );
  }

  return (
    <FilterDisclosure
      title={t("mechanics.title")}
      summary={
        activeCount > 0
          ? t("mechanics.active-count", { count: activeCount })
          : t("mechanics.collapsed-hint")
      }
      open={open}
      onToggle={setOpen}
    >
      <div className="text-xs leading-5 text-muted-foreground">
        {t("mechanics.mode-any")}
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const selected = new Set(group.selectedKeys);
          if (group.buckets.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1.5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {groupTitles[group.id]}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {group.buckets.map((item) => {
                  const checked = selected.has(item.key);
                  const label = getMechanicFilterDisplayLabel(
                    group.id,
                    item,
                    t,
                  );
                  const inputId = `mechanic-filter-${group.id}-${item.key}`;

                  return (
                    <button
                      key={item.key}
                      id={inputId}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(group, item)}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-sm transition-colors",
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
                      <span className="min-w-0 truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </FilterDisclosure>
  );
}
