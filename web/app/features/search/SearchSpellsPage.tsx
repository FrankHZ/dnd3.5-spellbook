import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { ApiError } from "~/api/http";
import { searchSpellsByName } from "~/api/spells";
import { usePersistedState } from "~/state/persisted-state";

import Pager from "~/components/Pager";
import { SpellCard } from "~/components/SpellCard";
import { Separator } from "~/components/ui/separator";
import { useAppI18n } from "~/i18n/useAppI18n";
import { useTranslation } from "react-i18next";
import { isSearchQueryValid } from "./validation";
import { PAGE_SIZE } from "../constants";

export default function SearchSpellsPage() {
  const { state } = usePersistedState();
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
    return "Request failed. Please try again.";
  }, [query.error]);

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
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Search</h1>
        <div className="text-sm text-muted-foreground">
          {t("Global name search. Browsing by class/level lives in Browse.")}
        </div>
        {rulebookIds.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {t("Rulebook filter is active (from Settings).")}
          </div>
        )}
      </div>

      {!isValid && (
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">
            {lang === "zh"
              ? t("Enter at least 2 characters, or type a Chinese character.")
              : t("Enter at least 2 characters to run a search.")}
          </div>
        </div>
      )}

      {isValid && (
        <div className="space-y-3">
          <Pager
            page={page}
            pageSize={pageSize}
            total={total}
            isBusy={query.isFetching}
            onPageChange={goToPage}
          />

          <Separator />

          {errorMessage && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Couldn’t load results</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {errorMessage}
              </div>
            </div>
          )}

          {!errorMessage && !query.isLoading && items.length === 0 && (
            <div className="rounded-md border p-3">
              <div className="font-medium">No matches</div>
              <div className="mt-1 text-sm text-muted-foreground">
                No spells matched “{qParam}”.
              </div>
            </div>
          )}

          <div className="divide-y rounded-md border">
            {items.map((sp) => (
              <SpellCard key={sp.id} spell={sp} showActions />
            ))}
          </div>

          <Pager
            page={page}
            pageSize={pageSize}
            total={total}
            isBusy={query.isFetching}
            onPageChange={goToPage}
            showRangeText={false}
          />
        </div>
      )}
    </div>
  );
}
