import { rulesPrisma } from "~/lib/rules-prisma-client";
import {
  ClassView,
  I18nContext,
  I18nNameOverlay,
  ClassListResponse,
} from "@dnd/contracts";
import { contentPrisma } from "~/lib/content-prisma-client";

export const classesService = {
  async listClasses(input: {
    includePrestige: boolean;
    rulebookIds: number[];
    i18n: I18nContext;
  }): Promise<ClassListResponse> {
    const indexRows = await rulesPrisma.spellClassIndex.findMany({
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
    const i18n = input.i18n;

    const classes = await rulesPrisma.characterClass.findMany({
      where: {
        id: { in: classIds },
        ...(input.includePrestige ? {} : { prestige: false }),
      },
      orderBy: [{ prestige: "asc" }, { name: "asc" }, { id: "asc" }],
    });

    let overlayById = new Map<number, I18nNameOverlay>();
    const filteredClassIds = classes.map((c) => c.id);

    if (i18n.lang !== "en") {
      const rows = await contentPrisma.i18nCharacterClassText.findMany({
        where: {
          classId: { in: filteredClassIds },
          lang: i18n.lang, // "zh"
          ...(i18n.variant
            ? { variant: i18n.variant }
            : { variant: "default" }),
        },
        select: { classId: true, lang: true, variant: true, name: true },
      });

      overlayById = new Map(
        rows.map((r) => [
          r.classId,
          {
            lang: "zh",
            variant: r.variant ?? undefined,
            name: r.name ?? undefined,
          },
        ]),
      );
    }

    const items: ClassView[] = classes.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      prestige: c.prestige,
      i18n: overlayById.get(c.id),
    }));

    return {
      includePrestige: input.includePrestige,
      rulebookIds: input.rulebookIds,
      items,
    };
  },
};
