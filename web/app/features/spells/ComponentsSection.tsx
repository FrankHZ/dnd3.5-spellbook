import type { SpellComponents } from "@dnd/contracts";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";

export default function ComponentsSection({
  components,
}: {
  components: SpellComponents;
}) {
  const { t } = useTranslation("spell-detail");
  const chips = [
    components.V && t("components.verbal"),
    components.S && t("components.somatic"),
    components.M && t("components.material"),
    components.AF && t("components.arcane-focus"),
    components.DF && t("components.divine-focus"),
    components.XP && t("components.xp"),
    components.metabreath && t("components.metabreath"),
    components.truename && t("components.truename"),
    components.corrupt && t("components.corrupt"),
  ].filter(Boolean) as string[];

  return (
    <section className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("sections.components")}
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <Badge key={c} variant="outline" className="text-xs">
              {c}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">—</div>
      )}

      {components.extra && components.extra.trim().length > 0 && (
        <div className="text-sm leading-5 text-muted-foreground">
          {components.extra}
        </div>
      )}
    </section>
  );
}
