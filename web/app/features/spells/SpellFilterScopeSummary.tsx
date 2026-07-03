import { useTranslation } from "react-i18next";

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
  nullLevelMode: "any" | "required";
};

type SpellFilterScopeSummaryItem = {
  key: "classes" | "domains" | "level" | "taxonomy" | "rulebooks";
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
  nullLevelMode,
  t,
}: SpellFilterScopeSummaryProps & {
  t: SpellFilterScopeSummaryTranslate;
}): SpellFilterScopeSummaryItem[] {
  const levelLabel =
    level === null
      ? nullLevelMode === "any"
        ? t("level.any", { ns: "spell-scope" })
        : t("level.not-selected", { ns: "spell-scope" })
      : level === "all"
        ? t("level.all", { ns: "spell-scope" })
        : String(level);
  const classScopeLabel =
    classCount > 0
      ? t("classes.selected", { count: classCount, ns: "spell-scope" })
      : t("classes.none", { ns: "spell-scope" });
  const domainScopeLabel =
    domainCount > 0
      ? t("domains.selected", { count: domainCount, ns: "spell-scope" })
      : t("domains.none", { ns: "spell-scope" });
  const taxonomyScopeLabel =
    taxonomyFilterCount > 0
      ? t("taxonomy.selected", {
          count: taxonomyFilterCount,
          ns: "spell-scope",
        })
      : t("taxonomy.none", { ns: "spell-scope" });
  const rulebookScopeLabel =
    rulebookCount > 0
      ? t("rulebooks.selected-summary", {
          count: rulebookCount,
          ns: "spell-scope",
        })
      : t("rulebooks.default-core-value", { ns: "spell-scope" });

  return [
    {
      key: "classes",
      label: t("labels.classes", { ns: "spell-scope" }),
      value: classScopeLabel,
      isActive: classCount > 0,
    },
    {
      key: "domains",
      label: t("labels.domains", { ns: "spell-scope" }),
      value: domainScopeLabel,
      isActive: domainCount > 0,
    },
    {
      key: "level",
      label: t("labels.level", { ns: "spell-scope" }),
      value: levelLabel,
      isActive: level !== null,
    },
    {
      key: "taxonomy",
      label: t("labels.taxonomy", { ns: "spell-scope" }),
      value: taxonomyScopeLabel,
      isActive: taxonomyFilterCount > 0,
    },
    {
      key: "rulebooks",
      label: t("labels.rulebooks", { ns: "spell-scope" }),
      value: rulebookScopeLabel,
      isActive: rulebookCount > 0,
    },
  ];
}

export function SpellFilterScopeSummary({
  classCount,
  domainCount,
  level,
  rulebookCount,
  taxonomyFilterCount = 0,
  nullLevelMode,
}: SpellFilterScopeSummaryProps) {
  const { t } = useTranslation("spell-scope");
  const summaryItems = buildSpellFilterScopeSummaryItems({
    classCount,
    domainCount,
    level,
    rulebookCount,
    taxonomyFilterCount,
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
          <span
            key={item.key}
            aria-label={`${item.label}: ${item.value}`}
            className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-sm border bg-background/70 px-2 py-0.5"
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
          </span>
        ))}
      </div>
    </div>
  );
}
