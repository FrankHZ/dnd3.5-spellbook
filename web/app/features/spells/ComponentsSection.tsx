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
    components.V && t("V"),
    components.S && t("S"),
    components.M && t("M"),
    components.AF && t("AF"),
    components.DF && t("DF"),
    components.XP && t("XP"),
    components.metabreath && t("Metabreath"),
    components.truename && t("Truename"),
    components.corrupt && t("Corrupt"),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-2">
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
        <div className="text-sm text-muted-foreground">{components.extra}</div>
      )}
    </div>
  );
}
