import type {
  AppStatusResponse,
  AppVersionMetadata,
  PublicContentStatus,
} from "@dnd/contracts";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { getConfiguredApiBaseUrl } from "~/api/http";
import { getAppStatus } from "~/api/status";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { PageHeader } from "~/components/PageHeader";
import { cn } from "~/lib/utils";
import { getFrontendVersionMetadata } from "./build-metadata";
import { chmChsCredit, englishSourceCredits } from "./credits";

const REPOSITORY_URL = "https://github.com/FrankHZ/dnd3.5-spellbook";
const AUTHOR_GITHUB_ID = "FrankHZ";
const AUTHOR_URL = "https://github.com/FrankHZ";

type AboutTab = "credits" | "status";

type StatusFieldProps = {
  label: string;
  value: string | number | null | undefined;
};

function formatDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatShortSha(value: string | undefined) {
  if (!value) return null;
  return value.length > 12 ? value.slice(0, 12) : value;
}

function StatusField({ label, value }: StatusFieldProps) {
  const { t } = useTranslation("about");
  const isUnavailable =
    value === null || value === undefined || value === "";
  const displayValue =
    isUnavailable ? t("common.unavailable") : String(value);

  return (
    <div className="min-w-0 rounded-sm border bg-muted/20 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate text-sm text-foreground",
          isUnavailable && "text-muted-foreground",
        )}
        title={displayValue}
      >
        {displayValue}
      </div>
    </div>
  );
}

function getFrontendHostingKey(apiBaseUrl: string, source: string | undefined) {
  if (
    apiBaseUrl === "https://api.d20spellcodex.com" ||
    source === "deploy"
  ) {
    return "deployment.hosting-workers";
  }
  return "deployment.hosting-local";
}

