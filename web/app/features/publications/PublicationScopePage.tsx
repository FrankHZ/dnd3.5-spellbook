import type {
  PublicationCategory,
  PublicationStats,
  Rulebook,
} from "@dnd/contracts";
import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBootstrap } from "~/bootstrap/useBootstrap";
import { PageHeader } from "~/components/PageHeader";
import { StatusCard } from "~/components/StatusCard";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getPublicationStats } from "~/api/publications";
import { PublicationCard } from "./PublicationCard";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { getRulebookDisplay } from "~/i18n/display/rulebook";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useMetaI18n } from "~/i18n/hooks/useMetaI18n";
import { cn } from "~/lib/utils";
import { DEFAULT_STATE } from "~/storage/userPrefs";
import { useUserPrefs } from "~/state/user-prefs-state";

import {
  groupRulebooksByPublication,
  type PublicationCategoryGroup,
  type PublicationSort,
} from "./publication-groups";
import { getPublicationQueryState } from "./publication-query-state";

function getCheckState(rulebooks: Rulebook[], selected: Set<number>) {
  const total = rulebooks.length;
  let count = 0;
  for (const rulebook of rulebooks) {
    if (selected.has(rulebook.id)) count++;
  }

  return {
    total,
    count,
    all: total > 0 && count === total,
    some: count > 0 && count < total,
  };
}

function matchesRulebookQuery(
  rulebook: Rulebook,
  displayName: string,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    rulebook.abbr,
    rulebook.displayAbbr,
    rulebook.name,
    rulebook.displayName,
    displayName,
    rulebook.publicationFamily,
    rulebook.publicationYear,
    rulebook.publicationDate,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle));
}

function usePublicationRulebooks() {
  const { lang } = useAppI18n();
  const meta = useMetaI18n();
  const { state } = useUserPrefs();
  const boot = useBootstrap(state.includePrestige);
  const rulebooks = boot.rulebooks.data?.items ?? [];

  const displayRulebook = useMemo(
    () => (rulebook: Rulebook) => getRulebookDisplay(meta, rulebook, lang),
    [lang, meta],
  );

  return {
    boot,
    rulebooks,
    displayRulebook,
  };
}

function CategoryLabel({ category }: { category: PublicationCategory }) {
  const { t } = useTranslation("publications");
  switch (category) {
    case "core":
      return <>{t("categories.core")}</>;
    case "supplement":
      return <>{t("categories.supplement")}</>;
    case "setting":
      return <>{t("categories.setting")}</>;
    case "magazine":
      return <>{t("categories.magazine")}</>;
    case "other":
      return <>{t("categories.other")}</>;
  }
}

type PublicationCardStats = {
  byBook: Map<number, PublicationStats>;
  pending: boolean;
  error: boolean;
};

function PublicationRulebookCard({
  rulebook,
  selected,
  onCheckedChange,
  stats,
}: {
  rulebook: Rulebook;
  selected: boolean;
  onCheckedChange: (id: number, checked: boolean) => void;
  stats: PublicationCardStats;
}) {
  const { lang } = useAppI18n();
  const displayPrefs = useDisplayPrefs();
  const meta = useMetaI18n();
  return (
    <PublicationCard
      rulebook={rulebook}
      displayName={getRulebookDisplay(meta, rulebook, lang).name}
      lang={lang}
      classNamesWithEnglish={
        displayPrefs.zhDisplay.classDomainLabelsWithEnglish
      }
      selected={selected}
      onCheckedChange={onCheckedChange}
      stats={stats.byBook.get(rulebook.id)}
      statsPending={stats.pending}
      statsError={stats.error}
    />
  );
}

