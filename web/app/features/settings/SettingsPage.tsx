import { useUserPrefs } from "~/state/user-prefs-state";
import ClassSettings from "~/features/settings/ClassSettings";
import RulebookSelector from "~/features/settings/RulebookSelector";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { state } = useUserPrefs();
  const { t } = useTranslation("settings");

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("Settings")}</h2>
        <div className="text-sm text-muted-foreground">
          {t("Settings are stored locally (MVP).")}
        </div>
      </div>

      <ClassSettings />
      <RulebookSelector />

      <div className="text-xs text-muted-foreground">
        storageVersion: {state.storageVersion}
      </div>
    </div>
  );
}
