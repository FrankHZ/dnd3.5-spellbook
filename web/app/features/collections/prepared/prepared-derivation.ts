import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";

const PREPARED_MIN_LEVEL = 0;
const PREPARED_MAX_LEVEL = 9;

function clampPreparedLevel(level: number): number {
  if (level < PREPARED_MIN_LEVEL || level > PREPARED_MAX_LEVEL) return 0;
  return level;
}

export function getPreparedSpellIds(entries: PreparedEntry[]): number[] {
  const set = new Set<number>();
  for (const entry of entries) set.add(entry.spellId);
  return Array.from(set);
}

function getDerivedPreparedLevelWithSets(
  spell: SpellItemView,
  selectedClassSet: Set<number>,
  selectedDomainSet: Set<number>,
): number {
  const selectedClassLvls: number[] = [];
  for (const cl of spell.classLevels ?? []) {
    if (selectedClassSet.has(cl.id) && typeof cl.level === "number") {
      selectedClassLvls.push(cl.level);
    }
  }
  if (selectedClassLvls.length > 0) {
    return clampPreparedLevel(Math.min(...selectedClassLvls));
  }

  const selectedDomainLvls: number[] = [];
  for (const dl of spell.domainLevels ?? []) {
    if (selectedDomainSet.has(dl.id) && typeof dl.level === "number") {
      selectedDomainLvls.push(dl.level);
    }
  }
  if (selectedDomainLvls.length > 0) {
    return clampPreparedLevel(Math.min(...selectedDomainLvls));
  }

  // fallback: lowest possible level across all available sources
  const nums: number[] = [];
  for (const cl of spell.classLevels ?? []) {
    if (typeof cl.level === "number") nums.push(cl.level);
  }
  for (const dl of spell.domainLevels ?? []) {
    if (typeof dl.level === "number") nums.push(dl.level);
  }
  if (spell.corrupt?.level != null && typeof spell.corrupt.level === "number") {
    nums.push(spell.corrupt.level);
  }

  if (nums.length === 0) return 0;
  return clampPreparedLevel(Math.min(...nums));
}

export function getDerivedPreparedLevel(
  spell: SpellItemView,
  selectedClassIds: number[],
  selectedDomainIds: number[],
): number {
  return getDerivedPreparedLevelWithSets(
    spell,
    new Set(selectedClassIds),
    new Set(selectedDomainIds),
  );
}

export function buildPreparedColumns({
  entries,
  spellsById,
  selectedClassIds,
  selectedDomainIds,
}: {
  entries: PreparedEntry[];
  spellsById: Map<number, SpellItemView>;
  selectedClassIds: number[];
  selectedDomainIds: number[];
}): PreparedEntry[][] {
  const cols: PreparedEntry[][] = Array.from(
    { length: PREPARED_MAX_LEVEL + 1 },
    () => [],
  );
  const selectedClassSet = new Set(selectedClassIds);
  const selectedDomainSet = new Set(selectedDomainIds);

  for (const entry of entries) {
    const spell = spellsById.get(entry.spellId);
    const level = spell
      ? getDerivedPreparedLevelWithSets(spell, selectedClassSet, selectedDomainSet)
      : 0;
    cols[level].push(entry);
  }

  return cols;
}
