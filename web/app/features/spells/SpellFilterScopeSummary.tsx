import { useTranslation } from "react-i18next";

type SpellFilterScopeSummaryProps = {
  classCount: number;
  domainCount: number;
  level: number | "all" | null;
  rulebookCount: number;
  taxonomyFilterCount?: number;
  nullLevelMode: "any" | "required";
};

export function SpellFilterScopeSummary({
  classCount,
  domainCount,
  level,
  rulebookCount,
  taxonomyFilterCount = 0,
  nullLevelMode,
}: SpellFilterScopeSummaryProps) {
  const { t } = useTranslation("spell-scope");
  const levelLabel =
    level === null
      ? nullLevelMode === "any"
        ? t("level.any")
        : t("level.not-selected")
      : level === "all"
        ? t("level.all")
        : String(level);
  const classScopeLabel =
    classCount > 0
      ? t("classes.selected", { count: classCount })
      : t("classes.none");
  const domainScopeLabel =
    domainCount > 0
      ? t("domains.selected", { count: domainCount })
      : t("domains.none");

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-1 sm:text-sm">
      <div className="min-w-0">
        {t("filters.summary", {
          classes: classScopeLabel,
          domains: domainScopeLabel,
          level: levelLabel,
        })}
      </div>
      {taxonomyFilterCount > 0 ? (
        <div className="min-w-0">
          {t("taxonomy.selected", { count: taxonomyFilterCount })}
        </div>
      ) : null}
      <div className="min-w-0">
        {rulebookCount > 0
          ? t("rulebooks.selected", {
              count: rulebookCount,
            })
          : t("rulebooks.default-core")}
      </div>
    </div>
  );
}
