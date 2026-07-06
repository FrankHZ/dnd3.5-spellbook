import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ApiError } from "~/api/http";
import { getSpellsByLevel } from "~/api/spells";
import Pager from "~/components/Pager";
import { SpellCard } from "~/components/SpellCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { AdvancedSpellFiltersPanel } from "~/features/spells/AdvancedSpellFiltersPanel";
import { FilterSidebarCard } from "~/features/spells/FilterSidebarCard";
import { SpellFilterScopeSummary } from "~/features/spells/SpellFilterScopeSummary";
import {
  countComponentFilters,
  countMechanicFilters,
  countTaxonomyFilters,
} from "~/features/spells/taxonomy-filter-state";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";

import { PAGE_SIZE } from "../constants";
import { BrowseOptionsToggle } from "./BrowseOptionsToggle";
import { ClassAndDomainSelector } from "./ClassAndDomainSelector";
import { LevelSelector } from "./LevelSelector";
import { useBrowsePrefs } from "./useBrowsePref";
import { useBrowseQueryState } from "./useBrowseQueryState";

export default function BrowsePage() {
  const { queryKey } = useAppI18n();
  const { t } = useTranslation("spell-browse");

  const {
    level,
    classIds,
    domainIds,
    filters,
    page,
    rulebookIds,
    setLevel,
    setClassIds,
    setDomainIds,
    setNormalizedFilters,
    setPage,
    hasValidSelection,
  } = useBrowseQueryState();

  const { spellCardDetails, setSpellCardDetails } = useDisplayPrefs();
  const { groupMode, setGroupMode } = useBrowsePrefs();
  const pageSize = PAGE_SIZE;

  const browseQuery = useQuery({
    queryKey: [
      "browse",
      {
        classIds,
        domainIds,
        filters,
        level,
        rulebookIds: rulebookIds.join(","),
        page,
        pageSize,
        ...queryKey,
      },
    ],
    enabled: hasValidSelection,
    queryFn: ({ signal }) =>
      getSpellsByLevel({
        classIds,
        domainIds,
        level: level!,
        rulebookIds: rulebookIds.length ? rulebookIds : undefined,
        filters,
        page,
        pageSize,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const validationMessages: string[] = [];
  if (classIds.length === 0 && domainIds.length === 0) {
    validationMessages.push(t("validation.select-class-or-domain"));
  }
  if (level === null) {
    validationMessages.push(t("validation.select-level"));
  }

  const errorMessage = useMemo(() => {
    const err = browseQuery.error;
    if (!err) return null;
    if (err instanceof ApiError) return err.message;
    return t("errors.request-failed");
  }, [browseQuery.error, t]);

  const total = browseQuery.data?.total ?? 0;
  const groups = browseQuery.data?.groups;
  const hasSpellData = groups?.flatMap((group) => group.items).length !== 0;

  return (
    <div className="page-side">
      <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
        <FilterSidebarCard>
          <BrowseOptionsToggle
            groupMode={groupMode}
            onGroupModeChange={setGroupMode}
            cardDetailMode={spellCardDetails}
            onCardDetailModeChange={setSpellCardDetails}
          />
          <Separator />
          <ClassAndDomainSelector
            classIds={classIds}
            domainIds={domainIds}
            onChangeClasses={setClassIds}
            onChangeDomains={setDomainIds}
          />
          <Separator />
          <LevelSelector value={level} onChange={setLevel} />
          <Separator />
          <AdvancedSpellFiltersPanel
            value={filters}
            onApply={setNormalizedFilters}
          />
        </FilterSidebarCard>

        <div className="space-y-3">
          <SpellFilterScopeSummary
            classCount={classIds.length}
            domainCount={domainIds.length}
            level={level}
            rulebookCount={rulebookIds.length}
            taxonomyFilterCount={countTaxonomyFilters(filters)}
            componentFilterCount={countComponentFilters(filters)}
            mechanicFilterCount={countMechanicFilters(filters)}
            nullLevelMode="required"
          />

          {!hasValidSelection && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-1">
                <CardDescription>
                  {t("validation.choose-scope-and-level")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {hasValidSelection && errorMessage && (
            <Card className="gap-0">
              <CardHeader className="gap-1 py-1">
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {hasValidSelection &&
            !errorMessage &&
            !browseQuery.isLoading &&
            !hasSpellData && (
              <Card className="gap-0">
                <CardHeader className="gap-1">
                  <CardDescription>
                    {t("results.empty-for-level", { level })}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          {hasValidSelection && hasSpellData && (
            <Card className="gap-0 overflow-hidden py-0">
              <CardContent className="space-y-0 px-0 py-0">
                <div className="px-3 py-2.5 sm:px-6">
                  <Pager
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                  />
                </div>

                <Separator className="my-0" />

                <div className="divide-y">
                  {groupMode === "grouped"
                    ? groups?.map((group) => (
                        <div key={group.level} className="divide-y">
                          <div className="bg-muted/30 px-3 py-2 text-center text-sm font-medium tracking-wide">
                            {t("level.value", {
                              ns: "spell-browse",
                              level: group.level,
                            })}
                          </div>

                          {group.items.map((spell) => (
                            <SpellCard
                              key={`${group.level}-${spell.id}`}
                              spell={spell}
                              showActions={spellCardDetails === "full"}
                            />
                          ))}
                        </div>
                      ))
                    : groups
                        ?.flatMap((group) => group.items)
                        .map((spell) => (
                          <SpellCard
                            key={spell.id}
                            spell={spell}
                            showActions={spellCardDetails === "full"}
                          />
                        ))}
                </div>

                <Separator className="my-0" />

                <div className="px-3 py-2.5 sm:px-6">
                  <Pager
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    showRangeText={false}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
