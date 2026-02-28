import React, { createContext, useContext, useEffect, useMemo } from "react";
import {
  getBook,
  isInBook,
  loadCollections,
  saveCollections,
} from "~/storage/collections";
import {
  getActivePreparedBook,
  getPreparedBookById,
  getPreparedPrefs,
  getPreparedPrefsByBookId,
  type PreparedPrefs,
} from "~/storage/collections.selectors";
import type {
  CollectionsState,
  PreparedEntry,
  SpellIdBook,
} from "~/storage/collections.type";
import { normalizePositiveIntIds } from "~/storage/prepared-normalize";
import { useImmer } from "use-immer";
import { DEFAULT_BOOK_ID } from "~/storage/keys";

type AddPreparedOptions = {
  notes?: string | undefined;
};

type PreparedEntryPatch = Partial<Omit<PreparedEntry, "entryId" | "spellId">>;

type Ctx = {
  collections: CollectionsState;

  spellbook: {
    toggleDefault: (spellId: number) => void;
    isInDefault: (spellId: number) => boolean;
  };

  spellIdBook: {
    setSpellIds: (bookId: string, spellIds: number[]) => void;
  };

  prepared: {
    add: (spellId: number, opts?: AddPreparedOptions) => string;
    removeEntry: (entryId: string) => void;
    removeAllBySpellId: (spellId: number) => void;
    clear: () => void;
    setEntry: (entryId: string, patch: PreparedEntryPatch) => void;
    resetUsed: () => void;
    isInPrepared: (spellId: number) => boolean;
    getPrefs: () => PreparedPrefs;
    setSelectedClassIds(ids: number[]): void;
    setSelectedDomainIds(ids: number[]): void;
  };

  preparedBook: {
    add: (bookId: string, spellId: number, opts?: AddPreparedOptions) => string;
    replace: (
      bookId: string,
      next: {
        entries: PreparedEntry[];
        selectedClassIds: number[];
        selectedDomainIds: number[];
      },
    ) => void;
    removeEntry: (bookId: string, entryId: string) => void;
    removeAllBySpellId: (bookId: string, spellId: number) => void;
    clear: (bookId: string) => void;
    setEntry: (
      bookId: string,
      entryId: string,
      patch: PreparedEntryPatch,
    ) => void;
    resetUsed: (bookId: string) => void;
    isInPrepared: (bookId: string, spellId: number) => boolean;
    getPrefs: (bookId: string) => PreparedPrefs;
    setSelectedClassIds(bookId: string, ids: number[]): void;
    setSelectedDomainIds(bookId: string, ids: number[]): void;
  };
};

function makeEntryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSpellIdBookById(
  state: CollectionsState,
  bookId: string,
): SpellIdBook | null {
  const book = getBook(state, bookId);
  if (!book || book.kind === "prepared") return null;
  return book;
}

const CollectionsContext = createContext<Ctx | null>(null);

