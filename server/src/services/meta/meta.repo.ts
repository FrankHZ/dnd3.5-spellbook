import { appPrisma } from "~/lib/app-prisma-client";
import { I18nContext, Lang } from "@dnd/contracts";
import { Prisma } from "DB_APP/client";

function normalizeVariant(variant?: string) {
  return variant ?? "default";
}

/**
 * Rule: meta endpoint is only meaningful when lang !== 'en'.
 * Repo doesn't enforce that; service can skip calling repo when lang==='en'.
 */
export async function queryMetaI18nOverlays(input: {
  lang: Exclude<Lang, "en">;
  variant?: string | undefined;
}) {
  const variant = normalizeVariant(input.variant);

  const [rulebooks, classes, domains, schools, subschools, descriptors] =
    await Promise.all([
      appPrisma.i18nRulebookText.findMany({
        where: { lang: input.lang, variant },
        select: { rulebookId: true, name: true }, // abbr optional if exists
      }),

      appPrisma.i18nCharacterClassText.findMany({
        where: { lang: input.lang, variant },
        select: { classId: true, name: true },
      }),

      appPrisma.i18nDomainText.findMany({
        where: { lang: input.lang, variant },
        select: { domainId: true, name: true },
      }),

      appPrisma.i18nSpellSchoolText.findMany({
        where: { lang: input.lang, variant },
        select: { schoolId: true, name: true },
      }),

      appPrisma.i18nSpellSubschoolText.findMany({
        where: { lang: input.lang, variant },
        select: { subschoolId: true, name: true },
      }),

      appPrisma.i18nDescriptorText.findMany({
        where: { lang: input.lang, variant },
        select: { descriptorId: true, name: true },
      }),
    ]);

  return { rulebooks, classes, domains, schools, subschools, descriptors };
}
