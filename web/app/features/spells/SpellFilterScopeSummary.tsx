import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { SpellMetaBadge } from "./SpellMetaBadge";

type SpellFilterScopeSummaryTranslate = (
  key: string,
  options?: { count?: number; ns: "spell-scope" },
) => string;

type SpellFilterScopeSummaryProps = {
  classCount: number;
  domainCount: number;
  level: number | "all" | null;
  rulebookCount: number;
  taxonomyFilterCount?: number;
  componentFilterCount?: number;
  mechanicFilterCount?: number;
  nullLevelMode: "any" | "required";
};

type SpellFilterScopeSummaryItem = {
  key:
    | "classes"
    | "domains"
    | "level"
    | "taxonomy"
    | "components"
    | "mechanics"
    | "rulebooks";
  label: string;
  value: string;
  isActive: boolean;
};

export function buildSpellFilterScopeSummaryItems({
  classCount,
  domainCount,
  level,
  rulebookCount,
  taxonomyFilterCount = 0,
  componentFilterCount = 0,
  mechanicFilterCount = 0,
  t,
}: SpellFilterScopeSummaryProps & {
  t: SpellFilterScopeSummaryTranslate;
}): SpellFilterScopeSummaryItem[] {
  const items: SpellFilterScopeSummaryItem[] = [];

  if (classCount > 0) {
    items.push({
      key: "classes",
      label: t("labels.classes", { ns: "spell-scope" }),
      value: String(classCount),
      isActive: true,
    });
  }

  if (domainCount > 0) {
    items.push({
      key: "domains",
      label: t("labels.domains", { ns: "spell-scope" }),
      value: String(domainCount),
      isActive: true,
    });
  }

  if (typeof level === "number") {
    items.push({
      key: "level",
      label: t("labels.level", { ns: "spell-scope" }),
      value: String(level),
      isActive: true,
    });
  }

  if (taxonomyFilterCount > 0) {
    items.push({
      key: "taxonomy",
      label: t("labels.taxonomy", { ns: "spell-scope" }),
      value: String(taxonomyFilterCount),
      isActive: true,
    });
  }

  if (componentFilterCount > 0) {
    items.push({
      key: "components",
      label: t("labels.components", { ns: "spell-scope" }),
      value: String(componentFilterCount),
      isActive: true,
    });
  }

  if (mechanicFilterCount > 0) {
    items.push({
      key: "mechanics",
      label: t("labels.mechanics", { ns: "spell-scope" }),
      value: String(mechanicFilterCount),
      isActive: true,
    });
  }

  if (rulebookCount > 0) {
    items.push({
      key: "rulebooks",
      label: t("labels.rulebooks", { ns: "spell-scope" }),
      value: String(rulebookCount),
      isActive: true,
    });
  }

  return items;
}

export function SpellFilterScopeSummary({
  classCount,
  domainCount,
  level,
  rulebookCount,
  taxonomyFilterCount = 0,
  componentFilterCount = 0,
  mechanicFilterCount = 0,
  nullLevelMode,
}: SpellFilterScopeSummaryProps) {
  const { t } = useTranslation("spell-scope");
  const summaryItems = buildSpellFilterScopeSummaryItems({
    classCount,
    domainCount,
    level,
    rulebookCount,
    taxonomyFilterCount,
    componentFilterCount,
    mechanicFilterCount,
    nullLevelMode,
    t,
  });

  return (
    <div
      data-testid="spell-filter-scope-summary"
      className="rounded-md border bg-muted/25 px-3 py-2 text-xs leading-5 text-muted-foreground"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 font-medium text-foreground/75">
          {t("labels.filters")}
        </span>
        {summaryItems.map((item) => (
          <SpellMetaBadge
            key={item.key}
            kind="scope"
            aria-label={`${item.label}: ${item.value}`}
            className="max-w-full gap-1"
          >
            <span className="shrink-0 text-muted-foreground/75">
              {item.label}:
            </span>
            <span
              className={
                item.isActive
                  ? "truncate font-medium text-foreground/85"
                  : "truncate text-muted-foreground"
              }
            >
              {item.value}
            </span>
            {item.key === "rulebooks" ? (
              <span className="shrink-0 text-muted-foreground">
                {t("rulebooks.settings-prefix")}
                <Link
                  to="/settings"
                  className="underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t("rulebooks.settings-link")}
                </Link>
                {t("rulebooks.settings-suffix")}
              </span>
            ) : null}
          </SpellMetaBadge>
        ))}
      </div>
    </div>
  );
}
