import { useTranslation } from "react-i18next";
import { Checkbox } from "~/components/ui/checkbox";
import { useUserPrefs } from "~/state/user-prefs-state";

export default function ClassSettings() {
  const { state, setState } = useUserPrefs();
  const { t } = useTranslation("settings");
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="font-medium">{t("Classes")}</div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={state.includePrestige}
          onCheckedChange={(v) =>
            setState((s) => ({ ...s, includePrestige: Boolean(v) }))
          }
        />
        <span>{t("Include prestige classes (affects Browse class list)")}</span>
      </label>
    </div>
  );
}
