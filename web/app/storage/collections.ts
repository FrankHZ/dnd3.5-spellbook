import {
  ACTIVE_VERSION,
  type CollectionsState,
  type PreparedEntry,
  type PreparedEntryState,
  type SpellBook,
} from "./collections.type";
import { getActivePreparedBook } from "./collections.selectors";
import { DEFAULT_BOOK_ID, LS_KEY_COLLECTIONS, PREPARED_BOOK_ID } from "./keys";

export const defaultCollectionsState: CollectionsState = {
  version: 2,
  activePreparedBookId: PREPARED_BOOK_ID,
  books: [
    { id: DEFAULT_BOOK_ID, kind: "spellbook", name: "Favorite", spellIds: [] },
    {
      id: PREPARED_BOOK_ID,
      kind: "prepared",
      name: "Prepared",
      entries: [],
      selectedClassIds: [],
      selectedDomainIds: [],
    },
  ],
};

function safeParse(raw: string | null): CollectionsState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v?.version !== ACTIVE_VERSION || !Array.isArray(v?.books)) return null;
    return v as CollectionsState;
  } catch {
    return null;
  }
}

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

function normalizePreparedEntries(raw: unknown, bookId: string): PreparedEntry[] {
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
    const notes =
      asNonEmptyString((item as { notes?: unknown }).notes) ?? undefined;
    const levelOverride =
      asNonNegativeInt((item as { levelOverride?: unknown }).levelOverride) ??
      undefined;

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

function normalizeIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.map((x) => asNonNegativeInt(x)).filter((x): x is number => x != null && x > 0)),
  );
}

function normalizeCollectionsState(state: CollectionsState): CollectionsState {
  const books = state.books
    .map((book) => {
      if (!book || typeof book !== "object") return null;
      const id = asNonEmptyString((book as { id?: unknown }).id);
      const name = asNonEmptyString((book as { name?: unknown }).name);
      const kind = (book as { kind?: unknown }).kind;
      if (!id || !name) return null;

      if (kind === "prepared") {
        return {
          id,
          kind: "prepared" as const,
          name,
          entries: normalizePreparedEntries(
            (book as { entries?: unknown }).entries,
            id,
          ),
          selectedClassIds: normalizeIds(
            (book as { selectedClassIds?: unknown }).selectedClassIds,
          ),
          selectedDomainIds: normalizeIds(
            (book as { selectedDomainIds?: unknown }).selectedDomainIds,
          ),
        };
      }

      if (kind === "spellbook" || kind === "custom") {
        return {
          id,
          kind,
          name,
          spellIds: normalizeIds((book as { spellIds?: unknown }).spellIds),
        };
      }

      return null;
    })
    .filter((book): book is CollectionsState["books"][number] => !!book);

  return {
    ...state,
    books,
  };
}

function ensureDefaultBooks(state: CollectionsState): CollectionsState {
  const byId = new Map(state.books.map((b) => [b.id, b]));
  const nextBooks = [...state.books];

  if (!byId.has(DEFAULT_BOOK_ID)) {
    nextBooks.unshift({
      id: DEFAULT_BOOK_ID,
      kind: "spellbook",
      name: "Favorite",
      spellIds: [],
    });
  }
  if (!byId.has(PREPARED_BOOK_ID)) {
    nextBooks.push({
      id: PREPARED_BOOK_ID,
      kind: "prepared",
      name: "Prepared",
      entries: [],
      selectedClassIds: [],
      selectedDomainIds: [],
    });
  }

  const nextState = { ...state, books: nextBooks };
  const activePrepared = getActivePreparedBook(nextState);

  return {
    ...nextState,
    activePreparedBookId: activePrepared?.id ?? PREPARED_BOOK_ID,
  };
}

export function loadCollections(): CollectionsState {
  const parsed = safeParse(localStorage.getItem(LS_KEY_COLLECTIONS));
  return ensureDefaultBooks(
    parsed
      ? normalizeCollectionsState({
          ...parsed,
          activePreparedBookId:
            parsed.activePreparedBookId ?? defaultCollectionsState.activePreparedBookId,
        })
      : defaultCollectionsState,
  );
}

export function saveCollections(state: CollectionsState) {
  localStorage.setItem(LS_KEY_COLLECTIONS, JSON.stringify(state));
}

export function getBook(collections: CollectionsState, bookId: string) {
  return collections.books.find((b) => b.id === bookId) ?? null;
}

export function getBookSpellIds(book: SpellBook): number[] {
  if (book.kind === "prepared") {
    return Array.from(new Set(book.entries.map((e) => e.spellId)));
  }
  return book.spellIds;
}

export function isInBook(book: SpellBook, spellId: number) {
  if (book.kind === "prepared") {
    return book.entries.some((e) => e.spellId === spellId);
  }
  return book.spellIds.includes(spellId);
}
