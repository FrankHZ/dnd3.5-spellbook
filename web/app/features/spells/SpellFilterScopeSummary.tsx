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
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground sm:flex sm:items-center sm:justify-between sm:gap-3 sm:text-sm">
      <div className="min-w-0">
        {t(
          "Filters: {{classCount}} class filters, {{domainCount}} domain filters, level {{level}}.",
          { classCount, domainCount, level: levelLabel },
        )}
      </div>
      <div className="min-w-0">
        {rulebookCount > 0
          ? t("Rulebooks: {{count}} selected (change in Settings).", {
              count: rulebookCount,
            })
          : t("Rulebooks: default 3.5 core")}
      </div>
    </div>
  );
}