function PublicationFamilyCard({
  category,
  family,
  selectedRulebookSet,
  onGroupCheckedChange,
  onRulebookCheckedChange,
  stats,
}: {
  category: PublicationCategory;
  family: PublicationCategoryGroup["families"][number];
  selectedRulebookSet: Set<number>;
  onGroupCheckedChange: (rulebooks: Rulebook[], checked: boolean) => void;
  onRulebookCheckedChange: (id: number, checked: boolean) => void;
  stats: PublicationCardStats;
}) {
  const st = getCheckState(family.rulebooks, selectedRulebookSet);
  const checkboxId = `publication-family-${category}-${family.key}`;

  return (
    <section className="border-t first:border-t-0">
      <div className="app-publication-family-header flex items-center justify-between gap-4 px-4 py-2.5">
        <Field orientation="horizontal" className="min-w-0">
          <Checkbox
            id={checkboxId}
            checked={st.all ? true : st.some ? "indeterminate" : false}
            onCheckedChange={(value) =>
              onGroupCheckedChange(family.rulebooks, Boolean(value))
            }
          />
          <FieldLabel
            htmlFor={checkboxId}
            className="min-w-0 select-text text-sm font-medium text-foreground"
          >
            <span className="truncate">{family.label}</span>
          </FieldLabel>
        </Field>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {st.count}/{st.total}
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <FieldGroup className="grid items-start gap-3 sm:grid-cols-2">
          {family.rulebooks.map((rulebook) => (
            <PublicationRulebookCard
              key={rulebook.id}
              rulebook={rulebook}
              selected={selectedRulebookSet.has(rulebook.id)}
              onCheckedChange={onRulebookCheckedChange}
              stats={stats}
            />
          ))}
        </FieldGroup>
      </div>
    </section>
  );
}

function PublicationCategorySection({
  group,
  selectedRulebookSet,
  onGroupCheckedChange,
  onRulebookCheckedChange,
  stats,
}: {
  group: PublicationCategoryGroup;
  selectedRulebookSet: Set<number>;
  onGroupCheckedChange: (rulebooks: Rulebook[], checked: boolean) => void;
  onRulebookCheckedChange: (id: number, checked: boolean) => void;
  stats: PublicationCardStats;
}) {
  const st = getCheckState(group.rulebooks, selectedRulebookSet);
  const checkboxId = `publication-category-${group.key}`;
  const hasMultipleFamilies = group.families.length > 1;

  return (
    <section className="app-publication-section overflow-hidden rounded-md border bg-card shadow-xs">
      <div className="app-publication-category-header flex items-center justify-between gap-4 px-4 py-2.5">
        <Field orientation="horizontal" className="min-w-0">
          <Checkbox
            id={checkboxId}
            checked={st.all ? true : st.some ? "indeterminate" : false}
            onCheckedChange={(value) =>
              onGroupCheckedChange(group.rulebooks, Boolean(value))
            }
          />
          <FieldLabel
            htmlFor={checkboxId}
            className="min-w-0 select-text text-base font-semibold text-foreground"
          >
            <CategoryLabel category={group.key} />
          </FieldLabel>
        </Field>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {st.count}/{st.total}
        </span>
      </div>

      {hasMultipleFamilies ? (
        <div>
          {group.families.map((family) => (
            <PublicationFamilyCard
              key={family.key}
              category={group.key}
              family={family}
              selectedRulebookSet={selectedRulebookSet}
              onGroupCheckedChange={onGroupCheckedChange}
              onRulebookCheckedChange={onRulebookCheckedChange}
              stats={stats}
            />
          ))}
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          <FieldGroup className="grid items-start gap-3 sm:grid-cols-2">
            {group.rulebooks.map((rulebook) => (
              <PublicationRulebookCard
                key={rulebook.id}
                rulebook={rulebook}
                selected={selectedRulebookSet.has(rulebook.id)}
                onCheckedChange={onRulebookCheckedChange}
                stats={stats}
              />
            ))}
          </FieldGroup>
        </div>
      )}
    </section>
  );
}

