import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getSpellsBatch } from "~/api/spells";
import { Separator } from "~/components/ui/separator";
import { SpellCard } from "~/components/SpellCard";
import { useAppI18n } from "~/i18n/useAppI18n";

import type { SpellIdBook } from "~/storage/collections.type";

export function SpellIdBookDetail({ book }: { book: SpellIdBook }) {
  const { t } = useTranslation("collections");
  const { queryKey } = useAppI18n();
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
    <>
      <div className="text-sm text-muted-foreground">
        {t("{{count}} spell(s)", { count: ids.length })}
      </div>

      <Separator />

      {ids.length === 0 && (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          {t("Empty.")}
        </div>
      )}

      {ids.length > 0 && (
        <>
          {isLoading && (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              {t("Loading spells...")}
            </div>
          )}

          {hasError && (
            <div className="rounded-md border p-3">
              <div className="font-medium">{t("Some spells failed to load")}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {t("Please try again later.")}
              </div>
            </div>
          )}

          {missingIds.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              {t("Some spells are missing (deleted or unavailable): {{ids}}", {
                ids: missingIds.join(", "),
              })}
            </div>
          )}

          <div className="divide-y rounded-md border">
            {spells.map((sp) => (
              <SpellCard key={sp.id} spell={sp} showActions={true} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
