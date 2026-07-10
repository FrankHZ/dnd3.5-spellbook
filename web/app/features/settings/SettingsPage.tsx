import ClassSettings from "~/features/settings/ClassSettings";
import DisplaySettings from "~/features/settings/DisplaySettings";
import RulebookSelector from "~/features/settings/RulebookSelector";
import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

type SettingsTab = "general" | "rulebooks";

const SETTINGS_TABS = [
  "general",
  "rulebooks",
] as const satisfies readonly SettingsTab[];

function getSettingsTabFromHash(hash: string): SettingsTab {
  const value = hash.replace(/^#/, "");
  return SETTINGS_TABS.includes(value as SettingsTab)
    ? (value as SettingsTab)
    : "general";
}

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const tabsId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getSettingsTabFromHash(location.hash);

  function setActiveTab(tab: SettingsTab) {
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: tab,
      },
      { preventScrollReset: true },
    );
  }

  const generalTabId = `${tabsId}-general-tab`;
  const rulebooksTabId = `${tabsId}-rulebooks-tab`;
  const generalPanelId = `${tabsId}-general-panel`;
  const rulebooksPanelId = `${tabsId}-rulebooks-panel`;

  return (
    <div className="page-single">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      <div className="space-y-4">
        <div
          aria-label={t("tabs.label")}
          className="mx-auto grid w-full grid-cols-2 gap-2 rounded-md border bg-muted/30 p-1 sm:w-fit sm:min-w-72"
          role="tablist"
        >
          <Button
            id={generalTabId}
            aria-controls={generalPanelId}
            aria-selected={activeTab === "general"}
            className="w-full"
            role="tab"
            size="sm"
            type="button"
            variant={activeTab === "general" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("general")}
          >
            {t("tabs.general")}
          </Button>
          <Button
            id={rulebooksTabId}
            aria-controls={rulebooksPanelId}
            aria-selected={activeTab === "rulebooks"}
            className="w-full"
            role="tab"
            size="sm"
            type="button"
            variant={activeTab === "rulebooks" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("rulebooks")}
          >
            {t("tabs.rulebooks")}
          </Button>
        </div>

        {activeTab === "general" ? (
          <div
            id={generalPanelId}
            aria-labelledby={generalTabId}
            className="space-y-4"
            role="tabpanel"
          >
            <DisplaySettings />
            <ClassSettings />
          </div>
        ) : (
          <div
            id={rulebooksPanelId}
            aria-labelledby={rulebooksTabId}
            role="tabpanel"
          >
            <RulebookSelector />
          </div>
        )}
      </div>
    </div>
  );
}
