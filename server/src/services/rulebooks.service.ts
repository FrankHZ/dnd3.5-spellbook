import type {
  Edition,
  PublicationCategory,
  PublicationReviewStatus,
  PublicationSourceKind,
  Rulebook,
} from "@dnd/contracts";
import { DEFAULT_DND_EDITION_SLUG, DND_SYSTEM } from "#server/config/constant";
import { contentPrisma } from "#server/lib/content-prisma-client";
import { rulesPrisma as prisma } from "#server/lib/rules-prisma-client";

let cachedRulebooksPromise: Promise<Rulebook[]> | null = null;
let cachedEditionsPromise: Promise<Edition[]> | null = null;

async function loadRulebooks(): Promise<Rulebook[]> {
  if (!cachedRulebooksPromise) {
    cachedRulebooksPromise = (async () => {
      const rulebooks = await prisma.rulebook.findMany({
        where: { spells: { some: {} }, edition: { system: DND_SYSTEM } },
        select: {
          id: true,
          name: true,
          abbr: true,
          slug: true,
          edition: {
            select: {
              id: true,
              name: true,
              slug: true,
              system: true,
              core: true,
            },
          },
        },
        orderBy: [{ id: "asc" }],
      });
      const displayRows = await contentPrisma.rulebookContent.findMany({
        where: { legacyRulebookId: { in: rulebooks.map((row) => row.id) } },
        select: {
          legacyRulebookId: true,
          displayAbbr: true,
          displayName: true,
          publicationCategory: true,
          publicationFamily: true,
          publicationSourceKind: true,
          publicationDisplayOrder: true,
          publicationReviewStatus: true,
        },
      });
      const displayByRulebookId = new Map(
        displayRows.map((row) => [row.legacyRulebookId, row]),
      );

      return rulebooks.map((rulebook) => {
        const display = displayByRulebookId.get(rulebook.id);
        return {
          ...rulebook,
          ...(display?.displayAbbr ? { displayAbbr: display.displayAbbr } : {}),
          ...(display?.displayName ? { displayName: display.displayName } : {}),
          ...(display
            ? {
                publicationCategory: toPublicationCategory(
                  display.publicationCategory,
                ),
                publicationFamily: display.publicationFamily,
                publicationSourceKind: toPublicationSourceKind(
                  display.publicationSourceKind,
                ),
                publicationDisplayOrder: display.publicationDisplayOrder,
                publicationReviewStatus: toPublicationReviewStatus(
                  display.publicationReviewStatus,
                ),
              }
            : {}),
        };
      });
    })().catch((err) => {
        cachedRulebooksPromise = null;
        throw err;
      });
  }
  return cachedRulebooksPromise;
}

export async function getDefaultRulebookIds(): Promise<number[]> {
  const rulebooks = (await loadRulebooks()).filter(
    (r) => r.edition.slug === DEFAULT_DND_EDITION_SLUG,
  );

  return rulebooks.map((r) => r.id);
}

export const rulebooksService = {
  async listRulebooks(): Promise<Rulebook[]> {
    return loadRulebooks();
  },
  async listRulebookEditions(): Promise<Edition[]> {
    if (!cachedEditionsPromise) {
      cachedEditionsPromise = prisma.edition
        .findMany({
          select: {
            id: true,
            name: true,
            system: true,
            slug: true,
            core: true,
          },
          orderBy: [{ id: "asc" }],
        })
        .catch((err) => {
          cachedEditionsPromise = null;
          throw err;
        });
    }
    return cachedEditionsPromise;
  },
};

function toPublicationCategory(value: string): PublicationCategory {
  if (
    value === "core" ||
    value === "supplement" ||
    value === "setting" ||
    value === "magazine" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
}

function toPublicationSourceKind(value: string): PublicationSourceKind {
  if (
    value === "rulebook" ||
    value === "magazine" ||
    value === "web" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
}

function toPublicationReviewStatus(value: string): PublicationReviewStatus {
  if (value === "accepted" || value === "review" || value === "deferred") {
    return value;
  }
  return "review";
}
