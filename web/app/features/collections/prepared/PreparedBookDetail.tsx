import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getSpellsBatch } from "~/api/spells";
import { useAppI18n } from "~/i18n/useAppI18n";
import { useCollections } from "~/state/collections-state";
import type { PreparedBook, PreparedEntry } from "~/storage/collections.type";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Button } from "~/components/ui/button";
import { BulkPasteDialog } from "./BulkPasteDialog";
import { PreparedTable } from "./PreparedTable";
import {
  PreparedClassAndDomainSidebar,
  type Candidate,
  type OptionType,
  type ClassOption,
  type DomainOption,
} from "./PreparedClassSidebar";
import { useMetaNames } from "~/i18n/useMetaNames";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import type { SpellItemView } from "@dnd/contracts";

type ViewMode = "normal" | "edit";

function dedupeIds(entries: PreparedEntry[]): number[] {
  const set = new Set<number>();
  for (const e of entries) set.add(e.spellId);
  return Array.from(set);
}

function getLowestLevel(
  spell: SpellItemView,
  selectedClassIds: number[],
  selectedDomainIds: number[],
): number {
  const selectedClassSet = new Set(selectedClassIds);
  const selectedDomainSet = new Set(selectedDomainIds);

  const clampLevel = (m: number) => (m >= 0 && m <= 9 ? m : 0);

  const selectedClassLvls: number[] = [];
  for (const cl of spell.classLevels ?? []) {
    if (selectedClassSet.has(cl.id) && typeof cl.level === "number") {
      selectedClassLvls.push(cl.level);
    }
  }
  if (selectedClassLvls.length > 0) {
    return clampLevel(Math.min(...selectedClassLvls));
  }

  const selectedDomainLvls: number[] = [];
  for (const dl of spell.domainLevels ?? []) {
    if (selectedDomainSet.has(dl.id) && typeof dl.level === "number") {
      selectedDomainLvls.push(dl.level);
    }
  }
  if (selectedDomainLvls.length > 0) {
    return clampLevel(Math.min(...selectedDomainLvls));
  }

  // fallback: lowest possible level across all available sources
  const nums: number[] = [];

  for (const cl of spell.classLevels ?? []) {
    if (typeof cl.level === "number") nums.push(cl.level);
  }
  for (const dl of spell.domainLevels ?? []) {
    if (typeof dl.level === "number") nums.push(dl.level);
  }
  if (spell.corrupt?.level != null && typeof spell.corrupt.level === "number") {
    nums.push(spell.corrupt.level);
  }

  if (nums.length === 0) return 0;
  return clampLevel(Math.min(...nums));
}

