import type { PublicationStats, Rulebook } from "@dnd/contracts";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { getDisplayName, getDisplayNameWithEn } from "~/i18n/display/name";
import { cn } from "~/lib/utils";
import { getPublicationAbbr } from "./publication-groups";

export function PublicationCard({
  rulebook,
  displayName,
  lang,
  classNamesWithEnglish = false,
  selected,
  stats,
  statsPending,
  statsError,
  onCheckedChange,
}: {
  rulebook: Rulebook;
  displayName: string;
  lang: "en" | "zh";
  classNamesWithEnglish?: boolean;
  selected: boolean;
  stats?: PublicationStats;
  statsPending: boolean;
  statsError: boolean;
  onCheckedChange: (id: number, checked: boolean) => void;
}) {
  const { t } = useTranslation("publications");
  const [expanded, setExpanded] = useState(false);
  const [failedCover, setFailedCover] = useState<string>();
  const checkboxId = `publication-rulebook-${rulebook.id}`;
  const listId = `publication-classes-${rulebook.id}`;
  const year = rulebook.publicationDate ?? rulebook.publicationYear;
  const cover =
    rulebook.publicationReviewStatus === "accepted"
      ? rulebook.publicationImage
      : undefined;
  const classes = stats?.classSources.supported ?? [];
  const preview = expanded ? classes : classes.slice(0, 3);

  return (
    <article
      className={cn(
        "app-publication-card min-w-0 rounded-md border bg-card p-4",
        selected && "app-publication-card-selected",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="app-publication-cover flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border text-muted-foreground"
          aria-hidden="true"
        >
          {cover && failedCover !== cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
              onError={() => setFailedCover(cover)}
            />
          ) : (
            <BookOpen className="size-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="app-section-kicker break-words font-mono">
            {getPublicationAbbr(rulebook)}
          </span>
          <h3 className="mt-1 text-[0.9375rem] font-semibold leading-5">
            <label htmlFor={checkboxId} className="cursor-pointer break-words">
              {displayName}
            </label>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {year ? <time dateTime={year}>{year}</time> : null}
            <span>{rulebook.edition.name}</span>
            {rulebook.publicationUrl ? (
              <a
                href={rulebook.publicationUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={t("card.source", { name: displayName })}
                className="inline-flex min-h-6 items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                {t("actions.source")}
              </a>
            ) : null}
          </div>
        </div>
        <Checkbox
          id={checkboxId}
          checked={selected}
          aria-label={t("card.select", { name: displayName })}
          onCheckedChange={(value) =>
            onCheckedChange(rulebook.id, value === true)
          }
          className="mt-1 shrink-0"
        />
      </div>

      <div className="mt-3 border-t pt-3">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold tabular-nums">
            {stats
              ? stats.siteSpellCount.toLocaleString(
                  lang === "zh" ? "zh-CN" : "en-US",
                )
              : "—"}
          </span>
          <span className="text-muted-foreground">
            {t("card.site-entries", { count: stats?.siteSpellCount ?? 0 })}
          </span>
        </p>
        {statsPending && !stats ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("card.loading")}
          </p>
        ) : statsError && !stats ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("card.unavailable")}
          </p>
        ) : classes.length ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              {t("card.confirmed-partial")}
            </p>
            <ul id={listId} className="mt-1.5 flex flex-wrap gap-1.5">
              {preview.map((source) => (
                <li
                  key={source.variantId}
                  className="max-w-full rounded-sm border px-2 py-1 text-xs leading-4"
                >
                  <span className="break-words">
                    {classNamesWithEnglish
                      ? getDisplayNameWithEn(source, lang)
                      : getDisplayName(source, lang)}
                  </span>
                  {source.prestige ? (
                    <span className="ml-1.5 text-muted-foreground">
                      {t("card.prestige")}
                    </span>
                  ) : null}
                  {source.listKind === "maneuvers" ? (
                    <span className="ml-1.5 text-muted-foreground">
                      {t("card.maneuvers")}
                    </span>
                  ) : source.listKind === "infusions" ? (
                    <span className="ml-1.5 text-muted-foreground">
                      {t("card.infusions")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {classes.length > 3 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 -ml-2 h-auto min-h-8 text-xs"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-label={t(
                  expanded ? "card.collapse-label" : "card.expand-label",
                  { name: displayName },
                )}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? (
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                )}
                {expanded
                  ? t("card.collapse")
                  : t("card.more", { count: classes.length - 3 })}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("card.unknown-classes")}
          </p>
        )}
      </div>
    </article>
  );
}
