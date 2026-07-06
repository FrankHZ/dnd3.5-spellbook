import type { SpellNormalizedFilterScope } from "@dnd/contracts";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

import { ComponentFilterSelector } from "./ComponentFilterSelector";
import { MechanicsFilterSelector } from "./MechanicsFilterSelector";
import { TaxonomyFilterSelector } from "./TaxonomyFilterSelector";
import {
  countNormalizedFilters,
  emptyNormalizedFilters,
  normalizeNormalizedFilters,
} from "./taxonomy-filter-state";

export function AdvancedSpellFiltersPanel({
  value,
  onApply,
}: {
  value: SpellNormalizedFilterScope;
  onApply: (next: SpellNormalizedFilterScope) => void;
}) {
  const { t } = useTranslation("spell-filters");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => normalizeNormalizedFilters(value));
  const activeCount = countNormalizedFilters(value);
  const draftCount = countNormalizedFilters(draft);

  useEffect(() => {
    if (open) setDraft(normalizeNormalizedFilters(value));
  }, [open, value]);

  function applyDraft() {
    onApply(normalizeNormalizedFilters(draft));
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          data-testid="advanced-spell-filters-trigger"
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="size-4" />
            <span className="truncate">{t("advanced.title")}</span>
          </span>
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            {activeCount > 0
              ? t("advanced.active-count", { count: activeCount })
              : t("advanced.inactive")}
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[min(100vw,42rem)] max-w-none gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{t("advanced.title")}</SheetTitle>
          <SheetDescription>{t("advanced.description")}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <TaxonomyFilterSelector
              value={draft}
              onChangeSchools={(schoolIds) =>
                setDraft((current) =>
                  normalizeNormalizedFilters({ ...current, schoolIds }),
                )
              }
              onChangeSubschools={(subschoolIds) =>
                setDraft((current) =>
                  normalizeNormalizedFilters({ ...current, subschoolIds }),
                )
              }
              onChangeDescriptorFilters={(descriptorFilters) =>
                setDraft((current) =>
                  normalizeNormalizedFilters({
                    ...current,
                    ...descriptorFilters,
                  }),
                )
              }
            />

            <ComponentFilterSelector
              value={draft.componentKeys}
              onChange={(componentKeys) =>
                setDraft((current) =>
                  normalizeNormalizedFilters({ ...current, componentKeys }),
                )
              }
            />

            <MechanicsFilterSelector
              value={draft}
              onChange={(mechanicFilters) =>
                setDraft((current) =>
                  normalizeNormalizedFilters({ ...current, ...mechanicFilters }),
                )
              }
            />
          </div>
        </div>

        <SheetFooter className="grid gap-2 border-t sm:grid-cols-[1fr_auto] sm:items-center">
          <Button
            type="button"
            variant="ghost"
            className="justify-self-start"
            data-testid="advanced-spell-filters-reset"
            onClick={() => setDraft(emptyNormalizedFilters())}
            disabled={draftCount === 0}
          >
            {t("advanced.reset")}
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("advanced.cancel")}
              </Button>
            </SheetClose>
            <Button
              type="button"
              data-testid="advanced-spell-filters-apply"
              onClick={applyDraft}
            >
              {t("advanced.apply")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
