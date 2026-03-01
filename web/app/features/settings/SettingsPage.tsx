import { useUserPrefs } from "~/state/user-prefs-state";
import ClassSettings from "~/features/settings/ClassSettings";
import RulebookSelector from "~/features/settings/RulebookSelector";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { state } = useUserPrefs();
  const { t } = useTranslation("settings");

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="space-y-1 px-1">
        <h2 className="text-lg font-semibold">{t("Settings")}</h2>
        <div className="text-sm text-muted-foreground">
          {t("Settings are stored locally (MVP).")}
        </div>
      </div>

      <ClassSettings />
      <RulebookSelector />

      <div className="px-1 text-xs text-muted-foreground">
        storageVersion: {state.storageVersion}
      </div>
    </div>
  );
}
