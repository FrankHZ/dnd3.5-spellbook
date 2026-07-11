import type {
  PublicationCategory,
  PublicationReviewStatus,
  PublicationSourceKind,
  Rulebook,
} from "@dnd/contracts";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useBootstrap } from "~/bootstrap/useBootstrap";
import { PageHeader } from "~/components/PageHeader";
import { StatusCard } from "~/components/StatusCard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { getRulebookDisplay } from "~/i18n/display/rulebook";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useMetaI18n } from "~/i18n/hooks/useMetaI18n";
import { cn } from "~/lib/utils";
import { DEFAULT_STATE } from "~/storage/userPrefs";
import { useUserPrefs } from "~/state/user-prefs-state";

import {
  groupRulebooksByPublication,
  type PublicationCategoryGroup,
} from "./publication-groups";

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

function getPublicationYearLabel(rulebook: Rulebook) {
  return rulebook.publicationDate ?? rulebook.publicationYear;
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

function StatusBadge({
  status,
}: {
  status: PublicationReviewStatus | undefined;
}) {
  const { t } = useTranslation("publications");
  const normalized = status ?? "review";
  const label =
    normalized === "accepted"
      ? t("status.accepted")
      : normalized === "deferred"
        ? t("status.deferred")
        : t("status.review");

  return (
    <Badge
      variant={normalized === "accepted" ? "secondary" : "outline"}
      className="max-w-full"
    >
      {label}
    </Badge>
  );
}

function SourceKindBadge({
  sourceKind,
}: {
  sourceKind: PublicationSourceKind | undefined;
}) {
  const { t } = useTranslation("publications");
  const normalized = sourceKind ?? "other";
  const label =
    normalized === "rulebook"
      ? t("source-kind.rulebook")
      : normalized === "magazine"
        ? t("source-kind.magazine")
        : normalized === "web"
          ? t("source-kind.web")
          : t("source-kind.other");

  return (
    <Badge variant="outline" className="max-w-full">
      {label}
    </Badge>
  );
}

function PublicationRulebookRow({
  groupKey,
  rulebook,
  selected,
  onCheckedChange,
}: {
  groupKey: string;
  rulebook: Rulebook;
  selected: boolean;
  onCheckedChange: (id: number, checked: boolean) => void;
}) {
  const { lang } = useAppI18n();
  const meta = useMetaI18n();
  const { t } = useTranslation("publications");
  const display = getRulebookDisplay(meta, rulebook, lang);
  const checkboxId = `publication-rulebook-${groupKey}-${rulebook.id}`;
  const yearLabel = getPublicationYearLabel(rulebook);

  return (
    <Field orientation="horizontal" className="min-w-0 items-start">
      <Checkbox
        id={checkboxId}
        checked={selected}
        className="mt-0.5"
        onCheckedChange={(value) =>
          onCheckedChange(rulebook.id, Boolean(value))
        }
      />
      <FieldLabel
        htmlFor={checkboxId}
        className="min-w-0 flex-1 select-text flex-col items-start gap-1.5"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0 text-xs font-medium text-foreground">
            {display.abbr}
          </span>
          {display.name !== display.abbr ? (
            <span className="min-w-0 text-sm text-foreground/85">
              {display.name}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <SourceKindBadge sourceKind={rulebook.publicationSourceKind} />
          <StatusBadge status={rulebook.publicationReviewStatus} />
          {yearLabel ? <Badge variant="outline">{yearLabel}</Badge> : null}
          {rulebook.publicationUrl ? (
            <a
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              href={rulebook.publicationUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t("actions.source")}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </span>
      </FieldLabel>
    </Field>
  );
}

function PublicationFamilyCard({
  category,
  family,
  selectedRulebookSet,
  onGroupCheckedChange,
  onRulebookCheckedChange,
}: {
  category: PublicationCategory;
  family: PublicationCategoryGroup["families"][number];
  selectedRulebookSet: Set<number>;
  onGroupCheckedChange: (rulebooks: Rulebook[], checked: boolean) => void;
  onRulebookCheckedChange: (id: number, checked: boolean) => void;
}) {
  const st = getCheckState(family.rulebooks, selectedRulebookSet);
  const checkboxId = `publication-family-${category}-${family.key}`;

  return (
    <div className="space-y-3 rounded-md border bg-card px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
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
        <Badge variant="outline" className="shrink-0">
          {st.count}/{st.total}
        </Badge>
      </div>

      <Separator />
      <FieldGroup className="grid gap-3 sm:grid-cols-2">
        {family.rulebooks.map((rulebook) => (
          <PublicationRulebookRow
            key={rulebook.id}
            groupKey={family.key}
            rulebook={rulebook}
            selected={selectedRulebookSet.has(rulebook.id)}
            onCheckedChange={onRulebookCheckedChange}
          />
        ))}
      </FieldGroup>
    </div>
  );
}

function PublicationCategorySection({
  group,
  selectedRulebookSet,
  onGroupCheckedChange,
  onRulebookCheckedChange,
}: {
  group: PublicationCategoryGroup;
  selectedRulebookSet: Set<number>;
  onGroupCheckedChange: (rulebooks: Rulebook[], checked: boolean) => void;
  onRulebookCheckedChange: (id: number, checked: boolean) => void;
}) {
  const st = getCheckState(group.rulebooks, selectedRulebookSet);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">
          <CategoryLabel category={group.key} />
        </h2>
        <Badge variant="outline">
          {st.count}/{st.total}
        </Badge>
      </div>

      <div className="space-y-3">
        {group.families.map((family) => (
          <PublicationFamilyCard
            key={family.key}
            category={group.key}
            family={family}
            selectedRulebookSet={selectedRulebookSet}
            onGroupCheckedChange={onGroupCheckedChange}
            onRulebookCheckedChange={onRulebookCheckedChange}
          />
        ))}
      </div>
    </section>
  );
}

export default function PublicationScopePage() {
  const { t } = useTranslation("publications");
  const { state, setState } = useUserPrefs();
  const { boot, rulebooks, displayRulebook } = usePublicationRulebooks();
  const [query, setQuery] = useState("");
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
    () =>
      groupRulebooksByPublication(
        visibleRulebooks,
        (rulebook) => displayRulebook(rulebook).abbr,
      ),
    [displayRulebook, visibleRulebooks],
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

  const isLoading = boot.isLoading && rulebooks.length === 0;
  const isError = Boolean(boot.error);

  return (
    <div className="page-single">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={
          <Badge variant="secondary" className="max-w-full">
            {t("summary.selected", {
              selected: state.selectedRulebookIds.length,
              total: rulebooks.length,
            })}
          </Badge>
        }
      />

      <div className="space-y-4">
        <Card className="gap-0">
          <CardHeader className="gap-1 py-3">
            <CardTitle className="text-base">{t("controls.title")}</CardTitle>
            <CardDescription>{t("controls.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("controls.search-placeholder")}
                aria-label={t("controls.search-label")}
              />
              <div className="flex flex-wrap gap-2 sm:shrink-0">
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
              </div>
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
                visibleRulebooks.length === 0 && "text-destructive",
              )}
            >
              {t("summary.visible", {
                selected: visibleState.count,
                total: visibleState.total,
              })}
            </div>
          </CardContent>
        </Card>

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
          <div className="space-y-5">
            {groups.map((group) => (
              <PublicationCategorySection
                key={group.key}
                group={group}
                selectedRulebookSet={selectedRulebookSet}
                onGroupCheckedChange={setRulebookGroup}
                onRulebookCheckedChange={setOneRulebook}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