export function PreparedBookDetail({ book }: { book: PreparedBook }) {
  const { queryKey } = useAppI18n();
  const {
    resetPreparedUsed,
    clearPrepared,
    setPreparedSelectedClassIds,
    setPreparedSelectedDomainIds,
  } = useCollections();
  const [mode, setMode] = useState<ViewMode>("normal");

  const { metaNameWithEn } = useMetaNames();
  const { classById, domainById } = useBootstrap();
  const selectedClassIds = book.selectedClassIds ?? [];
  const selectedDomainIds = book.selectedDomainIds ?? [];

  const onAddSelected = ({ type, id }: { type: OptionType; id: number }) => {
    if (type === "class") {
      if (!book.selectedClassIds.includes(id)) {
        setPreparedSelectedClassIds([...book.selectedClassIds, id]);
      }
    } else {
      if (!book.selectedDomainIds.includes(id)) {
        setPreparedSelectedDomainIds([...book.selectedDomainIds, id]);
      }
    }
  };

  const onRemoveSelected = ({ type, id }: { type: OptionType; id: number }) => {
    if (type === "class") {
      setPreparedSelectedClassIds(
        book.selectedClassIds.filter((x) => x !== id),
      );
    } else {
      setPreparedSelectedDomainIds(
        book.selectedDomainIds.filter((x) => x !== id),
      );
    }
  };

  const selectedClasses = useMemo(() => {
    return selectedClassIds.map((id) => ({
      type: "class",
      id,
      name: metaNameWithEn("classes", classById.get(id)),
    })) satisfies ClassOption[];
  }, [selectedClassIds, metaNameWithEn]);

  const selectedDomains = useMemo(() => {
    return selectedDomainIds.map((id) => ({
      type: "domain",
      id,
      name: metaNameWithEn("domains", domainById.get(id)),
    })) satisfies DomainOption[];
  }, [selectedDomainIds, metaNameWithEn]);

  const spellIds = useMemo(() => dedupeIds(book.entries), [book.entries]);
  const batchQuery = useQuery({
    queryKey: [
      "prepared-batch",
      { bookId: book.id, ids: spellIds.join(","), ...queryKey },
    ],
    queryFn: ({ signal }) => getSpellsBatch(spellIds, signal),
    enabled: spellIds.length > 0,
  });

  const spells = batchQuery.data?.items ?? [];
  const byId = useMemo(() => new Map(spells.map((s) => [s.id, s])), [spells]);

  const columns = useMemo(() => {
    const cols: PreparedEntry[][] = Array.from({ length: 10 }, () => []);
    for (const e of book.entries) {
      const sp = byId.get(e.spellId);
      const lvl = sp
        ? getLowestLevel(sp, selectedClassIds, selectedDomainIds)
        : 0;
      cols[lvl].push(e);
    }
    return cols;
  }, [book.entries, byId, selectedClassIds, selectedDomainIds]);

  const candidates = useMemo((): Candidate[] => {
    const selectedClassSet = new Set(selectedClassIds);
    const selectedDomainSet = new Set(selectedDomainIds);

    // key: `${type}:${id}` -> count
    const counts = new Map<string, number>();

    const inc = (type: OptionType, id: number) => {
      const key = `${type}:${id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };

    for (const e of book.entries) {
      const sp = byId.get(e.spellId);
      if (!sp) continue;

      const cls = sp.classLevels ?? [];
      const dms = sp.domainLevels ?? [];

      // skip spells that already match ANY selected class OR domain
      const hasSelectedClass = cls.some((cl) => selectedClassSet.has(cl.id));
      const hasSelectedDomain = dms.some((dl) => selectedDomainSet.has(dl.id));
      if (hasSelectedClass || hasSelectedDomain) continue;

      // count class ids
      for (const cl of cls) {
        const id = cl.id; // do not change cl.id
        if (!classById.has(id)) continue;
        if (selectedClassSet.has(id)) continue;
        inc("class", id);
      }

      // count domain ids
      for (const dl of dms) {
        const id = dl.id; // keep dl.id (same pattern)
        if (!domainById.has(id)) continue;
        if (selectedDomainSet.has(id)) continue;
        inc("domain", id);
      }
    }

    const out: Candidate[] = Array.from(counts.entries()).map(
      ([key, count]) => {
        const [type, idStr] = key.split(":") as [OptionType, string];
        const id = Number(idStr);

        const name =
          type === "class"
            ? metaNameWithEn("classes", classById.get(id))
            : metaNameWithEn("domains", domainById.get(id));

        return {
          type,
          id,
          count,
          name: name || `${type === "class" ? "Class" : "Domain"} #${id}`,
        };
      },
    );

    out.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const cmp = (a.name ?? "").localeCompare(b.name ?? "");
      if (cmp !== 0) return cmp;
      // keep stable ordering between types if names tie
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id - b.id;
    });

    return out;
  }, [
    book.entries,
    byId,
    selectedClassIds,
    selectedDomainIds,
    classById,
    domainById,
    metaNameWithEn,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {book.entries.length} prepared slot(s)
        </div>

        <div className="flex items-center gap-3">
          <BulkPasteDialog />

          <ToggleGroup
            size="sm"
            type="single"
            variant="outline"
            value={mode}
            onValueChange={(v) => {
              if (!v) return;
              setMode(v as ViewMode);
            }}
          >
            <ToggleGroupItem value="normal" aria-label="Toggle normal mode">
              Normal
            </ToggleGroupItem>
            <ToggleGroupItem value="edit" aria-label="Toggle edit mode">
              Edit
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resetPreparedUsed()}
            disabled={book.entries.length === 0}
          >
            Reset used
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => clearPrepared()}
            disabled={book.entries.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="flex gap-3">
        <PreparedClassAndDomainSidebar
          selectedClasses={selectedClasses}
          selectedDomains={selectedDomains}
          candidates={candidates}
          onAdd={onAddSelected}
          onRemove={onRemoveSelected}
        />
        <div className="min-w-0 flex-1">
          {book.entries.length === 0 && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Empty.
            </div>
          )}
          {book.entries.length > 0 && (
            <>
              {batchQuery.isLoading && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Loading spells…
                </div>
              )}

              {batchQuery.isError && (
                <div className="rounded-md border p-3">
                  <div className="font-medium">Some spells failed to load</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Please try again later.
                  </div>
                </div>
              )}
              <PreparedTable columns={columns} byId={byId} mode={mode} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
