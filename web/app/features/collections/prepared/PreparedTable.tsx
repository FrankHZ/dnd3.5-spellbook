import type { SpellItemView } from "@dnd/contracts";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PreparedEntry } from "~/storage/collections.type";
import { DEFAULT_PREPARED_ROW_MIN_HEIGHT } from "./prepared-layout";
import { PreparedTableCell, PreparedTableEmptyCell } from "./PreparedTableCell";

export type PreparedViewMode = "normal" | "edit";

export function PreparedTable({
  bookId,
  columns,
  byId,
  mode,
  rowMinHeight = DEFAULT_PREPARED_ROW_MIN_HEIGHT,
}: {
  bookId: string;
  columns: PreparedEntry[][];
  byId: Map<number, SpellItemView>;
  mode: PreparedViewMode;
  rowMinHeight?: string;
}) {
  const { t } = useTranslation("collections");

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 10 }, (_, level) => {
        const resolvedEntries = (columns[level] ?? []).flatMap((entry) => {
          const spell = byId.get(entry.spellId);
          return spell ? [{ entry, spell }] : [];
        });

        return (
          <Card key={level} className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b bg-muted/20 px-4 py-3 [.border-b]:pb-2">
              <CardTitle className="flex items-center justify-between gap-3 text-sm font-semibold">
                {t("prepared.level.title", { level })}
                <span className="text-xs font-medium text-muted-foreground">
                  {t("prepared.table.slot-count", {
                    count: resolvedEntries.length,
                  })}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="px-0 py-0">
              {resolvedEntries.length === 0 ? (
                <PreparedTableEmptyCell
                  label={t("common.empty")}
                  rowMinHeight={rowMinHeight}
                />
              ) : (
                <div className="divide-y">
                  {resolvedEntries.map(({ entry, spell }) => (
                    <div key={entry.entryId}>
                      <PreparedTableCell
                        bookId={bookId}
                        entry={entry}
                        spell={spell}
                        mode={mode}
                        rowMinHeight={rowMinHeight}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
