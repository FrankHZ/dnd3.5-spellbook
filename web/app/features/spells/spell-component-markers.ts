import type { SpellComponents } from "@dnd/contracts";

export function getSpecialComponentMarkers(components: SpellComponents) {
  return [
    components.M && "M",
    components.AF && "AF",
    components.DF && "DF",
    components.XP && "XP",
    components.metabreath && "MB",
    components.truename && "TN",
    components.corrupt && "C",
  ].filter(Boolean) as string[];
}
