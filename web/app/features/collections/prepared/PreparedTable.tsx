import type { SpellItemView } from "@dnd/contracts";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "~/components/ui/card";
import type { PreparedEntry } from "~/storage/collections.type";
import { PreparedTableCell, PreparedTableEmptyCell } from "./PreparedTableCell";

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
  const rowHeightClass = "h-7";
  const cellWidthClass = "min-w-48";

  return (
    <div className="overflow-x-auto pb-2">
      <Card className="gap-0 py-0 shadow-none w-max">
        <CardContent className="px-0 py-0">
          <div className="inline-flex flex-col divide-y">
            {Array.from({ length: 10 }, (_, level) => (
              <div
                key={level}
                className={["flex w-max", rowHeightClass].join(" ")}
              >
                <div
                  className={[
                    "flex w-30 shrink-0 items-center justify-center border-r bg-muted/40 px-2 text-center text-xs font-medium",
                    rowHeightClass,
                  ].join(" ")}
                >
                  {t("Level {{level}} - {{count}} slot(s)", {
                    level,
                    count: columns[level]?.length ?? 0,
                  })}
                </div>

                <>
                  {(columns[level]?.length ?? 0) === 0 ? (
                    <div className={[cellWidthClass, rowHeightClass].join(" ")}>
                      <PreparedTableEmptyCell label={t("Empty")} />
                    </div>
                  ) : (
                    <div className="flex min-w-max divide-x divide-y overflow-y-hidden box-content">
                      {columns[level]!.map((entry) => {
                        const spell = byId.get(entry.spellId);
                        if (!spell) return null;

                        return (
                          <div
                            key={entry.entryId}
                            className={[cellWidthClass, rowHeightClass].join(
                              " ",
                            )}
                          >
                            <PreparedTableCell
                              bookId={bookId}
                              entry={entry}
                              spell={spell}
                              mode={mode}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
