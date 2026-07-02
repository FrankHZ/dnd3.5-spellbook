import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getSpellsBatch } from "~/api/spells";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useCollections } from "~/state/collections-state";
import type { PreparedBook } from "~/storage/collections.type";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { BulkPasteDialog } from "./BulkPasteDialog";
import { PreparedCopyDialog } from "./PreparedCopyDialog";
import { PreparedTable } from "./PreparedTable";
import { DEFAULT_PREPARED_ROW_MIN_HEIGHT } from "./prepared-layout";
import {
  PreparedClassAndDomainSidebar,
  type Candidate,
  type OptionType,
  type ClassOption,
  type DomainOption,
} from "./PreparedClassSidebar";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import {
  buildPreparedColumns,
  getPreparedSpellIds,
} from "./prepared-derivation";
import { buildSimplePreparedTsv } from "./prepared-copy";

type ViewMode = "normal" | "edit";

export function PreparedBookDetail({ book }: { book: PreparedBook }) {
  const { t } = useTranslation("collections");
  const { queryKey, name } = useAppI18n();
  const { preparedBook } = useCollections();
  const [mode, setMode] = useState<ViewMode>("normal");

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
  }, [selectedClassIds, metaNameWithEn, classById]);

  const selectedDomains = useMemo(() => {
    return selectedDomainIds.map((id) => ({
      type: "domain",
      id,
      name: metaNameWithEn("domains", domainById.get(id)),
    })) satisfies DomainOption[];
  }, [selectedDomainIds, metaNameWithEn, domainById]);

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

      const hasSelectedClass = cls.some((cl) => selectedClassSet.has(cl.id));
      const hasSelectedDomain = dms.some((dl) => selectedDomainSet.has(dl.id));
      if (hasSelectedClass || hasSelectedDomain) continue;

      for (const cl of cls) {
        const id = cl.id;
        if (!classById.has(id)) continue;
        if (selectedClassSet.has(id)) continue;
        inc("class", id);
      }

      for (const dl of dms) {
        const id = dl.id;
        if (!domainById.has(id)) continue;
        if (selectedDomainSet.has(id)) continue;
        inc("domain", id);
      }
    }

    const out: Candidate[] = Array.from(counts.entries()).map(
      ([key, count]) => {
        const [type, idStr] = key.split(":") as [OptionType, string];
        const id = Number(idStr);

        const display =
          type === "class"
            ? metaNameWithEn("classes", classById.get(id))
            : metaNameWithEn("domains", domainById.get(id));

        return {
          type,
          id,
          count,
          name:
            display || `${type === "class" ? t("Class") : t("Domain")} #${id}`,
        };
      },
    );

    out.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const cmp = (a.name ?? "").localeCompare(b.name ?? "");
      if (cmp !== 0) return cmp;
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
    t,
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
      toast.success(t("Copy table"), {
        description: t("Copied {{count}} row(s) as simple TSV.", {
          count: lines,
        }),
      });
    } catch {
      toast.error(t("Copy table"), {
        description: t(
          "Copy failed. Browser clipboard permission may be blocked.",
        ),
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="px-1 text-sm text-muted-foreground">
        {t("{{count}} prepared slot(s)", { count: book.entries.length })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <PreparedClassAndDomainSidebar
          selectedClasses={selectedClasses}
          selectedDomains={selectedDomains}
          candidates={candidates}
          onAdd={onAddSelected}
          onRemove={onRemoveSelected}
        />
        <div className="min-w-0 flex-1">
          <div className="sticky top-[var(--app-sticky-top-offset)] z-40 mb-3 flex justify-stretch sm:justify-end">
            <div className="w-full rounded-md border bg-background/90 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:w-fit sm:max-w-full">
              <div className="flex flex-wrap items-center gap-2">
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
                  <ToggleGroupItem
                    value="normal"
                    aria-label={t("Toggle normal mode")}
                  >
                    {t("Normal")}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="edit"
                    aria-label={t("Toggle edit mode")}
                  >
                    {t("Edit")}
                  </ToggleGroupItem>
                </ToggleGroup>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => preparedBook.resetUsed(book.id)}
                  disabled={book.entries.length === 0}
                >
                  {t("Reset used")}
                </Button>

                <ButtonGroup>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={onCopySimple}
                    disabled={book.entries.length === 0}
                    aria-label={t("Copy table")}
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
                <BulkPasteDialog bookId={book.id} />
              </div>
            </div>
          </div>

          {book.entries.length === 0 && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-2">
                <CardDescription>{t("Empty.")}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {book.entries.length > 0 && (
            <>
              {batchQuery.isLoading && (
                <Card className="gap-0">
                  <CardHeader className="gap-1 py-2">
                    <CardDescription>{t("Loading spells...")}</CardDescription>
                  </CardHeader>
                </Card>
              )}

              {batchQuery.isError && (
                <Card className="gap-0">
                  <CardHeader className="gap-1 py-3">
                    <CardTitle className="text-base">
                      {t("Some spells failed to load")}
                    </CardTitle>
                    <CardDescription>
                      {t("Please try again later.")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {!batchQuery.isLoading && !batchQuery.isError && (
                <PreparedTable
                  bookId={book.id}
                  columns={columns}
                  byId={byId}
                  mode={mode}
                  rowMinHeight={DEFAULT_PREPARED_ROW_MIN_HEIGHT}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
