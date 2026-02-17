import React, { createContext, useContext, useEffect, useMemo } from "react";
import {
  getBook,
  isInBook,
  loadCollections,
  saveCollections,
} from "~/storage/collections";
import type {
  CollectionsState,
  PreparedEntry,
} from "~/storage/collections.type";
import { useImmer } from "use-immer";
import { DEFAULT_BOOK_ID, PREPARED_BOOK_ID } from "~/storage/keys";

type AddPreparedOptions = {
  notes?: string | undefined;
};

type Ctx = {
  collections: CollectionsState;

  // Favorite book (spellIds)
  toggleDefault: (spellId: number) => void;
  isInDefault: (spellId: number) => boolean;

  // Prepared book (entries)
  addPrepared: (spellId: number, opts?: AddPreparedOptions) => string;
  removePreparedEntry: (entryId: string) => void;
  removeAllPreparedBySpellId: (spellId: number) => void;
  clearPrepared: () => void;
  setPreparedEntryUsed: (entryId: string, used: boolean) => void;
  setPreparedEntryNotes: (entryId: string, notes: string) => void;
  resetPreparedUsed: () => void;
  isInPrepared: (spellId: number) => boolean;

  setPreparedSelectedClassIds(ids: number[]): void;
  setPreparedSelectedDomainIds(ids: number[]): void;
};

function makeEntryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    return {
      collections,
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
      addPrepared: (spellId, opts) => {
        const entryId = makeEntryId();
        setCollections((draft) => {
          const b = getBook(draft, PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;

          const entry: PreparedEntry = {
            entryId,
            spellId,
            used: false,
            notes: opts?.notes,
          };
          b.entries.push(entry);
        });

        return entryId;
      },

      removePreparedEntry: (entryId) => {
        setCollections((draft) => {
          const b = getBook(draft, PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;

          const idx = b.entries.findIndex((e) => e.entryId === entryId);
          if (idx >= 0) b.entries.splice(idx, 1);
        });
      },

      removeAllPreparedBySpellId: (spellId) => {
        setCollections((draft) => {
          const b = getBook(draft, PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;

          b.entries = b.entries.filter((e) => e.spellId !== spellId);
        });
      },
      clearPrepared: () => {
        setCollections((draft) => {
          const b = draft.books.find((x) => x.id === PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;
          b.entries = [];
        });
      },

      setPreparedEntryUsed: (entryId, used) => {
        setCollections((draft) => {
          const b = draft.books.find((x) => x.id === PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;
          const e = b.entries.find((x) => x.entryId === entryId);
          if (e) e.used = used;
        });
      },

      setPreparedEntryNotes: (entryId, notes) => {
        setCollections((draft) => {
          const b = draft.books.find((x) => x.id === PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;
          const e = b.entries.find((x) => x.entryId === entryId);
          if (e) e.notes = notes;
        });
      },

      resetPreparedUsed: () => {
        setCollections((draft) => {
          const b = draft.books.find((x) => x.id === PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;
          for (const e of b.entries) e.used = false;
        });
      },

      isInPrepared: (spellId) => {
        const b = collections.books.find((x) => x.id === PREPARED_BOOK_ID);
        return b ? isInBook(b, spellId) : false;
      },

      setPreparedSelectedClassIds: (ids) => {
        setCollections((draft) => {
          const b = draft.books.find((x) => x.id === PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;

          b.selectedClassIds = Array.from(
            new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
          );
        });
      },
      setPreparedSelectedDomainIds: (ids) => {
        setCollections((draft) => {
          const b = draft.books.find((x) => x.id === PREPARED_BOOK_ID);
          if (!b || b.kind !== "prepared") return;

          b.selectedDomainIds = Array.from(
            new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
          );
        });
      },
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
