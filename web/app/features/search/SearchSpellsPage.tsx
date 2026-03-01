import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { ApiError } from "~/api/http";
import { searchSpellsByName } from "~/api/spells";
import Pager from "~/components/Pager";
import { SpellCard } from "~/components/SpellCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { useAppI18n } from "~/i18n/useAppI18n";
import { useUserPrefs } from "~/state/user-prefs-state";
import { useTranslation } from "react-i18next";
import { isSearchQueryValid } from "./validation";
import { PAGE_SIZE } from "../constants";

export default function SearchSpellsPage() {
  const { state } = useUserPrefs();
  const rulebookIds = state.selectedRulebookIds;
  const { queryKey } = useAppI18n();
  const { t } = useTranslation("spell-search");
  const [params, setParams] = useSearchParams();

  const { lang } = useAppI18n();
  const qParam = (params.get("q") ?? "").trim();
  const isValid = isSearchQueryValid(qParam, lang);

  // page is kept in URL (nice for sharing/back button)
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const query = useQuery({
    queryKey: [
      "search",
      { q: qParam, rulebookIds, page, pageSize: PAGE_SIZE, ...queryKey },
    ],
    enabled: isValid.ok, // enforce backend contract
    queryFn: ({ signal }) =>
      searchSpellsByName({
        q: qParam,
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        page,
        pageSize: PAGE_SIZE,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const errorMessage = useMemo(() => {
    const err = query.error;
    if (!err) return null;
    if (err instanceof ApiError) return err.message;
    return t("Request failed. Please try again.");
  }, [query.error, t]);

  const data = query.data;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const pageSize = data?.pageSize ?? PAGE_SIZE;

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="space-y-1 px-1">
        <div className="text-sm text-muted-foreground">
          {t("Global name search. Browsing by class/level lives in Browse.")}
        </div>
        {rulebookIds.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {t("Rulebook filter is active (from Settings).")}
          </div>
        )}
      </div>

      {!isValid && (
        <Card className="gap-0">
          <CardHeader className="gap-1 py-2">
            <CardDescription>
              {lang === "zh"
                ? t("Enter at least 2 characters, or type a Chinese character.")
                : t("Enter at least 2 characters to run a search.")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isValid && (
        <div className="space-y-3">
          {errorMessage && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-2">
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {!errorMessage && !query.isLoading && items.length === 0 && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-2">
                <CardDescription>
                  {t('No spells matched "{{query}}".', { query: qParam })}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {items.length > 0 && (
            <Card className="gap-0 overflow-hidden py-2">
              <CardContent className="space-y-3 px-0 py-1">
                <div className="px-6">
                  <Pager
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    isBusy={query.isFetching}
                    onPageChange={goToPage}
                  />
                </div>

                <Separator />

                <div className="divide-y">
                  {items.map((sp) => (
                    <SpellCard key={sp.id} spell={sp} showActions />
                  ))}
                </div>

                <Separator />

                <div className="px-6">
                  <Pager
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    isBusy={query.isFetching}
                    onPageChange={goToPage}
                    showRangeText={false}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
