import {
  ACTIVE_VERSION,
  type CollectionsState,
  type SpellBook,
} from "./collections.type";
import { DEFAULT_BOOK_ID, LS_KEY_COLLECTIONS, PREPARED_BOOK_ID } from "./keys";

export const defaultCollectionsState: CollectionsState = {
  version: 2,
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
  return { ...state, books: nextBooks };
}

export function loadCollections(): CollectionsState {
  const parsed = safeParse(localStorage.getItem(LS_KEY_COLLECTIONS));
  return ensureDefaultBooks(parsed ?? defaultCollectionsState);
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
    return book.entries.some((e) => e.spellId == spellId);
  }
  return book.spellIds.includes(spellId);
}
