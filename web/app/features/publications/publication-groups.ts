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

export type PublicationSort = "date" | "abbr";

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

export function getPublicationAbbr(rulebook: Rulebook) {
  return rulebook.displayAbbr?.trim() || rulebook.abbr;
}

const ABBR_COLLATOR = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function comparePublicationAbbr(a: Rulebook, b: Rulebook) {
  return (
    ABBR_COLLATOR.compare(getPublicationAbbr(a), getPublicationAbbr(b)) ||
    a.abbr.localeCompare(b.abbr) ||
    a.id - b.id
  );
}

function comparePublicationDate(a: Rulebook, b: Rulebook) {
  const aDate = a.publicationDate ?? a.publicationYear;
  const bDate = b.publicationDate ?? b.publicationYear;

  if (aDate && bDate) return aDate.localeCompare(bDate);
  if (aDate) return -1;
  if (bDate) return 1;
  return 0;
}

function compareRulebooks(a: Rulebook, b: Rulebook, sort: PublicationSort) {
  if (sort === "abbr") return comparePublicationAbbr(a, b);
  return comparePublicationDate(a, b) || comparePublicationAbbr(a, b);
}

export function groupRulebooksByPublication(
  rulebooks: Rulebook[],
  sort: PublicationSort = "date",
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
            compareRulebooks(a, b, sort),
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
