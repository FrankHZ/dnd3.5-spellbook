import { useTranslation } from "react-i18next";
import { Switch } from "~/components/ui/switch";
import { SpellCardDetailToggle } from "~/features/spells/SpellCardDetailToggle";
import type { SpellCardDetailMode } from "~/storage/userPrefs.type";

export type GroupMode = "flat" | "grouped";
export type CardViewMode = "simple" | "all";

export function BrowseOptionsToggle({
  groupMode,
  onGroupModeChange,
  cardDetailMode,
  onCardDetailModeChange,
}: {
  groupMode: GroupMode;
  onGroupModeChange: (v: GroupMode) => void;
  cardDetailMode: SpellCardDetailMode;
  onCardDetailModeChange: (v: SpellCardDetailMode) => void;
}) {
  const { t } = useTranslation("spell-browse");

  return (
    <div className="space-y-2">
      <SpellCardDetailToggle
        mode={cardDetailMode}
        onModeChange={onCardDetailModeChange}
        label={t("options.show-card-details")}
      />
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 font-medium text-foreground">
          {t("options.group-by-level")}
        </span>
        <Switch
          className="shrink-0"
          checked={groupMode === "grouped"}
          onCheckedChange={(checked) =>
            onGroupModeChange(checked ? "grouped" : "flat")
          }
        />
      </label>
    </div>
  );
}
