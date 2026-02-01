import { rulesPrismaClient as prisma } from "~/lib/rules-prisma-client";
import { type DomainListResponse } from "@dnd/contracts";

export const domainsService = {
  async listDomains(input: {
    rulebookIds: number[];
  }): Promise<DomainListResponse> {
    const indexRows = await prisma.spellDomainIndex.findMany({
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

    const domains = await prisma.domain.findMany({
      where: {
        id: { in: domainIds },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return {
      rulebookIds: input.rulebookIds,
      items: domains,
    };
  },
};
