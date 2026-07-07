import type {
  AppVersionMetadata,
  PublicContentStatus,
} from "@dnd/contracts";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getConfiguredApiBaseUrl } from "~/api/http";
import { getAppStatus } from "~/api/status";
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
            <br />
            <a
              className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              href={REPOSITORY_URL}
              rel="noreferrer"
              target="_blank"
            >
              {t("page.repository")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </>
        }
      />

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

      <CreditsSection />
    </div>
  );
}