export default function PublicationScopePage() {
  const { t } = useTranslation("publications");
  const { state, setState } = useUserPrefs();
  const { boot, rulebooks, displayRulebook } = usePublicationRulebooks();
  const { queryKey } = useAppI18n();
  const statsQuery = useQuery({
    queryKey: ["publicationStats", queryKey],
    queryFn: ({ signal }) => getPublicationStats(signal),
  });
  const stats = useMemo<PublicationCardStats>(
    () => ({
      byBook: new Map(
        (statsQuery.data?.items ?? []).map((row) => [row.rulebookId, row]),
      ),
      pending: statsQuery.isPending,
      error: statsQuery.isError,
    }),
    [statsQuery.data, statsQuery.isPending, statsQuery.isError],
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PublicationSort>("date");
  const selectedRulebookSet = useMemo(
    () => new Set(state.selectedRulebookIds),
    [state.selectedRulebookIds],
  );

  const visibleRulebooks = useMemo(
    () =>
      rulebooks.filter((rulebook) =>
        matchesRulebookQuery(rulebook, displayRulebook(rulebook).name, query),
      ),
    [displayRulebook, query, rulebooks],
  );
  const groups = useMemo(
    () => groupRulebooksByPublication(visibleRulebooks, sort),
    [sort, visibleRulebooks],
  );
  const visibleState = getCheckState(visibleRulebooks, selectedRulebookSet);

  function setRulebookIds(ids: number[], checked: boolean) {
    setState((current) => {
      const next = new Set(current.selectedRulebookIds);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return {
        ...current,
        selectedRulebookIds: Array.from(next).sort((a, b) => a - b),
      };
    });
  }

  function setRulebookGroup(rulebooksToUpdate: Rulebook[], checked: boolean) {
    setRulebookIds(
      rulebooksToUpdate.map((rulebook) => rulebook.id),
      checked,
    );
  }

  function setOneRulebook(id: number, checked: boolean) {
    setRulebookIds([id], checked);
  }

  function resetDefaults() {
    setState((current) => ({
      ...current,
      selectedRulebookIds: DEFAULT_STATE.selectedRulebookIds,
    }));
  }

  const { isLoading, isError } = getPublicationQueryState(boot);

  return (
    <div className="page-single">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={
          <span className="text-sm tabular-nums text-muted-foreground">
            {t("summary.selected", {
              selected: state.selectedRulebookIds.length,
              total: rulebooks.length,
            })}
          </span>
        }
      />

      <div className="space-y-4">
        <section className="app-publication-controls space-y-2 rounded-md border bg-card p-3 shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("controls.search-placeholder")}
              aria-label={t("controls.search-label")}
            />
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as PublicationSort)}
            >
              <SelectTrigger
                aria-label={t("controls.sort-label")}
                className="w-full sm:w-44"
              >
                <ArrowUpDown className="size-4" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t("sort.date")}</SelectItem>
                <SelectItem value="abbr">{t("sort.abbr")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={visibleRulebooks.length === 0}
              onClick={() => setRulebookGroup(visibleRulebooks, true)}
            >
              {t("actions.select-visible")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={visibleRulebooks.length === 0}
              onClick={() => setRulebookGroup(visibleRulebooks, false)}
            >
              {t("actions.clear-visible")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetDefaults}
            >
              {t("actions.reset-defaults")}
            </Button>
            {query ? (
              <div
                className={cn(
                  "ml-auto text-sm tabular-nums text-muted-foreground",
                  visibleRulebooks.length === 0 && "text-destructive",
                )}
              >
                {t("summary.visible", {
                  selected: visibleState.count,
                  total: visibleState.total,
                })}
              </div>
            ) : null}
          </div>
        </section>

        <p className="text-xs leading-5 text-muted-foreground">
          {t("summary.entries-description")}
        </p>

        {isLoading ? (
          <StatusCard
            title={t("status.loading-title")}
            description={t("status.loading-description")}
          />
        ) : isError ? (
          <StatusCard
            title={t("status.error-title")}
            description={t("status.error-description")}
          />
        ) : groups.length === 0 ? (
          <StatusCard
            title={t("status.empty-title")}
            description={t("status.empty-description")}
            actions={
              query ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setQuery("")}
                >
                  {t("actions.clear-search")}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <PublicationCategorySection
                key={group.key}
                group={group}
                selectedRulebookSet={selectedRulebookSet}
                onGroupCheckedChange={setRulebookGroup}
                onRulebookCheckedChange={setOneRulebook}
                stats={stats}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