function DeploymentSection({
  apiBaseUrl,
  frontendSource,
}: {
  apiBaseUrl: string;
  frontendSource: string | undefined;
}) {
  const { t } = useTranslation("about");

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle className="text-base">{t("deployment.title")}</CardTitle>
        <CardDescription>{t("deployment.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 pt-0 sm:grid-cols-2">
        <StatusField
          label={t("deployment.frontend-hosting")}
          value={t(getFrontendHostingKey(apiBaseUrl, frontendSource))}
        />
        <StatusField
          label={t("deployment.api-origin")}
          value={apiBaseUrl || t("deployment.api-origin-same-origin")}
        />
      </CardContent>
    </Card>
  );
}

function VersionSection({
  title,
  description,
  metadata,
  timeLabel,
}: {
  title: string;
  description: string;
  metadata: AppVersionMetadata | null | undefined;
  timeLabel: string;
}) {
  const { t } = useTranslation("about");
  const timeValue = metadata?.builtAt ?? metadata?.deployedAt;

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusField
            label={t("fields.version-label")}
            value={metadata?.versionLabel}
          />
          <StatusField label={t("fields.source")} value={metadata?.source} />
          <StatusField
            label={t("fields.commit")}
            value={metadata?.shortSha ?? formatShortSha(metadata?.commitSha)}
          />
          <StatusField label={t("fields.ref")} value={metadata?.ref} />
          <StatusField label={timeLabel} value={formatDate(timeValue)} />
          <StatusField
            label={t("fields.github-run")}
            value={
              metadata?.githubRunId
                ? metadata.githubRunAttempt
                  ? `${metadata.githubRunId}.${metadata.githubRunAttempt}`
                  : metadata.githubRunId
                : null
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DbSummary({ status }: { status: PublicContentStatus }) {
  const { t } = useTranslation("about");
  const build = status.latestBuild;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <StatusField
        label={t("db.active-read-source")}
        value={status.activeSpellReadSource}
      />
      <StatusField label={t("db.content-status")} value={status.status} />
      <StatusField
        label={t("db.generated-at")}
        value={formatDate(build?.generatedAt)}
      />
      <StatusField label={t("db.generator")} value={build?.generatorVersion} />
      <StatusField label={t("db.spells")} value={build?.spellCount} />
      <StatusField label={t("db.issues")} value={build?.issueCount} />
    </div>
  );
}

function DatabaseSection({
  data,
  isLoading,
  isError,
}: {
  data: PublicContentStatus | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation("about");

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle className="text-base">{t("db.title")}</CardTitle>
        <CardDescription>{t("db.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading ? (
          <CardDescription>{t("common.loading")}</CardDescription>
        ) : isError || !data ? (
          <CardDescription>{t("common.unavailable")}</CardDescription>
        ) : (
          <DbSummary status={data} />
        )}
      </CardContent>
    </Card>
  );
}

function SourceLink({ href, title }: { href?: string; title: string }) {
  if (!href) return <span>{title}</span>;

  return (
    <a
      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {title}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}

function SourceCreditNote({ noteKey }: { noteKey: "dndtools" | "imarvin" }) {
  const { t } = useTranslation("about");

  if (noteKey === "dndtools") {
    return <>{t("credits.english.dndtools-note")}</>;
  }
  return <>{t("credits.english.imarvin-note")}</>;
}

function CreditsSection() {
  const { t } = useTranslation("about");

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle className="text-base">{t("credits.title")}</CardTitle>
        <CardDescription>{t("credits.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 text-sm leading-6">
        <section className="space-y-2">
          <h3 className="font-medium">{t("credits.english.title")}</h3>
          <div className="space-y-3 text-muted-foreground">
            {englishSourceCredits.map((credit) => (
              <div key={credit.title} className="space-y-1">
                <div className="font-medium text-foreground">
                  <SourceLink href={credit.href} title={credit.title} />
                </div>
                <div>{credit.people.join("; ")}</div>
                <div>
                  <SourceCreditNote noteKey={credit.noteKey} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t("credits.chm.title")}</h3>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                {t("credits.chm.translators")}
              </span>
              {chmChsCredit.translators}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {t("credits.chm.compiler")}
              </span>
              {chmChsCredit.compiler}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {t("credits.chm.second-edition")}
              </span>
              {chmChsCredit.secondEdition}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {t("credits.chm.assistance")}
              </span>
              {chmChsCredit.assistance}
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function StatusSections({
  apiBaseUrl,
  frontendMetadata,
  appStatusQuery,
}: {
  apiBaseUrl: string;
  frontendMetadata: AppVersionMetadata;
  appStatusQuery: UseQueryResult<AppStatusResponse>;
}) {
  const { t } = useTranslation("about");

  return (
    <div className="space-y-4">
      <VersionSection
        title={t("frontend.title")}
        description={t("frontend.description")}
        metadata={frontendMetadata}
        timeLabel={t("fields.built-at")}
      />

      <DeploymentSection
        apiBaseUrl={apiBaseUrl}
        frontendSource={frontendMetadata.source}
      />

      <VersionSection
        title={t("backend.title")}
        description={
          appStatusQuery.isError
            ? t("common.unavailable")
            : t("backend.description")
        }
        metadata={appStatusQuery.data?.backend}
        timeLabel={t("fields.deployed-at")}
      />

      <DatabaseSection
        data={appStatusQuery.data?.content}
        isLoading={appStatusQuery.isLoading}
        isError={appStatusQuery.isError}
      />
    </div>
  );
}

function AboutTabs({
  apiBaseUrl,
  frontendMetadata,
  appStatusQuery,
}: {
  apiBaseUrl: string;
  frontendMetadata: AppVersionMetadata;
  appStatusQuery: UseQueryResult<AppStatusResponse>;
}) {
  const { t } = useTranslation("about");
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState<AboutTab>("status");
  const statusTabId = `${tabsId}-status-tab`;
  const creditsTabId = `${tabsId}-credits-tab`;
  const statusPanelId = `${tabsId}-status-panel`;
  const creditsPanelId = `${tabsId}-credits-panel`;

  return (
    <div className="space-y-4">
      <div
        aria-label={t("tabs.label")}
        className="mx-auto grid w-full grid-cols-2 gap-2 rounded-md border bg-muted/30 p-1 sm:w-fit sm:min-w-72"
        role="tablist"
      >
        <Button
          id={statusTabId}
          aria-controls={statusPanelId}
          aria-selected={activeTab === "status"}
          className="w-full"
          role="tab"
          size="sm"
          type="button"
          variant={activeTab === "status" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("status")}
        >
          {t("tabs.status")}
        </Button>
        <Button
          id={creditsTabId}
          aria-controls={creditsPanelId}
          aria-selected={activeTab === "credits"}
          className="w-full"
          role="tab"
          size="sm"
          type="button"
          variant={activeTab === "credits" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("credits")}
        >
          {t("tabs.credits")}
        </Button>
      </div>

      {activeTab === "status" ? (
        <div
          id={statusPanelId}
          aria-labelledby={statusTabId}
          role="tabpanel"
        >
          <StatusSections
            apiBaseUrl={apiBaseUrl}
            frontendMetadata={frontendMetadata}
            appStatusQuery={appStatusQuery}
          />
        </div>
      ) : (
        <div
          id={creditsPanelId}
          aria-labelledby={creditsTabId}
          role="tabpanel"
        >
          <CreditsSection />
        </div>
      )}
    </div>
  );
}

export default function AboutVersionPage() {
  const { t } = useTranslation("about");
  const frontendMetadata = getFrontendVersionMetadata();
  const apiBaseUrl = getConfiguredApiBaseUrl();

  const appStatusQuery = useQuery({
    queryKey: ["status", "app"],
    queryFn: ({ signal }) => getAppStatus(signal),
  });

  return (
    <div className="page-single">
      <PageHeader
        title={t("page.title")}
        description={
          <>
            {t("page.description")}
            <div className="mt-2 space-y-1">
              <div className="inline-flex items-center gap-1.5">
                <span>{t("page.author")}</span>
                <a
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  href={AUTHOR_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  {AUTHOR_GITHUB_ID}
                </a>
              </div>
              <div>
                <a
                  className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  href={REPOSITORY_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("page.repository")}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </>
        }
      />

      <AboutTabs
        apiBaseUrl={apiBaseUrl}
        frontendMetadata={frontendMetadata}
        appStatusQuery={appStatusQuery}
      />
    </div>
  );
}
