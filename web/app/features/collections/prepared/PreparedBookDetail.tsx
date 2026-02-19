import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";

import { getSpellsBatch } from "~/api/spells";
import { useAppI18n } from "~/i18n/useAppI18n";
import { useCollections } from "~/state/collections-state";
import type { PreparedBook } from "~/storage/collections.type";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { BulkPasteDialog } from "./BulkPasteDialog";
import { PreparedCopyDialog } from "./PreparedCopyDialog";
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
import {
  buildPreparedColumns,
  getPreparedSpellIds,
} from "./prepared-derivation";
import { buildSimplePreparedTsv } from "./prepared-copy";

type ViewMode = "normal" | "edit";

export function PreparedBookDetail({ book }: { book: PreparedBook }) {
  const { queryKey, name } = useAppI18n();
  const { preparedBook } = useCollections();
  const [mode, setMode] = useState<ViewMode>("normal");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const { metaNameWithEn } = useMetaNames();
  const { classById, domainById } = useBootstrap();
  const { selectedClassIds, selectedDomainIds } = preparedBook.getPrefs(
    book.id,
  );

  const onAddSelected = ({ type, id }: { type: OptionType; id: number }) => {
    if (type === "class") {
      if (!selectedClassIds.includes(id)) {
        preparedBook.setSelectedClassIds(book.id, [...selectedClassIds, id]);
      }
    } else {
      if (!selectedDomainIds.includes(id)) {
        preparedBook.setSelectedDomainIds(book.id, [...selectedDomainIds, id]);
      }
    }
  };

  const onRemoveSelected = ({ type, id }: { type: OptionType; id: number }) => {
    if (type === "class") {
      preparedBook.setSelectedClassIds(
        book.id,
        selectedClassIds.filter((x) => x !== id),
      );
    } else {
      preparedBook.setSelectedDomainIds(
        book.id,
        selectedDomainIds.filter((x) => x !== id),
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

  const spellIds = useMemo(
    () => getPreparedSpellIds(book.entries),
    [book.entries],
  );
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

  const columns = useMemo(
    () =>
      buildPreparedColumns({
        entries: book.entries,
        spellsById: byId,
        selectedClassIds,
        selectedDomainIds,
      }),
    [book.entries, byId, selectedClassIds, selectedDomainIds],
  );

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

  const onCopySimple = async () => {
    try {
      const tsv = buildSimplePreparedTsv({
        columns,
        byId,
        getVisibleName: name,
      });
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(tsv);
      const lines = tsv.length === 0 ? 0 : tsv.split("\n").length;
      setCopyStatus(`Copied ${lines} row(s) as simple TSV.`);
    } catch {
      setCopyStatus("Copy failed. Browser clipboard permission may be blocked.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {book.entries.length} prepared slot(s)
        </div>

        <div className="flex items-center gap-3">
          <BulkPasteDialog bookId={book.id} />
          <ButtonGroup>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onCopySimple}
              disabled={book.entries.length === 0}
              title="Copy Table"
              aria-label="Copy table"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <PreparedCopyDialog
              entries={book.entries}
              columns={columns}
              byId={byId}
              selectedClassIds={selectedClassIds}
              selectedDomainIds={selectedDomainIds}
              getVisibleName={name}
            />
          </ButtonGroup>
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
            onClick={() => preparedBook.resetUsed(book.id)}
            disabled={book.entries.length === 0}
          >
            Reset used
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => preparedBook.clear(book.id)}
            disabled={book.entries.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>
      {copyStatus && (
        <div className="rounded-md border px-3 py-2 text-sm">{copyStatus}</div>
      )}
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
              <PreparedTable
                bookId={book.id}
                columns={columns}
                byId={byId}
                mode={mode}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
