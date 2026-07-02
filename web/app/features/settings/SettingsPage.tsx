import ClassSettings from "~/features/settings/ClassSettings";
import RulebookSelector from "~/features/settings/RulebookSelector";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="page-single">
      <div className="space-y-1 px-1">
        <h2 className="text-lg font-semibold">{t("page.title")}</h2>
        <div className="text-sm text-muted-foreground">
          {t("page.description")}
        </div>
      </div>

      <ClassSettings />
      <RulebookSelector />
    </div>
  );
}
