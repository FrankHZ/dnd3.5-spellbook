import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "~/api/http";
import { SpellActionButtons } from "~/components/SpellActionButtons";
import { StatusCard } from "~/components/StatusCard";
import { getSpellDetail } from "~/api/spells";
import { Badge } from "~/components/ui/badge";
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

function SpellDetailSkeleton() {
  return (
    <div className="page-side">
      <div className="space-y-2 md:hidden">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="gap-0">
          <CardContent className="space-y-3 py-3">
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
  rulebookLabel,
  page,
  schoolText,
  shortDescription,
  descriptors,
  spellId,
  className = "",
}: {
  title: string;
  rulebookLabel: string;
  page?: number | null;
  schoolText: string;
  shortDescription?: string;
  descriptors: Array<{ key: string; label: string }>;
  spellId: number;
  className?: string;
}) {
  const sourceText = page
    ? `${rulebookLabel} · p. ${page}`
    : rulebookLabel;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-sm bg-muted/30 text-[11px] font-medium text-muted-foreground"
            >
              {sourceText}
            </Badge>
            <Badge variant="secondary" className="rounded-sm text-xs">
              {schoolText}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-normal">
            {title}
          </h1>
          {shortDescription ? (
            <p className="mt-3 max-w-3xl border-l-2 border-border pl-3 text-sm leading-6 text-foreground/80">
              {shortDescription}
            </p>
          ) : null}
          {descriptors.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {descriptors.map((descriptor) => (
                <Badge
                  key={descriptor.key}
                  variant="outline"
                  className="rounded-sm text-xs text-muted-foreground"
                >
                  {descriptor.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <SpellActionButtons spellId={spellId} />
      </div>
    </div>
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
    const msg =
      query.error instanceof ApiError
        ? query.error.message
        : t("errors.request-failed");
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

  return (
    <div className="page-side">
      <SpellHeader
        title={spellName(spell)}
        rulebookLabel={source.abbr}
        page={spell.page}
        schoolText={schoolText}
        shortDescription={shortDescription}
        descriptors={descriptorItems}
        spellId={spell.id}
        className="md:hidden"
      />

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="gap-0">
            <CardContent className="space-y-4 py-3">
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
              rulebookLabel={source.abbr}
              page={spell.page}
              schoolText={schoolText}
              shortDescription={shortDescription}
              descriptors={descriptorItems}
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
