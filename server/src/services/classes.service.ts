import { prisma } from "../prisma";
import { type Class } from "@dnd/contracts";

export const classesService = {
  async listClasses(input: {
    includePrestige: boolean;
  }): Promise<Class[]> {
    const where = input.includePrestige ? {} : { prestige: false };

    const classes = await prisma.characterClass.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        prestige: true,
      },
      orderBy: [{ prestige: "asc" }, { name: "asc" }, { id: "asc" }],
    });

    return classes;
  },
};
