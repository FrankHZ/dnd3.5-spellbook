import type { SpellItem } from "@dnd/contracts";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useAppI18n } from "~/i18n/useAppI18n";
import { useMetaNames } from "~/i18n/useMetaNames";
import { useCollections } from "~/state/collections-state";

export function SpellCard({
  spell,
  showActions = false,
  showDetails = true,
}: {
  spell: SpellItem;
  showDetails?: boolean;
  showActions?: boolean;
}) {
  const { spellbook, prepared } = useCollections();

  const { nameWithEn } = useAppI18n();
  const { metaName } = useMetaNames();
  const inFav = spellbook.isInDefault(spell.id);

  const { t } = useTranslation();
  return (
    <div className="p-3 hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/spells/${spell.id}`}
            className="font-medium hover:underline"
          >
            {nameWithEn(spell)}
          </Link>
          <span className="p-2 text-xs text-muted-foreground space-y-2">
            <span className="p-1 font-mono">{spell.rulebook.abbr ?? "—"}</span>
            <span className="p-1">{spell.page ? `p. ${spell.page}` : ""}</span>
          </span>

          {showDetails && (
            <>
              <div className="mt-1 text-xs text-muted-foreground">
                {metaName("schools", spell.school) || "—"}
                {spell.subSchool
                  ? ` (${metaName("subschools", spell.subSchool)})`
                  : ""}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                {spell.classLevels
                  .map(
                    (mcl) =>
                      `${metaName("classes", mcl)} ${mcl.level}` +
                      (mcl.extra ? ` (${mcl.extra})` : "") +
                      (mcl.prestige ? ` (P)` : ""),
                  )
                  .join(", ")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {spell.domainLevels
                  .map(
                    (mdl) =>
                      `${metaName("domains", mdl)} ${mdl.level}` +
                      (mdl.extra ? ` (${mdl.extra})` : ""),
                  )
                  .join(", ")}
              </div>

              {spell.descriptors?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {spell.descriptors.map((d) => (
                    <Badge key={d.id} variant="secondary" className="text-xs">
                      {metaName("descriptors", d)}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 text-right">
          {showActions && (
            <div className="flex flex-col gap-2 items-end">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => spellbook.toggleDefault(spell.id)}
                aria-label={
                  inFav ? "Remove from favorites" : "Add to favorites"
                }
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
                size="sm"
                variant="outline"
                onClick={() => prepared.add(spell.id)}
              >
                {t("Prepare", { ns: "collections" })}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
