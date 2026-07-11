import ClassSettings from "~/features/settings/ClassSettings";
import DisplaySettings from "~/features/settings/DisplaySettings";
import { PageHeader } from "~/components/PageHeader";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="page-single">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      <div className="space-y-4">
        <DisplaySettings />
        <ClassSettings />
      </div>
    </div>
  );
}
