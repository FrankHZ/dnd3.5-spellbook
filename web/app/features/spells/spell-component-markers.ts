import type { SpellComponents } from "@dnd/contracts";

type SpellComponentFlag = keyof Pick<
  SpellComponents,
  "V" | "S" | "M" | "AF" | "DF" | "XP" | "metabreath" | "truename" | "corrupt"
>;

export type SpellComponentDisplayItem = {
  id: string;
  flag: SpellComponentFlag;
  marker: string;
  fullLabelKey: string;
  special: boolean;
};

const SPELL_COMPONENT_DISPLAY: readonly SpellComponentDisplayItem[] = [
  {
    id: "verbal",
    flag: "V",
    marker: "V",
    fullLabelKey: "components.full.verbal",
    special: false,
  },
  {
    id: "somatic",
    flag: "S",
    marker: "S",
    fullLabelKey: "components.full.somatic",
    special: false,
  },
  {
    id: "material",
    flag: "M",
    marker: "M",
    fullLabelKey: "components.full.material",
    special: true,
  },
  {
    id: "arcane-focus",
    flag: "AF",
    marker: "AF",
    fullLabelKey: "components.full.arcane-focus",
    special: true,
  },
  {
    id: "divine-focus",
    flag: "DF",
    marker: "DF",
    fullLabelKey: "components.full.divine-focus",
    special: true,
  },
  {
    id: "xp",
    flag: "XP",
    marker: "XP",
    fullLabelKey: "components.full.xp",
    special: true,
  },
  {
    id: "metabreath",
    flag: "metabreath",
    marker: "MB",
    fullLabelKey: "components.full.metabreath",
    special: true,
  },
  {
    id: "truename",
    flag: "truename",
    marker: "TN",
    fullLabelKey: "components.full.truename",
    special: true,
  },
  {
    id: "corrupt",
    flag: "corrupt",
    marker: "C",
    fullLabelKey: "components.full.corrupt",
    special: true,
  },
];

export function getSpellComponentDisplayItems(components: SpellComponents) {
  return SPELL_COMPONENT_DISPLAY.filter((item) => components[item.flag]);
}

export function getSpecialComponentMarkers(components: SpellComponents) {
  return getSpellComponentDisplayItems(components)
    .filter((item) => item.special)
    .map((item) => item.marker);
}
