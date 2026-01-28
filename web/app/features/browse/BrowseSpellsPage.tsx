import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { usePersistedState } from "~/state/persisted-state";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { getSpellsByLevel } from "~/api/spells";
import { ApiError } from "~/api/http";

import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import Pager from "~/components/Pager";
import type { Class } from "../../../../contracts/dist/dto/class";
import { SpellCard } from "../../components/SpellCard";
import type { Domain } from "@dnd/contracts";
import {
  MultiSelectPicker,
  type PickerItem,
} from "~/components/MultiSelectPicker";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const PAGE_SIZE = 25;

export function LevelSelector() {
  const { state, setState } = usePersistedState();
  const level = state.browseLevel;

  function setLevel(next: number) {
    setState((s) => ({ ...s, browseLevel: next }));
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium">Level</div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Button
            key={i}
            type="button"
            variant={level === i ? "default" : "outline"}
            size="sm"
            onClick={() => setLevel(i)}
            className={cn("justify-center")}
          >
            {i}
          </Button>
        ))}
      </div>

      {level === null && (
        <div className="text-sm text-destructive">
          Select a spell level (0–9).
        </div>
      )}
    </div>
  );
}

function ClassAndDomainSelector() {
  const { state, setState } = usePersistedState();
  const boot = useBootstrap(state.includePrestige);
  const classes = boot.classes.data?.items ?? [];
  const domains = boot.domains.data?.items ?? [];

  const classItems: PickerItem[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    group: c.prestige ? "Prestige Classes" : "Base Classes",
  }));

  const domainItems: PickerItem[] = domains.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <div className="rounded-md border p-3 space-y-2">
      <MultiSelectPicker
        title="Classes"
        placeholder="Filter classes…"
        items={classItems}
        selectedIds={state.browseClassIds}
        onChange={(nextIds) =>
          setState((s) => ({ ...s, browseClassIds: nextIds }))
        }
      />

      <MultiSelectPicker
        title="Domains"
        placeholder="Filter domains…"
        items={domainItems}
        selectedIds={state.browseDomainIds}
        onChange={(nextIds) =>
          setState((s) => ({ ...s, browseDomainIds: nextIds }))
        }
      />
    </div>
  );
}

export default function BrowsePage() {
  const { state } = usePersistedState();
  const boot = useBootstrap(state.includePrestige);

  const [page, setPage] = useState(1);

  const level = state.browseLevel;
  const classIds = state.browseClassIds;
  const domainIds = state.browseDomainIds;
  const rulebookIds = state.selectedRulebookIds;

  const hasValidSelection =
    (classIds.length > 0 || domainIds.length > 0) && level !== null;

  useEffect(() => {
    setPage(1);
  }, [classIds, domainIds, level, rulebookIds]);

  const browseQuery = useQuery({
    queryKey: [
      "browse",
      { classIds, domainIds, level, rulebookIds, page, pageSize: PAGE_SIZE },
    ],
    enabled: hasValidSelection,
    queryFn: ({ signal }) =>
      getSpellsByLevel({
        classIds,
        domainIds,
        level: level!, // safe because enabled guards it
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        page,
        pageSize: PAGE_SIZE,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const validationMessages: string[] = [];
  if (classIds.length === 0 && domainIds.length === 0)
    validationMessages.push("Select at least one class or domain.");
  if (level === null) validationMessages.push("Select a spell level (0-9).");

  const errorMessage = useMemo(() => {
    const err = browseQuery.error;
    if (!err) return null;
    if (err instanceof ApiError) return err.message; // message already normalized
    return "Request failed. Please try again.";
  }, [browseQuery.error]);

  const total = browseQuery.data?.total ?? 0;
  const pageSize = browseQuery.data?.pageSize ?? PAGE_SIZE;
  const items = browseQuery.data?.items ?? [];

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <ClassAndDomainSelector />
          <LevelSelector />
        </div>
        <div className="space-y-3">
          {!hasValidSelection && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Before searching</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {validationMessages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {hasValidSelection && (
            <div className="space-y-3">
              <Pager
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => setPage(p)}
              />

              <Separator />

              {errorMessage && (
                <div className="rounded-md border p-3">
                  <div className="font-medium">Couldn’t load spells</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {errorMessage}
                  </div>
                </div>
              )}

              {!errorMessage &&
                !browseQuery.isLoading &&
                items.length === 0 && (
                  <div className="rounded-md border p-3">
                    <div className="font-medium">No spells found</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      No spells found for selected classes at level {level}.
                    </div>
                  </div>
                )}

              <div className="divide-y rounded-md border">
                {items.map((sp) => (
                  <SpellCard key={sp.id} spell={sp} showActions />
                ))}
              </div>

              <Pager
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => setPage(p)}
                showRangeText={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
