import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { ApiError, getApiErrorDisplayMessage } from "~/api/http";
import { SpellActionButtons } from "~/components/SpellActionButtons";
import { StatusCard } from "~/components/StatusCard";
import { getSpellDetail } from "~/api/spells";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";

import ComponentsSection from "./ComponentsSection";
import { MechanicsSection } from "./MechanicSection";
import LevelsSection from "./LevelsSection";
import DescriptionSection from "./DescriptionSection";
import RelatedSpellsSection from "./RelatedSpellsSection";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { getSpellDescription } from "~/i18n/display/spell-description";
import { getSpellShortDescription } from "~/i18n/display/spell-short-description";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { useRulebookDisplay } from "~/i18n/hooks/useRulebookDisplay";
import { useTranslation } from "react-i18next";
import { SpellMetaBadge } from "./SpellMetaBadge";

function SpellDetailSkeleton() {
  return (
    <div className="page-side">
      <div className="space-y-2 md:hidden">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="app-fixed-side-layout">
        <Card className="app-side-card">
          <CardContent className="app-side-card-content space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="hidden space-y-2 md:block">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

function SpellHeader({
  title,
  shortDescription,
  spellId,
  className = "",
}: {
  title: string;
  shortDescription?: string;
  spellId: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-normal">
            {title}
          </h1>
          {shortDescription ? (
            <p className="mt-3 max-w-3xl border-l-2 border-border pl-3 text-sm leading-6 text-foreground/80">
              {shortDescription}
            </p>
          ) : null}
        </div>
        <SpellActionButtons spellId={spellId} />
      </div>
    </div>
  );
}

function SpellOverviewSection({
  sourceText,
  schoolText,
  descriptors,
}: {
  sourceText: string;
  schoolText: string;
  descriptors: Array<{ key: string; label: string }>;
}) {
  const { t } = useTranslation("spell-detail");

  return (
    <section className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("sections.overview")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <SpellMetaBadge kind="source" size="regular">
          {sourceText}
        </SpellMetaBadge>
        <SpellMetaBadge kind="taxonomy" size="regular">
          {schoolText}
        </SpellMetaBadge>
        {descriptors.map((descriptor) => (
          <SpellMetaBadge
            key={descriptor.key}
            kind="descriptor"
            size="regular"
          >
            {descriptor.label}
          </SpellMetaBadge>
        ))}
      </div>
    </section>
  );
}

export default function SpellDetailPage() {
  const { id } = useParams();
  const { queryKey } = useAppI18n();
  const { lang, spellName } = useAppI18n();
  const { t } = useTranslation(["spell-detail", "collections"]);
  const { metaName } = useMetaNames();
  const { rulebookDisplay } = useRulebookDisplay();
  const idNum = Number(id);
  const isValidId = Number.isInteger(idNum) && idNum > 0;

  const query = useQuery({
    queryKey: ["spellDetail", { idNum, ...queryKey }],
    enabled: isValidId,
    queryFn: ({ signal }) => getSpellDetail(idNum, signal),
  });

  // 400/404 handling
  const status = query.error instanceof ApiError ? query.error.status : null;

  if (!isValidId) {
    return (
      <div className="page-side">
        <StatusCard
          title={t("errors.invalid-id-title")}
          description={t("errors.invalid-url-description")}
        />
      </div>
    );
  }

  if (query.isLoading) return <SpellDetailSkeleton />;

  if (status === 404) {
    return (
      <div className="page-side">
        <StatusCard
          title={t("errors.not-found-title")}
          description={t("errors.not-found-description", { id: idNum })}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/browse">{t("actions.back-to-browse")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (status === 400) {
    return (
      <div className="page-side">
        <StatusCard
          title={t("errors.invalid-id-title")}
          description={t("errors.invalid-request-description")}
        />
      </div>
    );
  }

  if (query.error) {
    const msg = getApiErrorDisplayMessage(
      query.error,
      t("errors.request-failed"),
    );
    return (
      <div className="page-side">
        <StatusCard title={t("errors.load-title")} description={msg} />
      </div>
    );
  }

  const spell = query.data!;
  const schoolText =
    (metaName("schools", spell.school) ?? "—") +
    (spell.subSchool ? ` (${metaName("subschools", spell.subSchool)})` : "");
  const descriptorItems = (spell.descriptors ?? []).map((d) => ({
    key: String(d.id ?? d.slug ?? d.name),
    label: metaName("descriptors", d),
  }));
  const shortDescription = getSpellShortDescription(spell, lang);
  const source = rulebookDisplay(spell.rulebook);
  const sourceText = spell.page
    ? `${source.abbr} · p. ${spell.page}`
    : source.abbr;

  return (
    <div className="page-side">
      <SpellHeader
        title={spellName(spell)}
        shortDescription={shortDescription}
        spellId={spell.id}
        className="md:hidden"
      />

      <div className="app-fixed-side-layout">
        <div className="space-y-4">
          <Card className="app-side-card">
            <CardContent className="app-side-card-content space-y-4">
              <SpellOverviewSection
                sourceText={sourceText}
                schoolText={schoolText}
                descriptors={descriptorItems}
              />
              <Separator />
              <LevelsSection spell={spell} />
              <Separator />
              <ComponentsSection components={spell.components} />
              <Separator />
              <MechanicsSection casting={spell.casting} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="hidden md:block">
            <SpellHeader
              title={spellName(spell)}
              shortDescription={shortDescription}
              spellId={spell.id}
            />
            <Separator className="my-2" />
          </div>
          <DescriptionSection description={getSpellDescription(spell, lang)} />

          <Separator />

          <RelatedSpellsSection spell={spell} />
        </div>
      </div>
    </div>
  );
}
