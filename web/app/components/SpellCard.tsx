import type { SpellItem } from "@dnd/contracts";
import { Link } from "react-router";
import { SpellActionButtons } from "~/components/SpellActionButtons";
import { Badge } from "~/components/ui/badge";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";

export function SpellCard({
  spell,
  showActions = false,
  showDetails = true,
}: {
  spell: SpellItem;
  showDetails?: boolean;
  showActions?: boolean;
}) {
  const { nameWithEn } = useAppI18n();
  const { metaName } = useMetaNames();
  return (
    <div className="p-3 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/spells/${spell.id}`}
              className="font-medium leading-5 hover:underline"
            >
              {nameWithEn(spell)}
            </Link>
            <span className="text-xs text-muted-foreground space-y-2">
              <span className="px-2 font-mono">
                {spell.rulebook.abbr ?? "—"}
              </span>
              <span className="px-1">
                {spell.page ? `p. ${spell.page}` : ""}
              </span>
            </span>
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
