import type { SpellItemView } from "@dnd/contracts";
import { Link } from "react-router";
import { SpellActionButtons } from "~/components/SpellActionButtons";
import { Badge } from "~/components/ui/badge";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { useRulebookDisplay } from "~/i18n/hooks/useRulebookDisplay";
import { getSpellShortDescription } from "~/i18n/display/spell-short-description";
import { cn } from "~/lib/utils";
import { getSpecialComponentMarkers } from "~/features/spells/spell-component-markers";
import type {
  SpellCardDetailMode,
  SpellListDensity,
} from "~/storage/userPrefs.type";

export function SpellCard({
  spell,
  showActions = false,
  showDetails,
  detailMode,
  density,
}: {
  spell: SpellItemView;
  showDetails?: boolean;
  showActions?: boolean;
  detailMode?: SpellCardDetailMode;
  density?: SpellListDensity;
}) {
  const { lang, spellName } = useAppI18n();
  const { metaName, metaNameWithEn } = useMetaNames();
  const { rulebookDisplay } = useRulebookDisplay();
  const displayPrefs = useDisplayPrefs();
  const source = rulebookDisplay(spell.rulebook);
  const shortDescription = getSpellShortDescription(spell, lang);
  const displayName = spellName(spell);
  const classDomainName =
    lang === "zh" && displayPrefs.zhDisplay.classDomainLabelsWithEnglish
      ? metaNameWithEn
      : metaName;
  const facetName =
    lang === "zh" && displayPrefs.zhDisplay.filterFacetLabelsWithEnglish
      ? metaNameWithEn
      : metaName;
  const schoolText =
    (facetName("schools", spell.school) || "—") +
    (spell.subSchool ? ` (${facetName("subschools", spell.subSchool)})` : "");
  const classLevelsText = spell.classLevels
    .map(
      (mcl) =>
        `${classDomainName("classes", mcl)} ${mcl.level}` +
        (mcl.extra ? ` (${mcl.extra})` : "") +
        (mcl.prestige ? ` (P)` : ""),
    )
    .join(", ");
  const domainLevelsText = spell.domainLevels
    .map(
      (mdl) =>
        `${classDomainName("domains", mdl)} ${mdl.level}` +
        (mdl.extra ? ` (${mdl.extra})` : ""),
    )
    .join(", ");
  const componentMarkers = getSpecialComponentMarkers(spell.components);
  const resolvedDetailMode =
    detailMode ??
    (showDetails === undefined
      ? displayPrefs.spellCardDetails
      : showDetails
        ? "full"
        : "summary");
  const resolvedDensity = density ?? displayPrefs.spellListDensity;
  const showFullDetails = resolvedDetailMode === "full";
  return (
    <div
      className={cn(
        "transition-colors hover:bg-muted/40",
        resolvedDensity === "compact" ? "px-3 py-2.5" : "p-4",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/spells/${spell.id}`}
            className="font-medium leading-5 hover:underline"
          >
            {displayName}
          </Link>
          {componentMarkers.map((marker) => (
            <Badge
              key={marker}
              variant="outline"
              className="inline-flex h-4 items-center rounded-sm px-1.5 text-[10px] font-semibold leading-none text-muted-foreground"
            >
              {marker}
            </Badge>
          ))}
          <span className="text-xs font-medium text-muted-foreground">
            {source.abbr}
          </span>
          {shortDescription && (
            <span className="basis-full text-sm leading-5 text-foreground/80 sm:basis-auto sm:flex-1">
              {shortDescription}
            </span>
          )}
        </div>

        {showFullDetails && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5 text-xs leading-5 text-muted-foreground">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="font-medium text-foreground/75">
                  {schoolText}
                </span>
                {spell.descriptors?.map((d) => (
                  <Badge key={d.id} variant="secondary" className="text-xs">
                    {facetName("descriptors", d)}
                  </Badge>
                ))}
              </div>

              {classLevelsText && (
                <div className="line-clamp-2">{classLevelsText}</div>
              )}

              {domainLevelsText && (
                <div className="line-clamp-2">{domainLevelsText}</div>
              )}
            </div>

            {showActions && (
              <SpellActionButtons
                spellId={spell.id}
                orientation="horizontal"
                className="sm:justify-end"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
