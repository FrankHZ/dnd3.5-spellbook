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
    <div className="rounded-md border p-3 space-y-3">
      {/* Show details */}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{t("Show details")}</span>
        <Switch
          checked={cardView === "all"}
          onCheckedChange={(checked) =>
            onCardViewChange(checked ? "all" : "simple")
          }
        />
      </label>

      {/* Group by level */}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{t("Group by level")}</span>
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
