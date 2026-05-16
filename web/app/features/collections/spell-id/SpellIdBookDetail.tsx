import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getSpellsBatch } from "~/api/spells";
import { SpellCard } from "~/components/SpellCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
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
    <div className="space-y-3">
      <div className="px-1 text-sm text-muted-foreground">
        {t("{{count}} spell(s)", { count: ids.length })}
      </div>

      {ids.length === 0 && (
        <Card className="gap-0">
          <CardHeader className="gap-1 py-2">
            <CardDescription>{t("Empty.")}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {ids.length > 0 && (
        <>
          {isLoading && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-2">
                <CardDescription>{t("Loading spells...")}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {hasError && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-3">
                <CardTitle className="text-base">
                  {t("Some spells failed to load")}
                </CardTitle>
                <CardDescription>{t("Please try again later.")}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {missingIds.length > 0 && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-2">
                <CardDescription>
                  {t("Some spells are missing (deleted or unavailable): {{ids}}", {
                    ids: missingIds.join(", "),
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {spells.length > 0 && (
            <Card className="gap-0 overflow-hidden py-0">
              <CardContent className="divide-y px-0 py-0">
                {spells.map((sp) => (
                  <SpellCard key={sp.id} spell={sp} showActions />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
