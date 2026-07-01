import type { SpellItemView } from "@dnd/contracts";
import { Link } from "react-router";
import { SpellActionButtons } from "~/components/SpellActionButtons";
import { Badge } from "~/components/ui/badge";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { getSpellShortDescription } from "~/i18n/display/spell-short-description";

export function SpellCard({
  spell,
  showActions = false,
  showDetails = true,
}: {
  spell: SpellItemView;
  showDetails?: boolean;
  showActions?: boolean;
}) {
  const { lang, nameWithEn } = useAppI18n();
  const { metaName } = useMetaNames();
  const shortDescription = getSpellShortDescription(spell, lang);
  return (
    <div className="p-3 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Link
              to={`/spells/${spell.id}`}
              className="font-medium leading-5 hover:underline"
            >
              {nameWithEn(spell)}
            </Link>
            <span className="inline-flex items-baseline gap-1 text-xs text-muted-foreground">
              <span className="font-mono">
                {spell.rulebook.abbr ?? "—"}
              </span>
              <span>
                {spell.page ? `p. ${spell.page}` : ""}
              </span>
            </span>
            {shortDescription && (
              <span className="basis-full text-sm leading-5 text-foreground/80 sm:basis-auto sm:flex-1">
                {shortDescription}
              </span>
            )}
          </div>

          {showDetails && (
            <>
              <div className="mt-2 text-xs text-muted-foreground">
                {metaName("schools", spell.school) || "—"}
                {spell.subSchool
                  ? ` (${metaName("subschools", spell.subSchool)})`
                  : ""}
              </div>

              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                {spell.classLevels
                  .map(
                    (mcl) =>
                      `${metaName("classes", mcl)} ${mcl.level}` +
                      (mcl.extra ? ` (${mcl.extra})` : "") +
                      (mcl.prestige ? ` (P)` : ""),
                  )
                  .join(", ")}
              </div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
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
            <SpellActionButtons spellId={spell.id} orientation="vertical" />
          )}
        </div>
      </div>
    </div>
  );
}
