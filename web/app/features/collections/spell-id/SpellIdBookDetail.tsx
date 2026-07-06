import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getSpellsBatch } from "~/api/spells";
import { SpellCard } from "~/components/SpellCard";
import { StatusCard } from "~/components/StatusCard";
import { Card, CardContent } from "~/components/ui/card";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import type { SpellIdBook } from "~/storage/collections.type";

export function SpellIdBookDetail({ book }: { book: SpellIdBook }) {
  const { t } = useTranslation("collections");
  const { queryKey } = useAppI18n();
  const { spellCardDetails } = useDisplayPrefs();
  const ids = book.spellIds;

  const batchQuery = useQuery({
    queryKey: [
      "spellbook-batch",
      { bookId: book.id, ids: ids.join(","), ...queryKey },
    ],
    queryFn: ({ signal }) => getSpellsBatch(ids, signal),
    enabled: ids.length > 0,
  });

  const isLoading = batchQuery.isLoading;
  const hasError = batchQuery.isError;

  const spells = batchQuery.data?.items ?? [];
  const missingIds = batchQuery.data?.missingIds ?? [];

  return (
    <div className="space-y-3">
      <div className="px-1 text-sm text-muted-foreground">
        {t("spell-id.spell-count", { count: ids.length })}
      </div>

      {ids.length === 0 && (
        <StatusCard description={t("common.empty-sentence")} />
      )}

      {ids.length > 0 && (
        <>
          {isLoading && (
            <StatusCard description={t("spells.loading")} />
          )}

          {hasError && (
            <StatusCard
              title={t("spells.load-failed")}
              description={t("errors.try-again-later")}
            />
          )}

          {missingIds.length > 0 && (
            <StatusCard
              description={t("spells.missing-ids", {
                ids: missingIds.join(", "),
              })}
            />
          )}

          {spells.length > 0 && (
            <Card className="gap-0 overflow-hidden py-0">
              <CardContent className="divide-y px-0 py-0">
                {spells.map((sp) => (
                  <SpellCard
                    key={sp.id}
                    spell={sp}
                    showActions={spellCardDetails === "full"}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
