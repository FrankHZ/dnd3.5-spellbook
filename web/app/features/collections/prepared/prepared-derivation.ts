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

function getEffectivePreparedLevelWithSets(
  entry: PreparedEntry,
  spell: SpellItemView,
  selectedClassSet: Set<number>,
  selectedDomainSet: Set<number>,
): number {
  if (typeof entry.levelOverride === "number") {
    return clampPreparedLevel(entry.levelOverride);
  }

  const selectedClassLvls: number[] = [];
  for (const cl of spell.classLevels ?? []) {
    if (selectedClassSet.has(cl.id) && typeof cl.level === "number") {
      selectedClassLvls.push(cl.level);
    }
  }
  const selectedDomainLvls: number[] = [];
  for (const dl of spell.domainLevels ?? []) {
    if (selectedDomainSet.has(dl.id) && typeof dl.level === "number") {
      selectedDomainLvls.push(dl.level);
    }
  }

  const selectedLvls = [...selectedClassLvls, ...selectedDomainLvls];
  const metamagicLevelAdj = (entry.metamagic ?? []).reduce(
    (sum, tag) => sum + (typeof tag.levelAdj === "number" ? tag.levelAdj : 0),
    0,
  );

  if (selectedLvls.length > 0) {
    return clampPreparedLevel(Math.min(...selectedLvls) + metamagicLevelAdj);
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

  if (nums.length === 0) return clampPreparedLevel(metamagicLevelAdj);
  return clampPreparedLevel(Math.min(...nums) + metamagicLevelAdj);
}

export function getEffectivePreparedLevel(
  entry: PreparedEntry,
  spell: SpellItemView,
  selectedClassIds: number[],
  selectedDomainIds: number[],
): number {
  return getEffectivePreparedLevelWithSets(
    entry,
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
      ? getEffectivePreparedLevelWithSets(
          entry,
          spell,
          selectedClassSet,
          selectedDomainSet,
        )
      : 0;
    cols[level].push(entry);
  }

  return cols;
}
