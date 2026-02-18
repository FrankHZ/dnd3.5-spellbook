import type {
  CollectionsState,
  PreparedBook,
  PreparedEntry,
} from "./collections.type";

type PreparedStateSlice = Pick<CollectionsState, "books" | "activePreparedBookId">;

export type PreparedPrefs = {
  selectedClassIds: number[];
  selectedDomainIds: number[];
};

export function getActivePreparedBook(
  state: PreparedStateSlice,
): PreparedBook | null {
  const active = state.books.find(
    (b) => b.id === state.activePreparedBookId && b.kind === "prepared",
  );
  if (active && active.kind === "prepared") return active;

  const fallback = state.books.find((b) => b.kind === "prepared");
  if (fallback && fallback.kind === "prepared") return fallback;

  return null;
}

export function getPreparedBookById(
  state: Pick<CollectionsState, "books">,
  bookId: string,
): PreparedBook | null {
  const book = state.books.find((b) => b.id === bookId);
  if (!book || book.kind !== "prepared") return null;
  return book;
}

export function getPreparedEntries(state: PreparedStateSlice): PreparedEntry[] {
  return [...(getActivePreparedBook(state)?.entries ?? [])];
}

export function getPreparedPrefs(state: PreparedStateSlice): PreparedPrefs {
  const b = getActivePreparedBook(state);
  return {
    selectedClassIds: [...(b?.selectedClassIds ?? [])],
    selectedDomainIds: [...(b?.selectedDomainIds ?? [])],
  };
}

export function getPreparedPrefsByBookId(
  state: Pick<CollectionsState, "books">,
  bookId: string,
): PreparedPrefs {
  const b = getPreparedBookById(state, bookId);
  return {
    selectedClassIds: [...(b?.selectedClassIds ?? [])],
    selectedDomainIds: [...(b?.selectedDomainIds ?? [])],
  };
}
