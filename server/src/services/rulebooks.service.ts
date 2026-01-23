import { DEFAULT_DND_EDITION_SLUG, DND_SYSTEM } from "../config/constant";
import { prisma } from "../prisma";

let cachedRulebooksPromise: Promise<RulebookListItemDTO[]> | null = null;
let cachedEditionsPromise: Promise<RulebookEditionDTO[]> | null = null;

export type RulebookListItemDTO = {
  id: number;
  name: string;
  abbr: string;
  slug: string;
  edition: RulebookEditionDTO;
};

export type RulebookEditionDTO = {
  id: number;
  name: string;
  system: string;
  slug: string;
  core: boolean;
};

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
        orderBy: [{ abbr: "asc" }, { name: "asc" }, { id: "asc" }],
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
  async listRulebooks(): Promise<RulebookListItemDTO[]> {
    return loadRulebooks();
  },
  async listRulebookEditions(): Promise<RulebookEditionDTO[]> {
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
