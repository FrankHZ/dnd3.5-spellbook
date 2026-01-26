import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { usePersistedState } from "~/state/persisted-state";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { getSpellsByClassLevel } from "~/api/spells";
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

const PAGE_SIZE = 25;

function LevelSelector() {
  const { state, setState } = usePersistedState();
  const level = state.browseLevel;
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium">Level</div>
      <Select
        value={level === null ? "" : String(level)}
        onValueChange={(v) =>
          setState((s) => ({
            ...s,
            browseLevel: v === "" ? null : Number(v),
          }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select level (0-9)" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 10 }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {String(i)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {level === null && (
        <div className="text-sm text-destructive">
          Select a spell level (0-9).
        </div>
      )}
    </div>
  );
}

function ClassSelector({ classes }: { classes: Class[] }) {
  const { state, setState } = usePersistedState();
  const classIds = state.browseClassIds;
  const selectedClassSet = useMemo(() => new Set(classIds), [classIds]);

  function toggleClass(id: number, checked: boolean) {
    setState((s) => {
      const next = new Set(s.browseClassIds);
      if (checked) next.add(id);
      else next.delete(id);
      return { ...s, browseClassIds: Array.from(next) };
    });
  }
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium">Classes</div>
      <div className="text-xs text-muted-foreground">
        Multi-select. Prestige classes are controlled by the Settings toggle.
      </div>

      <div className="max-h-64 overflow-auto pr-1 space-y-2">
        {classes.map((c) => {
          const checked = selectedClassSet.has(c.id);
          return (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => toggleClass(c.id, Boolean(v))}
              />
              <span>{c.name}</span>
            </label>
          );
        })}
      </div>
      <div className="text-sm text-muted-foreground">
        {state.browseClassIds.length} class(es) selected
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const { state } = usePersistedState();
  const boot = useBootstrap(state.includePrestige);

  const [page, setPage] = useState(1);

  const level = state.browseLevel;
  const classIds = state.browseClassIds;
  const rulebookIds = state.selectedRulebookIds; // optional selector in this page

  const hasValidSelection = classIds.length > 0 && level !== null;

  useEffect(() => {
    setPage(1);
  }, [classIds, level, rulebookIds]);

  const browseQuery = useQuery({
    queryKey: [
      "browse",
      { classIds, level, rulebookIds, page, pageSize: PAGE_SIZE },
    ],
    enabled: hasValidSelection,
    queryFn: ({ signal }) =>
      getSpellsByClassLevel({
        classIds,
        level: level!, // safe because enabled guards it
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        page,
        pageSize: PAGE_SIZE,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const classes = boot.classes.data?.items ?? [];

  const validationMessages: string[] = [];
  if (classIds.length === 0)
    validationMessages.push("Select at least one class.");
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
          <ClassSelector classes={classes} />
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
