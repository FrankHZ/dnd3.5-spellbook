import { useTranslation } from "react-i18next";
import { Switch } from "~/components/ui/switch";

export type GroupMode = "flat" | "grouped";
export type CardViewMode = "simple" | "all";

export function BrowseOptionsToggle({
  cardView,
  groupMode,
  onCardViewChange,
  onGroupModeChange,
}: {
  cardView: CardViewMode;
  groupMode: GroupMode;
  onCardViewChange: (v: CardViewMode) => void;
  onGroupModeChange: (v: GroupMode) => void;
}) {
  const { t } = useTranslation("spell-browse");

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{t("Show details")}</span>
        <Switch
          checked={cardView === "all"}
          onCheckedChange={(checked) =>
            onCardViewChange(checked ? "all" : "simple")
          }
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{t("Group by level")}</span>
        <Switch
          checked={groupMode === "grouped"}
          onCheckedChange={(checked) =>
            onGroupModeChange(checked ? "grouped" : "flat")
          }
        />
      </label>
    </div>
  );
}
