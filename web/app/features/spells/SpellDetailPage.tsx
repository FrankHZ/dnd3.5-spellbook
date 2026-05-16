import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "~/api/http";
import { SpellActionButtons } from "~/components/SpellActionButtons";
import { getSpellDetail } from "~/api/spells";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";

import ComponentsSection from "./ComponentsSection";
import { MechanicsSection } from "./MechanicSection";
import LevelsSection from "./LevelsSection";
import DescriptionSection from "./DescriptionSection";
import RelatedSpellsSection from "./RelatedSpellsSection";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { getSpellDescription } from "~/i18n/display/spell-description";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { useTranslation } from "react-i18next";

function SpellDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
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
  rulebookAbbr,
  page,
  schoolText,
  descriptors,
  spellId,
  className = "",
}: {
  title: string;
  rulebookAbbr?: string | null;
  page?: number | null;
  schoolText: string;
  descriptors: Array<{ key: string; label: string }>;
  spellId: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{rulebookAbbr ?? "—"}</span>
            {page ? <span> • p. {page}</span> : null}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {schoolText}
            {descriptors.length > 0 && (
              <span>
                {descriptors.map((descriptor) => (
                  <Badge
                    key={descriptor.key}
                    variant="secondary"
                    className="text-xs text-muted-foreground mx-1 "
                  >
                    {descriptor.label}
                  </Badge>
                ))}
              </span>
            )}
          </div>
        </div>
        <SpellActionButtons spellId={spellId} />
      </div>
    </div>
  );
}

export default function SpellDetailPage() {
  const { id } = useParams();
  const { queryKey } = useAppI18n();
  const { lang, nameWithEn } = useAppI18n();
  const { t } = useTranslation(["spell-detail", "collections"]);
  const { metaName } = useMetaNames();
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
        <Card className="gap-0">
          <CardHeader className="gap-1 py-3">
            <CardTitle>{t("Invalid spell id")}</CardTitle>
            <CardDescription>
              {t("The URL id must be a positive integer.")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (query.isLoading) return <SpellDetailSkeleton />;

  if (status === 404) {
    return (
      <div className="page-side">
        <Card className="gap-0">
          <CardHeader className="gap-1 py-3">
            <CardTitle>{t("Spell not found")}</CardTitle>
            <CardDescription>
              {t("No spell exists with id {{id}}.", { id: idNum })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="outline" size="sm">
              <Link to="/browse">{t("Back to Browse")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 400) {
    return (
      <div className="page-side">
        <Card className="gap-0">
          <CardHeader className="gap-1 py-3">
            <CardTitle>{t("Invalid spell id")}</CardTitle>
            <CardDescription>
              {t("The request id is not valid.")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (query.error) {
    const msg =
      query.error instanceof ApiError
        ? query.error.message
        : t("Request failed. Please try again.");
    return (
      <div className="page-side">
        <Card className="gap-0">
          <CardHeader className="gap-1 py-3">
            <CardTitle>{t("Couldn't load spell")}</CardTitle>
            <CardDescription>{msg}</CardDescription>
          </CardHeader>
        </Card>
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

  return (
    <div className="page-side">
      <SpellHeader
        title={nameWithEn(spell)}
        rulebookAbbr={spell.rulebook?.abbr}
        page={spell.page}
        schoolText={schoolText}
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
              title={nameWithEn(spell)}
              rulebookAbbr={spell.rulebook?.abbr}
              page={spell.page}
              schoolText={schoolText}
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
