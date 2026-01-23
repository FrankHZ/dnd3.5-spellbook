import { prisma } from '../prisma';

export type ClassListItemDTO = {
  id: number;
  slug: string;
  name: string;
  prestige: boolean;
};

export const classesService = {
  async listClasses(input: { includePrestige: boolean }): Promise<ClassListItemDTO[]> {
    const where = input.includePrestige ? {} : { prestige: false };

    const classes = await prisma.characterClass.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        prestige: true,
      },
      orderBy: [{ prestige: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });

    return classes;
  },
};