export function CollectionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collections, setCollections] = useImmer<CollectionsState>(() =>
    loadCollections(),
  );

  useEffect(() => saveCollections(collections), [collections]);

  const value = useMemo<Ctx>(() => {
    const preparedBook: Ctx["preparedBook"] = {
      add: (bookId, spellId, opts) => {
        const entryId = makeEntryId();
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;

          const entry: PreparedEntry = {
            entryId,
            spellId,
            state: "ok",
            notes: opts?.notes,
          } satisfies PreparedEntry;
          b.entries.push(entry);
        });

        return entryId;
      },
      replace: (bookId, next) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          b.entries = [...next.entries];
          b.selectedClassIds = Array.from(
            new Set(
              next.selectedClassIds.filter((n) => Number.isInteger(n) && n > 0),
            ),
          );
          b.selectedDomainIds = Array.from(
            new Set(
              next.selectedDomainIds.filter(
                (n) => Number.isInteger(n) && n > 0,
              ),
            ),
          );
        });
      },
      removeEntry: (bookId, entryId) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;

          const idx = b.entries.findIndex((e) => e.entryId === entryId);
          if (idx >= 0) b.entries.splice(idx, 1);
        });
      },
      removeAllBySpellId: (bookId, spellId) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          b.entries = b.entries.filter((e) => e.spellId !== spellId);
        });
      },
      clear: (bookId) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          b.entries = [];
        });
      },
      setEntry: (bookId, entryId, patch) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          const e = b.entries.find((x) => x.entryId === entryId);
          if (!e) return;
          Object.assign(e, patch);
        });
      },
      resetUsed: (bookId) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          for (const e of b.entries.filter((e) => e.state === "used")) {
            e.state = "ok";
          }
        });
      },
      isInPrepared: (bookId, spellId) => {
        const b = getPreparedBookById(collections, bookId);
        return b ? b.entries.some((e) => e.spellId === spellId) : false;
      },
      getPrefs: (bookId) => getPreparedPrefsByBookId(collections, bookId),
      setSelectedClassIds: (bookId, ids) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          b.selectedClassIds = Array.from(
            new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
          );
        });
      },
      setSelectedDomainIds: (bookId, ids) => {
        setCollections((draft) => {
          const b = getPreparedBookById(draft, bookId);
          if (!b) return;
          b.selectedDomainIds = Array.from(
            new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
          );
        });
      },
    };

    const activePreparedBookId = getActivePreparedBook(collections)?.id ?? null;

    return {
      collections,
      spellbook: {
        toggleDefault: (spellId) => {
          setCollections((draft) => {
            const b = getBook(draft, DEFAULT_BOOK_ID);
            if (!b || b.kind === "prepared") return;
            const i = b.spellIds.indexOf(spellId);
            if (i >= 0) b.spellIds.splice(i, 1);
            else b.spellIds.push(spellId);
          });
        },
        isInDefault: (spellId) => {
          const b = collections.books.find((x) => x.id === DEFAULT_BOOK_ID);
          return b ? isInBook(b, spellId) : false;
        },
      },
      spellIdBook: {
        setSpellIds: (bookId, spellIds) => {
          setCollections((draft) => {
            const b = getSpellIdBookById(draft, bookId);
            if (!b) return;
            b.spellIds = normalizePositiveIntIds(spellIds);
          });
        },
      },
      prepared: {
        add: (spellId, opts) =>
          activePreparedBookId
            ? preparedBook.add(activePreparedBookId, spellId, opts)
            : "",
        removeEntry: (entryId) => {
          if (!activePreparedBookId) return;
          preparedBook.removeEntry(activePreparedBookId, entryId);
        },
        removeAllBySpellId: (spellId) => {
          if (!activePreparedBookId) return;
          preparedBook.removeAllBySpellId(activePreparedBookId, spellId);
        },
        clear: () => {
          if (!activePreparedBookId) return;
          preparedBook.clear(activePreparedBookId);
        },
        setEntry: (entryId, patch) => {
          if (!activePreparedBookId) return;
          preparedBook.setEntry(activePreparedBookId, entryId, patch);
        },
        resetUsed: () => {
          if (!activePreparedBookId) return;
          preparedBook.resetUsed(activePreparedBookId);
        },
        isInPrepared: (spellId) => {
          if (!activePreparedBookId) return false;
          return preparedBook.isInPrepared(activePreparedBookId, spellId);
        },
        getPrefs: () => {
          if (!activePreparedBookId) return getPreparedPrefs(collections);
          return preparedBook.getPrefs(activePreparedBookId);
        },
        setSelectedClassIds: (ids) => {
          if (!activePreparedBookId) return;
          preparedBook.setSelectedClassIds(activePreparedBookId, ids);
        },
        setSelectedDomainIds: (ids) => {
          if (!activePreparedBookId) return;
          preparedBook.setSelectedDomainIds(activePreparedBookId, ids);
        },
      },
      preparedBook,
    };
  }, [collections]);

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const ctx = useContext(CollectionsContext);
  if (!ctx)
    throw new Error("useCollections must be used within CollectionsProvider");
  return ctx;
}
