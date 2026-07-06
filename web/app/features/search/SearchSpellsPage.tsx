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
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { AdvancedSpellFiltersPanel } from "~/features/spells/AdvancedSpellFiltersPanel";
import { SpellCardDetailToggle } from "~/features/spells/SpellCardDetailToggle";
import { SpellFilterScopeSummary } from "~/features/spells/SpellFilterScopeSummary";
import {
  countComponentFilters,
  countMechanicFilters,
  countTaxonomyFilters,
} from "~/features/spells/taxonomy-filter-state";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useUserPrefs } from "~/state/user-prefs-state";
import { useTranslation } from "react-i18next";
import { ClassAndDomainSelector } from "../browse/ClassAndDomainSelector";
import { LevelSelector } from "../browse/LevelSelector";
import { isSearchQueryValid } from "./validation";
import { PAGE_SIZE } from "../constants";
import {
  buildSearchParams,
  hasSearchScope,
  parseSearchScope,
} from "./search-url";

export default function SearchSpellsPage() {
  const { state } = useUserPrefs();
  const { spellCardDetails, setSpellCardDetails } = useDisplayPrefs();
  const rulebookIds = state.selectedRulebookIds;
  const { queryKey } = useAppI18n();
  const { t } = useTranslation("spell-search");
  const [params, setParams] = useSearchParams();

  const { lang } = useAppI18n();
  const searchScope = useMemo(() => parseSearchScope(params), [params]);
  const qParam = searchScope.q;
  const isValid = isSearchQueryValid(qParam, lang);
  const hasScopedSearch = hasSearchScope(searchScope);

  function updateSearchScope(
    patch: Partial<
      Pick<typeof searchScope, "classIds" | "domainIds" | "filters" | "level">
    >,
  ) {
    const next = buildSearchParams({
      ...searchScope,
      ...patch,
      page: null,
    });
    setParams(next);
  }

  function clearSearchScope() {
    setParams(buildSearchParams({ q: qParam }));
  }

  const query = useQuery({
    queryKey: [
      "search",
      {
        q: qParam,
        rulebookIds,
        classIds: searchScope.classIds,
        domainIds: searchScope.domainIds,
        filters: searchScope.filters,
        level: searchScope.level,
        page: searchScope.page,
        pageSize: PAGE_SIZE,
        ...queryKey,
      },
    ],
    enabled: isValid.ok, // enforce backend contract
    queryFn: ({ signal }) =>
      searchSpellsByName({
        q: qParam,
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        classIds: searchScope.classIds.length
          ? searchScope.classIds
          : undefined,
        domainIds: searchScope.domainIds.length
          ? searchScope.domainIds
          : undefined,
        level: searchScope.level,
        filters: searchScope.filters,
        page: searchScope.page,
        pageSize: PAGE_SIZE,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const errorMessage = useMemo(() => {
    const err = query.error;
    if (!err) return null;
    if (err instanceof ApiError) return err.message;
    return t("errors.request-failed");
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
    <div className="page-side">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="gap-0 self-start">
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-2">
              {hasScopedSearch ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearSearchScope}
                >
                  {t("actions.clear-filters")}
                </Button>
              ) : (
                <Button type="button" variant="ghost" disabled>
                  {t("actions.clear-filters")}
                </Button>
              )}
            </div>

            <Separator />

            <SpellCardDetailToggle
              mode={spellCardDetails}
              onModeChange={setSpellCardDetails}
              label={t("options.show-card-details")}
            />

            <Separator />

            <ClassAndDomainSelector
              classIds={searchScope.classIds}
              domainIds={searchScope.domainIds}
              onChangeClasses={(classIds) => updateSearchScope({ classIds })}
              onChangeDomains={(domainIds) => updateSearchScope({ domainIds })}
            />

            <Separator />

            <LevelSelector
              value={searchScope.level}
              onChange={(level) => updateSearchScope({ level })}
              allowAnyLevel
              showAllLevels={false}
            />

            <Separator />

            <AdvancedSpellFiltersPanel
              value={searchScope.filters}
              onApply={(filters) => updateSearchScope({ filters })}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <SpellFilterScopeSummary
            classCount={searchScope.classIds.length}
            domainCount={searchScope.domainIds.length}
            level={searchScope.level}
            rulebookCount={rulebookIds.length}
            taxonomyFilterCount={countTaxonomyFilters(searchScope.filters)}
            componentFilterCount={countComponentFilters(searchScope.filters)}
            mechanicFilterCount={countMechanicFilters(searchScope.filters)}
            nullLevelMode="any"
          />

          {!isValid.ok && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-2">
                <CardDescription>
                  {lang === "zh"
                    ? t("errors.too-short-cjk")
                    : t("errors.too-short")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isValid.ok && (
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
                      {t("results.empty", { query: qParam })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {items.length > 0 && (
                <Card className="gap-0 overflow-hidden py-0">
                  <CardContent className="space-y-0 px-0 py-0">
                    <div className="px-3 py-2.5 sm:px-6">
                      <Pager
                        page={searchScope.page}
                        pageSize={pageSize}
                        total={total}
                        isBusy={query.isFetching}
                        onPageChange={goToPage}
                      />
                    </div>

                    <Separator className="my-0" />

                    <div className="divide-y">
                      {items.map((sp) => (
                        <SpellCard
                          key={sp.id}
                          spell={sp}
                          showActions={spellCardDetails === "full"}
                        />
                      ))}
                    </div>

                    <Separator className="my-0" />

                    <div className="px-3 py-2.5 sm:px-6">
                      <Pager
                        page={searchScope.page}
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
      </div>
    </div>
  );
}
