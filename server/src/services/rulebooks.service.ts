import type { Edition, Rulebook } from "@dnd/contracts";
import { DEFAULT_DND_EDITION_SLUG, DND_SYSTEM } from "../config/constant";
import { rulesPrisma as prisma } from "../lib/rules-prisma-client";

let cachedRulebooksPromise: Promise<Rulebook[]> | null = null;
let cachedEditionsPromise: Promise<Edition[]> | null = null;

async function loadRulebooks() {
  if (!cachedRulebooksPromise) {
    cachedRulebooksPromise = prisma.rulebook
      .findMany({
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
      })
      .catch((err) => {
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
