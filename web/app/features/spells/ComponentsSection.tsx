import type { SpellComponents } from "@dnd/contracts";
import { useTranslation } from "react-i18next";

import { SpellComponentBadge } from "./SpellComponentBadge";
import { getSpellComponentDisplayItems } from "./spell-component-markers";

export default function ComponentsSection({
  components,
}: {
  components: SpellComponents;
}) {
  const { t } = useTranslation("spell-detail");
  const chips = getSpellComponentDisplayItems(components);

  function getComponentFullLabel(item: (typeof chips)[number]) {
    switch (item.id) {
      case "verbal":
        return t("components.full.verbal");
      case "somatic":
        return t("components.full.somatic");
      case "material":
        return t("components.full.material");
      case "arcane-focus":
        return t("components.full.arcane-focus");
      case "divine-focus":
        return t("components.full.divine-focus");
      case "xp":
        return t("components.full.xp");
      case "metabreath":
        return t("components.full.metabreath");
      case "truename":
        return t("components.full.truename");
      case "corrupt":
        return t("components.full.corrupt");
      default:
        return item.marker;
    }
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("sections.components")}
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((item) => (
            <SpellComponentBadge key={item.id} size="regular">
              {getComponentFullLabel(item)}
            </SpellComponentBadge>
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
