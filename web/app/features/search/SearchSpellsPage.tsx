import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { ApiError, hasApiErrorCode } from "~/api/http";
import { searchSpells } from "~/api/spells";
import Pager from "~/components/Pager";
import { SpellCard } from "~/components/SpellCard";
import { StatusCard } from "~/components/StatusCard";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { AdvancedSpellFiltersPanel } from "~/features/spells/AdvancedSpellFiltersPanel";
import { FilterSidebarCard } from "~/features/spells/FilterSidebarCard";
import { SpellCardDetailToggle } from "~/features/spells/SpellCardDetailToggle";
import { SpellFilterScopeSummary } from "~/features/spells/SpellFilterScopeSummary";
import { getCurrentQueryResult } from "~/features/spells/query-result-state";
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
  buildSearchPageUrl,
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
  const isValid = isSearchQueryValid(qParam, lang, searchScope.mode);
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
    setParams(buildSearchParams({ mode: searchScope.mode, q: qParam }));
  }

  function updateSearchMode(mode: typeof searchScope.mode) {
    setParams(
      buildSearchParams({
        ...searchScope,
        mode,
        page: null,
      }),
    );
  }

  const query = useQuery({
    queryKey: [
      "search",
      {
        mode: searchScope.mode,
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
      searchSpells({
        mode: searchScope.mode,
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
    if (hasApiErrorCode(err, "FULL_TEXT_SEARCH_UNAVAILABLE")) return null;
    if (err instanceof ApiError) return err.message;
    return t("errors.request-failed");
  }, [query.error, t]);
  const isFullTextUnavailable = hasApiErrorCode(
    query.error,
    "FULL_TEXT_SEARCH_UNAVAILABLE",
  );
  const hasDisplayError = isFullTextUnavailable || Boolean(errorMessage);

  const currentQuery = getCurrentQueryResult(query);
  const data = currentQuery.data;
  const isModeTransition = data != null && data.mode !== searchScope.mode;
  const total = data?.total ?? 0;
  const items = isModeTransition ? [] : (data?.items ?? []);
  const pageSize = data?.pageSize ?? PAGE_SIZE;

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  function getPageHref(nextPage: number) {
    return buildSearchPageUrl(searchScope, nextPage);
  }

  return (
    <div className="page-side">
      <div className="app-filter-layout">
        <FilterSidebarCard>
          <div className="grid gap-2">
            {hasScopedSearch ? (
              <Button type="button" variant="ghost" onClick={clearSearchScope}>
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
        </FilterSidebarCard>

        <div className="space-y-3">
          <div className="flex min-h-8 items-center justify-between gap-3 px-1">
            <span className="text-sm font-medium text-foreground">
              {t("mode.label")}
            </span>
            <ToggleGroup
              type="single"
              value={searchScope.mode}
              variant="outline"
              size="sm"
              aria-label={t("mode.label")}
              onValueChange={(value) => {
                if (value !== "name" && value !== "full") return;
                updateSearchMode(value);
              }}
            >
              <ToggleGroupItem value="name">
                {t("mode.name")}
              </ToggleGroupItem>
              <ToggleGroupItem value="full">
                {t("mode.full")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

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
            <StatusCard
              description={
                searchScope.mode === "full"
                  ? t("errors.full-text-too-short")
                  : lang === "zh"
                  ? t("errors.too-short-cjk")
                  : t("errors.too-short")
              }
            />
          )}

          {isValid.ok && (
            <div className="space-y-3">
              {isFullTextUnavailable && (
                <StatusCard
                  title={t("errors.full-text-unavailable-title")}
                  description={t("errors.full-text-unavailable")}
                  actions={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateSearchMode("name")}
                    >
                      {t("actions.use-name-search")}
                    </Button>
                  }
                />
              )}

              {errorMessage && (
                <StatusCard description={errorMessage} />
              )}

              {!hasDisplayError && currentQuery.isPending && (
                <StatusCard description={t("results.loading")} />
              )}

              {!hasDisplayError &&
                !currentQuery.isPending &&
                !query.isFetching &&
                items.length === 0 && (
                  <StatusCard
                    description={t("results.empty", { query: qParam })}
                  />
                )}

              {!hasDisplayError && items.length > 0 && (
                <Card className="gap-0 overflow-hidden py-0">
                  <CardContent className="space-y-0 px-0 py-0">
                    <div className="px-3 py-2.5 sm:px-6">
                      <Pager
                        page={searchScope.page}
                        pageSize={pageSize}
                        total={total}
                        isBusy={query.isFetching}
                        onPageChange={goToPage}
                        getPageHref={getPageHref}
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
                        getPageHref={getPageHref}
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
