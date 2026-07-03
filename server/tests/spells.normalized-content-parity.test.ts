import {
  fetchSpellsInOrder,
  queryByClassAndDomainWithLevel,
  queryByExactNames,
  queryIdsByName,
  querySpellDetail,
  querySpellsByIds,
  SELECT_SPELL_LIST,
} from "~/services/spells/spells.repo.rules";
import {
  fetchNormalizedSpellsInOrder,
  queryNormalizedByClassAndDomainWithLevel,
  queryNormalizedByExactNames,
  queryNormalizedIdsByName,
  queryNormalizedSpellDetail,
  queryNormalizedSpellsByIds,
} from "~/services/spells/spells.repo.normalized-content";
import { mapSpellDetail, mapSpellItem } from "~/services/spells/spells.mapper";

const emptyTaxonomyFilters = {
  schoolIds: [],
  subschoolIds: [],
  descriptorIds: [],
};

describe("normalized rules content repository parity", () => {
  it("matches legacy name search ids and item DTOs", async () => {
    const legacyIds = await queryIdsByName(
      "fire",
      [4, 6],
      emptyTaxonomyFilters,
      100,
    );
    const normalizedIds = await queryNormalizedIdsByName(
      "fire",
      [4, 6],
      emptyTaxonomyFilters,
      100,
    );

    expect(normalizedIds).toEqual(legacyIds);

    const [legacyRows, normalizedRows] = await Promise.all([
      fetchSpellsInOrder(legacyIds, SELECT_SPELL_LIST),
      fetchNormalizedSpellsInOrder(normalizedIds),
    ]);

    expect(normalizedRows.map((row) => mapSpellItem(row, null, null))).toEqual(
      legacyRows.map((row) => mapSpellItem(row, null, null)),
    );
  });

  it("matches legacy class-level browse rows for a scoped page", async () => {
    const legacy = await queryByClassAndDomainWithLevel(
      [1],
      [],
      3,
      [4],
      emptyTaxonomyFilters,
      1,
      20,
    );
    const normalized = await queryNormalizedByClassAndDomainWithLevel(
      [1],
      [],
      3,
      [4],
      emptyTaxonomyFilters,
      1,
      20,
    );

    expect(normalized.total).toBe(legacy.total);
    expect(normalized.spellsInOrder.map((spell) => spell.id)).toEqual(
      legacy.spellsInOrder.map((spell) => spell.id),
    );
  });

  it("matches legacy detail DTOs", async () => {
    const [legacy, normalized] = await Promise.all([
      querySpellDetail(1),
      queryNormalizedSpellDetail(1),
    ]);

    expect(legacy).not.toBeNull();
    expect(normalized).not.toBeNull();
    expect(mapSpellDetail(normalized!, null, null)).toEqual(
      mapSpellDetail(legacy!, null, null),
    );
  });

  it("matches legacy batch lookup presence for selected ids", async () => {
    const ids = [1, 2, 999999];
    const [legacyRows, normalizedRows] = await Promise.all([
      querySpellsByIds(ids),
      queryNormalizedSpellsByIds(ids),
    ]);

    const legacyFound = new Set(legacyRows.map((row) => row.id));
    const normalizedFound = new Set(normalizedRows.map((row) => row.id));
    expect(normalizedFound).toEqual(legacyFound);
    expect(ids.filter((id) => !normalizedFound.has(id))).toEqual(
      ids.filter((id) => !legacyFound.has(id)),
    );
  });

  it("matches legacy exact-name ambiguity candidates", async () => {
    const [legacyRows, normalizedRows] = await Promise.all([
      queryByExactNames(["Last Breath"], [6, 56]),
      queryNormalizedByExactNames(["Last Breath"], [6, 56]),
    ]);

    expect(normalizedRows.map((row) => row.id).sort((a, b) => a - b)).toEqual(
      legacyRows.map((row) => row.id).sort((a, b) => a - b),
    );
    expect(normalizedRows).toHaveLength(2);
  });
});
