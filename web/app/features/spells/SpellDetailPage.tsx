import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "~/api/http";
import { getSpellDetail } from "~/api/spells";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

import ComponentsSection from "./ComponentsSection";
import { MechanicsSection } from "./MechanicSection";
import LevelsSection from "./LevelsSection";
import DescriptionSection from "./DescriptionSection";
import { useCollections } from "~/state/collections-state";
import { Heart } from "lucide-react";

function SpellDetailSkeleton() {
  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="space-y-2 animate-pulse">
        <div className="h-7 w-2/3 bg-muted rounded" />
        <div className="h-4 w-1/3 bg-muted rounded" />
      </div>
      <div className="h-24 bg-muted rounded animate-pulse" />
      <div className="h-48 bg-muted rounded animate-pulse" />
    </div>
  );
}

export default function SpellDetailPage() {
  const { id } = useParams();
  const idNum = Number(id);
  const isValidId = Number.isInteger(idNum) && idNum > 0;

  const { toggleDefault, togglePrepared, isInDefault, isInPrepared } =
    useCollections();

  const inFav = isInDefault(idNum);
  const inPrepared = isInPrepared(idNum);

  const query = useQuery({
    queryKey: ["spellDetail", idNum],
    enabled: isValidId,
    queryFn: ({ signal }) => getSpellDetail(idNum, signal),
  });

  // 400/404 handling
  const status = query.error instanceof ApiError ? query.error.status : null;

  if (!isValidId) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">Invalid spell id</div>
          <div className="mt-1 text-sm text-muted-foreground">
            The URL id must be a positive integer.
          </div>
        </div>
      </div>
    );
  }

  if (query.isLoading) return <SpellDetailSkeleton />;

  if (status === 404) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">Spell not found</div>
          <div className="mt-1 text-sm text-muted-foreground">
            No spell exists with id {idNum}.
          </div>
          <div className="mt-3">
            <Link to="/browse" className="text-sm underline">
              Back to Browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 400) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">Invalid spell id</div>
          <div className="mt-1 text-sm text-muted-foreground">
            The request id is not valid.
          </div>
        </div>
      </div>
    );
  }

  if (query.error) {
    const msg =
      query.error instanceof ApiError
        ? query.error.message
        : "Request failed. Please try again.";
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="rounded-md border p-3">
          <div className="font-medium">Couldn’t load spell</div>
          <div className="mt-1 text-sm text-muted-foreground">{msg}</div>
        </div>
      </div>
    );
  }

  const spell = query.data!;

  const descriptorNames = (spell.descriptors ?? [])
    .slice(0, 3)
    .map((d: any) => d.name);
  const showHeaderDescriptors = descriptorNames.length > 0;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight">
              {spell.name}
            </h1>

            <div className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{spell.rulebook?.abbr ?? "—"}</span>
              {spell.page ? <span> • p. {spell.page}</span> : null}
            </div>

            {showHeaderDescriptors && (
              <div className="mt-2 flex flex-wrap gap-1">
                {descriptorNames.map((n: string) => (
                  <Badge key={n} variant="secondary" className="text-xs">
                    {n}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions (MVP: spellbook + prepared only) */}
          <div className="shrink-0 flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleDefault(spell.id)}
              aria-label={inFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                className={`h-4 w-4 ${
                  inFav
                    ? "fill-red-500 stroke-red-500"
                    : "stroke-muted-foreground"
                }`}
              />
            </Button>

            <Button
              variant={inPrepared ? "default" : "outline"}
              onClick={() => togglePrepared(idNum)}
            >
              {inPrepared ? "Prepared" : "Add to Prepared"}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {(spell.school?.name ?? "—") +
            (spell.subSchool ? ` (${spell.subSchool.name})` : "")}
        </div>

        {(spell.descriptors?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {spell.descriptors.map((d: any) => (
              <Badge
                key={d.id ?? d.slug ?? d.name}
                variant="secondary"
                className="text-xs"
              >
                {d.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <LevelsSection spell={spell} />

      <Separator />

      <ComponentsSection components={spell.components} />

      <Separator />

      <MechanicsSection casting={spell.casting} />

      <Separator />

      <DescriptionSection description={spell.description} />
    </div>
  );
}
