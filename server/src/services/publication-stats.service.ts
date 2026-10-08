import type {
  PublicationStats,
  PublicationClassSource,
  I18nContext,
  I18nNameOverlay,
} from "@dnd/contracts";
import { contentPrisma } from "#server/lib/content-prisma-client";
import { rulesPrisma } from "#server/lib/rules-prisma-client";
import { DND_SYSTEM } from "#server/config/constant";

export async function listPublicationStats(
  i18n: I18nContext,
): Promise<PublicationStats[]> {
  // Fixed aggregate queries, independent of browse's spell-availability scope.
  const [books, counts, tables] = await Promise.all([
    rulesPrisma.rulebook.findMany({
      where: { edition: { system: DND_SYSTEM } },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
    contentPrisma.$queryRaw<Array<{ rulebookId: number; count: bigint }>>`
      SELECT sourceRulebookId AS rulebookId, COUNT(DISTINCT id) AS count
      FROM SpellContent GROUP BY sourceRulebookId`,
    contentPrisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type = 'table'
        AND name IN ('ClassSourceImport', 'ClassSourceMapping')`,
  ]);
  // Unmigrated/unactivated operator DBs honestly return unknown source coverage.
  const imported =
    tables.length === 2
      ? await contentPrisma.classSourceImport.findUnique({ where: { id: 1 } })
      : null;
  const rows = imported
    ? await contentPrisma.classSourceMapping.findMany({
        select: {
          rulebookId: true,
          classId: true,
          variantId: true,
          name: true,
          slug: true,
          prestige: true,
          listKind: true,
          disposition: true,
          relation: true,
        },
        orderBy: [{ name: "asc" }, { classId: "asc" }, { variantId: "asc" }],
      })
    : [];
  const overlays =
    i18n.lang === "en" || !rows.length
      ? []
      : await contentPrisma.i18nCharacterClassText.findMany({
          where: {
            classId: {
              in: [
                ...new Set(
                  rows
                    .filter((row) => row.disposition === "supported")
                    .map((row) => row.classId),
                ),
              ],
            },
            lang: i18n.lang,
            variant: i18n.variant ?? "default",
          },
          select: { classId: true, name: true, variant: true },
        });
  const names = new Map<number, I18nNameOverlay>(
    overlays.map((row) => [
      row.classId,
      {
        lang: "zh",
        variant: row.variant,
        name: row.name ?? undefined,
      },
    ]),
  );
  const byBook = new Map<number, typeof rows>();
  for (const row of rows) {
    const group = byBook.get(row.rulebookId) ?? [];
    group.push(row);
    byBook.set(row.rulebookId, group);
  }
  const countByBook = new Map(
    counts.map((row) => [row.rulebookId, Number(row.count)]),
  );
  return books.map((book) => {
    const group = byBook.get(book.id) ?? [];
    return {
      rulebookId: book.id,
      siteSpellCount: countByBook.get(book.id) ?? 0,
      classSources: {
        coverage: group.length ? "bounded-candidates" : "unknown",
        inventoryComplete: false,
        handoffRevision: imported?.handoffRevision ?? null,
        supported: group
          .filter((row) => row.disposition === "supported")
          .map((row) => ({
            classId: row.classId,
            variantId: row.variantId,
            name: row.name,
            slug: row.slug,
            prestige: row.prestige,
            listKind: row.listKind as PublicationClassSource["listKind"],
            i18n: names.get(row.classId),
            relation: row.relation as PublicationClassSource["relation"],
          })),
        excludedCandidateCount: group.filter(
          (row) => row.disposition === "excluded",
        ).length,
        uncertainCandidateCount: group.filter(
          (row) => row.disposition === "source-uncertain",
        ).length,
      },
    };
  });
}
