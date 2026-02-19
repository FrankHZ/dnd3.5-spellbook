import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import { getEffectivePreparedLevel } from "./prepared-derivation";
import { summarizePreparedEntry } from "./prepared-entry-summary";

type DetailedCopyRow = {
  spellId: number;
  nameEn: string;
  nameZh: string;
  level: number;
  preparedCount: number;
  usedCount: number;
  displayName: string;
  metamagic: string;
  levelAdj: number;
  notes: string;
};

function sanitizeCell(value: string): string {
  return value.replace(/\r\n|\r|\n/g, " ").replace(/\t/g, " ").trim();
}

function toTsv(lines: string[][]): string {
  return lines.map((line) => line.map(sanitizeCell).join("\t")).join("\n");
}

export function buildSimplePreparedTsv({
  columns,
  byId,
  getVisibleName,
}: {
  columns: PreparedEntry[][];
  byId: Map<number, SpellItemView>;
  getVisibleName: (spell: SpellItemView) => string;
}): string {
  const header = Array.from(
    { length: 10 },
    (_, level) => `Level ${level}`,
  );
  const maxRows = columns.reduce(
    (max, col) => Math.max(max, col?.length ?? 0),
    0,
  );

  const lines: string[][] = [header];
  for (let row = 0; row < maxRows; row++) {
    const rowCells: string[] = [];
    for (let level = 0; level < 10; level++) {
      const entry = columns[level]?.[row];
      if (!entry) {
        rowCells.push("");
        continue;
      }
      const spell = byId.get(entry.spellId);
      if (!spell) {
        rowCells.push("");
        continue;
      }
      const summary = summarizePreparedEntry(entry, getVisibleName(spell));
      rowCells.push(summary.effectiveDisplayName);
    }
    lines.push(rowCells);
  }

  return toTsv(lines);
}

function toDetailedRow({
  entry,
  spell,
  selectedClassIds,
  selectedDomainIds,
  getVisibleName,
}: {
  entry: PreparedEntry;
  spell: SpellItemView;
  selectedClassIds: number[];
  selectedDomainIds: number[];
  getVisibleName: (spell: SpellItemView) => string;
}): DetailedCopyRow {
  const summary = summarizePreparedEntry(entry, getVisibleName(spell));
  const level = getEffectivePreparedLevel(
    entry,
    spell,
    selectedClassIds,
    selectedDomainIds,
  );
  const baseLevel = getEffectivePreparedLevel(
    {
      ...entry,
      levelOverride: undefined,
      metamagic: [],
    },
    spell,
    selectedClassIds,
    selectedDomainIds,
  );

  return {
    spellId: spell.id,
    nameEn: spell.name,
    nameZh: spell.i18n?.name ?? "",
    level,
    preparedCount: 1,
    usedCount: entry.state === "used" ? 1 : 0,
    displayName: summary.effectiveDisplayName,
    metamagic: summary.hasMetamagic ? summary.metamagicSummary : "",
    levelAdj: level - baseLevel,
    notes: entry.notes ?? "",
  };
}

function rowKey(row: DetailedCopyRow): string {
  return [
    row.spellId,
    row.nameEn,
    row.nameZh,
    row.level,
    row.displayName,
    row.metamagic,
    row.levelAdj,
    row.notes,
  ].join("\u001f");
}

export function buildDetailedPreparedTsv({
  entries,
  byId,
  selectedClassIds,
  selectedDomainIds,
  aggregateRows,
  getVisibleName,
}: {
  entries: PreparedEntry[];
  byId: Map<number, SpellItemView>;
  selectedClassIds: number[];
  selectedDomainIds: number[];
  aggregateRows: boolean;
  getVisibleName: (spell: SpellItemView) => string;
}): string {
  const header = [
    "SpellId",
    "Name (EN)",
    "Name (ZH)",
    "Level",
    "PreparedCount",
    "UsedCount",
    "DisplayName",
    "Metamagic",
    "LevelAdj",
    "Notes",
  ];
  const lines: string[][] = [header];

  if (!aggregateRows) {
    for (const entry of entries) {
      const spell = byId.get(entry.spellId);
      if (!spell) continue;
      const row = toDetailedRow({
        entry,
        spell,
        selectedClassIds,
        selectedDomainIds,
        getVisibleName,
      });
      lines.push([
        String(row.spellId),
        row.nameEn,
        row.nameZh,
        String(row.level),
        String(row.preparedCount),
        String(row.usedCount),
        row.displayName,
        row.metamagic,
        String(row.levelAdj),
        row.notes,
      ]);
    }
    return toTsv(lines);
  }

  const grouped = new Map<string, DetailedCopyRow>();
  for (const entry of entries) {
    const spell = byId.get(entry.spellId);
    if (!spell) continue;
    const row = toDetailedRow({
      entry,
      spell,
      selectedClassIds,
      selectedDomainIds,
      getVisibleName,
    });
    const key = rowKey(row);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, row);
      continue;
    }
    existing.preparedCount += 1;
    existing.usedCount += row.usedCount;
  }

  for (const row of grouped.values()) {
    lines.push([
      String(row.spellId),
      row.nameEn,
      row.nameZh,
      String(row.level),
      String(row.preparedCount),
      String(row.usedCount),
      row.displayName,
      row.metamagic,
      String(row.levelAdj),
      row.notes,
    ]);
  }

  return toTsv(lines);
}
