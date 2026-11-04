import { Flag, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useCollections } from "~/state/collections-state";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { getFrontendVersionMetadata } from "~/features/about/build-metadata";
import {
  buildSpellReportUrl,
  type ReportableSpell,
} from "~/features/spells/spell-report";

export function SpellActionButtons({
  spell,
  showCollectionActions = true,
  orientation = "horizontal",
  className,
}: {
  spell: ReportableSpell;
  showCollectionActions?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const { spellbook, prepared } = useCollections();
  const { lang } = useAppI18n();
  const { t } = useTranslation(["collections", "spell-detail"]);
  const spellId = spell.id;
  const reportLabel = t("actions.report", { ns: "spell-detail" });
  const reportHint = t("actions.report-hint", { ns: "spell-detail" });
  const inFav = spellbook.isInDefault(spellId);
  const favoriteActionLabel = inFav
    ? t("favorites.remove")
    : t("favorites.add");

  function onToggleFavorite() {
    spellbook.toggleDefault(spellId);
    toast.success(favoriteActionLabel);
  }

  function onPrepare() {
    prepared.add(spellId);
    toast.success(t("prepared.added-toast"));
  }

  return (
    <div
      className={cn(
        "shrink-0 flex",
        orientation === "horizontal"
          ? "items-center gap-1"
          : "flex-col items-end gap-2",
        className,
      )}
    >
      {showCollectionActions && (
        <>
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleFavorite}
            aria-label={favoriteActionLabel}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                inFav
                  ? "fill-red-500 stroke-red-500"
                  : "stroke-muted-foreground",
              )}
            />
          </Button>

          <Button variant="outline" size="sm" onClick={onPrepare}>
            {t("prepared.prepare-action", { ns: "collections" })}
          </Button>
        </>
      )}
      <Button asChild variant="ghost" size="icon">
        <a
          href={buildSpellReportUrl({
            spell,
            lang,
            version: getFrontendVersionMetadata(),
          })}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${reportLabel} — ${reportHint}`}
          title={`${reportLabel} — ${reportHint}`}
        >
          <Flag aria-hidden="true" className="text-muted-foreground" />
        </a>
      </Button>
    </div>
  );
}
