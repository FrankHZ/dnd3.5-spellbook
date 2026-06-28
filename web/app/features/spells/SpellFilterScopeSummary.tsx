import { useTranslation } from "react-i18next";

type SpellFilterScopeSummaryProps = {
  classCount: number;
  domainCount: number;
  level: number | "all" | null;
  rulebookCount: number;
  nullLevelMode: "any" | "required";
};

export function SpellFilterScopeSummary({
  classCount,
  domainCount,
  level,
  rulebookCount,
  nullLevelMode,
}: SpellFilterScopeSummaryProps) {
  const { t } = useTranslation("spell-scope");
  const levelLabel =
    level === null
      ? nullLevelMode === "any"
        ? t("any level")
        : t("not selected")
      : level === "all"
        ? t("all levels")
        : String(level);

  return (
    <div className="space-y-1 px-1 text-sm text-muted-foreground">
      <div>
        {t(
          "Filters: {{classCount}} class filters, {{domainCount}} domain filters, level {{level}}.",
          { classCount, domainCount, level: levelLabel },
        )}
      </div>
      <div>
        {rulebookCount > 0
          ? t("Rulebooks: {{count}} selected (change in Settings).", {
              count: rulebookCount,
            })
          : t("Rulebooks: default 3.5 core")}
      </div>
    </div>
  );
}
