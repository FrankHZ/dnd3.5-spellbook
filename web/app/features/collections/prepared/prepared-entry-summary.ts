import type { PreparedEntry } from "~/storage/collections.type";

export type PreparedEntrySummary = {
  baseName: string;
  effectiveDisplayName: string;
  hasDisplayNameOverride: boolean;
  hasMetamagic: boolean;
  hasLevelOverride: boolean;
  hasNotes: boolean;
  metamagicSummary: string;
  metamagicTotalAdj: number;
};

export function summarizePreparedEntry(
  entry: PreparedEntry,
  baseName: string,
): PreparedEntrySummary {
  const displayNameOverride = entry.displayNameOverride?.trim() ?? "";
  const effectiveDisplayName = displayNameOverride || baseName;
  const hasDisplayNameOverride = displayNameOverride.length > 0;
  const hasLevelOverride = typeof entry.levelOverride === "number";
  const hasNotes = !!entry.notes?.trim();

  const metamagic = entry.metamagic ?? [];
  const hasMetamagic = metamagic.length > 0;
  const metamagicSummary = hasMetamagic
    ? metamagic
        .map((tag) => {
          const tagName = tag.name ?? tag.key;
          return typeof tag.levelAdj === "number"
            ? `${tagName} (+${tag.levelAdj})`
            : tagName;
        })
        .join(", ")
    : "None";
  const metamagicTotalAdj = metamagic.reduce(
    (sum, tag) => sum + (typeof tag.levelAdj === "number" ? tag.levelAdj : 0),
    0,
  );

  return {
    baseName,
    effectiveDisplayName,
    hasDisplayNameOverride,
    hasMetamagic,
    hasLevelOverride,
    hasNotes,
    metamagicSummary,
    metamagicTotalAdj,
  };
}
