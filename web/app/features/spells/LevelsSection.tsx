import type { SpellDetailView } from "@dnd/contracts";
import { useTranslation } from "react-i18next";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";

export default function LevelsSection({ spell }: { spell: SpellDetailView }) {
  const { metaName } = useMetaNames();
  const { t } = useTranslation("spell-detail");

  return (
    <section className="space-y-2">
      {(spell.classLevels?.length ?? 0) > 0 ? (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("levels.classes")}
          </div>
          <div className="text-sm leading-5">
            {spell.classLevels
              .map(
                (mcl) =>
                  `${metaName("classes", mcl)} ${mcl.level}` +
                  (mcl.extra ? ` (${mcl.extra})` : "") +
                  (mcl.prestige ? ` (P)` : ""),
              )
              .join(", ")}
          </div>
        </div>
      ) : (
        <div className="text-sm leading-5 text-muted-foreground">
          {t("levels.no-classes")}
        </div>
      )}

      {(spell.domainLevels?.length ?? 0) > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("levels.domains")}
          </div>
          <div className="text-sm leading-5">
            {spell.domainLevels
              .map((dl) => `${metaName("domains", dl)} ${dl.level}`)
              .join(", ")}
          </div>
        </div>
      )}
    </section>
  );
}
