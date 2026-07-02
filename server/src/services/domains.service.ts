import { rulesPrisma } from "~/lib/rules-prisma-client";
import {
  I18nContext,
  I18nNameOverlay,
  type DomainListResponse,
} from "@dnd/contracts";
import { contentPrisma } from "~/lib/content-prisma-client";

export const domainsService = {
  async listDomains(input: {
    rulebookIds: number[];
    i18n: I18nContext;
  }): Promise<DomainListResponse> {
    const indexRows = await rulesPrisma.spellDomainIndex.findMany({
      distinct: ["domainId"],
      where: {
        rulebookId: { in: input.rulebookIds },
      },
      select: {
        domainId: true,
      },
    });
    if (indexRows.length === 0) {
      return {
        rulebookIds: input.rulebookIds,
        items: [],
      };
    }

    const domainIds = indexRows.map((r) => r.domainId);
    const i18n = input.i18n;

    const [domains, overlays] = await Promise.all([
      rulesPrisma.domain.findMany({
        where: { id: { in: domainIds } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      i18n.lang === "en"
        ? Promise.resolve([])
        : contentPrisma.i18nDomainText.findMany({
            where: {
              domainId: { in: domainIds },
              lang: i18n.lang,
              ...(i18n.variant
                ? { variant: i18n.variant }
                : { variant: "default" }),
            },
            select: {
              domainId: true,
              name: true,
              variant: true,
              lang: true,
            },
          }),
    ]);

    const overlayById = new Map<number, I18nNameOverlay>();

    for (const o of overlays) {
      overlayById.set(o.domainId, {
        lang: "zh",
        variant: o.variant ?? undefined,
        name: o.name ?? undefined,
      });
    }

    const items = domains.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      i18n: overlayById.get(d.id), // undefined if missing
    }));

    return {
      rulebookIds: input.rulebookIds,
      items,
    };
  },
};
