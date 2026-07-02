import { contentPrisma } from "~/lib/content-prisma-client";
import { I18nContext, Lang } from "@dnd/contracts";
import { Prisma } from "DB_CONTENT/client";

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
      contentPrisma.i18nRulebookText.findMany({
        where: { lang: input.lang, variant },
        select: { rulebookId: true, name: true }, // abbr optional if exists
      }),

      contentPrisma.i18nCharacterClassText.findMany({
        where: { lang: input.lang, variant },
        select: { classId: true, name: true },
      }),

      contentPrisma.i18nDomainText.findMany({
        where: { lang: input.lang, variant },
        select: { domainId: true, name: true },
      }),

      contentPrisma.i18nSpellSchoolText.findMany({
        where: { lang: input.lang, variant },
        select: { schoolId: true, name: true },
      }),

      contentPrisma.i18nSpellSubschoolText.findMany({
        where: { lang: input.lang, variant },
        select: { subschoolId: true, name: true },
      }),

      contentPrisma.i18nDescriptorText.findMany({
        where: { lang: input.lang, variant },
        select: { descriptorId: true, name: true },
      }),
    ]);

  return { rulebooks, classes, domains, schools, subschools, descriptors };
}
