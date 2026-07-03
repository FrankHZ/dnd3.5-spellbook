import { Switch } from "~/components/ui/switch";
import type { SpellCardDetailMode } from "~/storage/userPrefs.type";

export function SpellCardDetailToggle({
  mode,
  onModeChange,
  label,
}: {
  mode: SpellCardDetailMode;
  onModeChange: (mode: SpellCardDetailMode) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium text-foreground">
        {label}
      </span>
      <Switch
        checked={mode === "full"}
        onCheckedChange={(checked) =>
          onModeChange(checked ? "full" : "summary")
        }
      />
    </label>
  );
}
