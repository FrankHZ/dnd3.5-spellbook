import { rulesPrismaClient as prisma } from "~/lib/rules-prisma-client";
import { type ClassListResponse } from "@dnd/contracts";

export const classesService = {
  async listClasses(input: {
    includePrestige: boolean;
    rulebookIds: number[];
  }): Promise<ClassListResponse> {
    const indexRows = await prisma.spellClassIndex.findMany({
      distinct: ["classId"],
      where: {
        rulebookId: { in: input.rulebookIds },
      },
      select: {
        classId: true,
      },
    });
    if (indexRows.length === 0) {
      return {
        includePrestige: input.includePrestige,
        rulebookIds: input.rulebookIds,
        items: [],
      };
    }
    const classIds = indexRows.map((r) => r.classId);

    const classes = await prisma.characterClass.findMany({
      where: {
        id: { in: classIds },
        ...(input.includePrestige ? {} : { prestige: false }),
      },
      orderBy: [{ prestige: "asc" }, { name: "asc" }, { id: "asc" }],
    });

    return {
      includePrestige: input.includePrestige,
      rulebookIds: input.rulebookIds,
      items: classes,
    };
  },
};
