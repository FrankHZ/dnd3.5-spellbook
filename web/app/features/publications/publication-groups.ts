import type { PublicationCategory, Rulebook } from "@dnd/contracts";

export type PublicationFamilyGroup = {
  key: string;
  label: string;
  displayOrder: number;
  rulebooks: Rulebook[];
};

export type PublicationCategoryGroup = {
  key: PublicationCategory;
  displayOrder: number;
  rulebooks: Rulebook[];
  families: PublicationFamilyGroup[];
};

const CATEGORY_ORDER: PublicationCategory[] = [
  "core",
  "supplement",
  "setting",
  "magazine",
  "other",
];

const CATEGORY_RANK = new Map(
  CATEGORY_ORDER.map((category, index) => [category, index]),
);

function normalizeFamily(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || "other";
}

export function formatPublicationFamily(value: string) {
  return normalizeFamily(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRulebookPublicationCategory(
  rulebook: Rulebook,
): PublicationCategory {
  return rulebook.publicationCategory ?? "other";
}

function getRulebookDisplayOrder(rulebook: Rulebook) {
  return rulebook.publicationDisplayOrder ?? 90000;
}

function compareRulebooks(
  displayLabel: (rulebook: Rulebook) => string,
  a: Rulebook,
  b: Rulebook,
) {
  return (
    getRulebookDisplayOrder(a) - getRulebookDisplayOrder(b) ||
    (a.publicationDate ?? "").localeCompare(b.publicationDate ?? "") ||
    (a.publicationYear ?? "").localeCompare(b.publicationYear ?? "") ||
    displayLabel(a).localeCompare(displayLabel(b)) ||
    a.abbr.localeCompare(b.abbr) ||
    a.id - b.id
  );
}

export function groupRulebooksByPublication(
  rulebooks: Rulebook[],
  displayLabel: (rulebook: Rulebook) => string,
): PublicationCategoryGroup[] {
  const categories = new Map<
    PublicationCategory,
    Map<string, PublicationFamilyGroup>
  >();

  for (const rulebook of rulebooks) {
    const category = getRulebookPublicationCategory(rulebook);
    const categoryFamilies =
      categories.get(category) ?? new Map<string, PublicationFamilyGroup>();
    categories.set(category, categoryFamilies);

    const familyKey = normalizeFamily(rulebook.publicationFamily);
    const family = categoryFamilies.get(familyKey);
    if (family) {
      family.rulebooks.push(rulebook);
      family.displayOrder = Math.min(
        family.displayOrder,
        getRulebookDisplayOrder(rulebook),
      );
    } else {
      categoryFamilies.set(familyKey, {
        key: familyKey,
        label: formatPublicationFamily(familyKey),
        displayOrder: getRulebookDisplayOrder(rulebook),
        rulebooks: [rulebook],
      });
    }
  }

  return Array.from(categories.entries())
    .map(([category, familyMap]) => {
      const families = Array.from(familyMap.values())
        .map((family) => ({
          ...family,
          rulebooks: family.rulebooks.sort((a, b) =>
            compareRulebooks(displayLabel, a, b),
          ),
        }))
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder ||
            a.label.localeCompare(b.label) ||
            a.key.localeCompare(b.key),
        );
      const rulebooks = families.flatMap((family) => family.rulebooks);
      return {
        key: category,
        displayOrder:
          families[0]?.displayOrder ??
          CATEGORY_RANK.get(category) ??
          CATEGORY_RANK.get("other") ??
          99,
        families,
        rulebooks,
      };
    })
    .sort(
      (a, b) =>
        (CATEGORY_RANK.get(a.key) ?? 99) - (CATEGORY_RANK.get(b.key) ?? 99) ||
        a.displayOrder - b.displayOrder ||
        a.key.localeCompare(b.key),
    );
}
