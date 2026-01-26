export type BookKind = "spellbook" | "prepared" | "custom";

export type SpellBook = {
  id: string; // stable string id (e.g. "default", "prepared")
  kind: BookKind;
  name: string;
  spellIds: number[];
};

export type CollectionsStateV1 = {
  version: 1;
  books: SpellBook[];
};

export const DEFAULT_BOOK_ID = "default";
export const PREPARED_BOOK_ID = "prepared";

export const defaultCollectionsState: CollectionsStateV1 = {
  version: 1,
  books: [
    { id: DEFAULT_BOOK_ID, kind: "spellbook", name: "Favorite", spellIds: [] },
    { id: PREPARED_BOOK_ID, kind: "prepared", name: "Prepared", spellIds: [] },
  ],
};

const LS_KEY = "dnd.collections.v1";

function safeParse(raw: string | null): CollectionsStateV1 | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v?.version !== 1 || !Array.isArray(v?.books)) return null;
    return v as CollectionsStateV1;
  } catch {
    return null;
  }
}

function ensureDefaultBooks(state: CollectionsStateV1): CollectionsStateV1 {
  const byId = new Map(state.books.map((b) => [b.id, b]));
  const nextBooks = [...state.books];

  if (!byId.has(DEFAULT_BOOK_ID)) {
    nextBooks.unshift({
      id: DEFAULT_BOOK_ID,
      kind: "spellbook",
      name: "Spellbook",
      spellIds: [],
    });
  }
  if (!byId.has(PREPARED_BOOK_ID)) {
    nextBooks.push({
      id: PREPARED_BOOK_ID,
      kind: "prepared",
      name: "Prepared",
      spellIds: [],
    });
  }
  return { ...state, books: nextBooks };
}

export function loadCollections(): CollectionsStateV1 {
  const parsed = safeParse(localStorage.getItem(LS_KEY));
  return ensureDefaultBooks(parsed ?? defaultCollectionsState);
}

export function saveCollections(state: CollectionsStateV1) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function getBook(state: CollectionsStateV1, bookId: string) {
  return state.books.find((b) => b.id === bookId) ?? null;
}

export function isInBook(
  state: CollectionsStateV1,
  bookId: string,
  spellId: number,
) {
  const book = getBook(state, bookId);
  return book ? book.spellIds.includes(spellId) : false;
}

export function toggleSpellInBook(
  state: CollectionsStateV1,
  bookId: string,
  spellId: number,
) {
  const books = state.books.map((b) => {
    if (b.id !== bookId) return b;
    const set = new Set(b.spellIds);
    if (set.has(spellId)) set.delete(spellId);
    else set.add(spellId);
    return { ...b, spellIds: Array.from(set) };
  });
  return { ...state, books };
}
