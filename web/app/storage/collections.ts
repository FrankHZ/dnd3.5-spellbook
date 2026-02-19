import {
  ACTIVE_VERSION,
  type CollectionsState,
  type SpellBook,
} from "./collections.type";
import { getActivePreparedBook } from "./collections.selectors";
import { DEFAULT_BOOK_ID, LS_KEY_COLLECTIONS, PREPARED_BOOK_ID } from "./keys";
import {
  normalizePositiveIntIds,
  normalizePreparedEntries,
} from "./prepared-normalize";

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
          selectedClassIds: normalizePositiveIntIds(
            (book as { selectedClassIds?: unknown }).selectedClassIds,
          ),
          selectedDomainIds: normalizePositiveIntIds(
            (book as { selectedDomainIds?: unknown }).selectedDomainIds,
          ),
        };
      }

      if (kind === "spellbook" || kind === "custom") {
        return {
          id,
          kind,
          name,
          spellIds: normalizePositiveIntIds((book as { spellIds?: unknown }).spellIds),
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
