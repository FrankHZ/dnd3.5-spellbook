import type { SpellItemView } from "@dnd/contracts";
import { useTranslation } from "react-i18next";
import type { PreparedEntry } from "~/storage/collections.type";
import { PreparedTableCell } from "./PreparedTableCell";

export type PreparedViewMode = "normal" | "edit";

export function PreparedTable({
  bookId,
  columns,
  byId,
  mode,
}: {
  bookId: string;
  columns: PreparedEntry[][];
  byId: Map<number, SpellItemView>;
  mode: PreparedViewMode;
}) {
  const { t } = useTranslation("collections");

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-450 rounded-md border overflow-hidden min-h-110 flex flex-col">
        <div className="grid grid-cols-10 flex-1">
          {Array.from({ length: 10 }, (_, level) => (
            <div key={level} className="h-full flex flex-col border-r">
              <div className="h-8 bg-muted flex items-center justify-center text-sm font-medium border-b">
                {t("Level {{level}} - {{count}} slot(s)", {
                  level,
                  count: columns[level]?.length ?? 0,
                })}
              </div>

              <div className="flex-1 flex flex-col h-full">
                {(columns[level]?.length ?? 0) === 0 ? (
                  <div className="border-b">
                    <div className="gap-2 px-3 h-10 flex items-center justify-center text-sm text-muted-foreground">
                      {t("Empty")}
                    </div>
                  </div>
                ) : (
                  columns[level]!.map((e) => {
                    const sp = byId.get(e.spellId);
                    if (!sp) return null;
                    return (
                      <div key={e.entryId} className="border-b">
                        <PreparedTableCell
                          bookId={bookId}
                          entry={e}
                          spell={sp}
                          mode={mode}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
