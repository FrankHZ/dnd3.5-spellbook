import type { PreparedEntry, PreparedEntryState } from "./collections.type";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function normalizePreparedState(raw: unknown): PreparedEntryState {
  if (raw === "ok" || raw === "used" || raw === "reserved") return raw;
  if (raw && typeof raw === "object" && "used" in raw) {
    const used = (raw as { used?: unknown }).used;
    if (used === true) return "used";
    if (used === false) return "ok";
  }
  return "ok";
}

function normalizeMetamagic(raw: unknown): PreparedEntry["metamagic"] {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const key = asNonEmptyString((item as { key?: unknown }).key);
      if (!key) return null;
      const name = asNonEmptyString((item as { name?: unknown }).name) ?? undefined;
      const levelAdj =
        asNonNegativeInt((item as { levelAdj?: unknown }).levelAdj) ?? undefined;
      return { key, name, levelAdj };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  return items.length > 0 ? items : undefined;
}

export function normalizePreparedEntries(raw: unknown, bookId: string): PreparedEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PreparedEntry[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const spellId = asNonNegativeInt((item as { spellId?: unknown }).spellId);
    if (spellId == null || spellId <= 0) continue;
    const entryId =
      asNonEmptyString((item as { entryId?: unknown }).entryId) ??
      `legacy-${bookId}-${i}-${spellId}`;
    const displayNameOverride =
      asNonEmptyString((item as { displayNameOverride?: unknown }).displayNameOverride) ??
      undefined;
    const notes = asNonEmptyString((item as { notes?: unknown }).notes) ?? undefined;
    const levelOverride =
      asNonNegativeInt((item as { levelOverride?: unknown }).levelOverride) ?? undefined;

    out.push({
      entryId,
      spellId,
      state: normalizePreparedState(item),
      displayNameOverride,
      metamagic: normalizeMetamagic((item as { metamagic?: unknown }).metamagic),
      levelOverride,
      notes,
    });
  }
  return out;
}

export function normalizePositiveIntIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.map((x) => asNonNegativeInt(x)).filter((x): x is number => x != null && x > 0)),
  );
}
