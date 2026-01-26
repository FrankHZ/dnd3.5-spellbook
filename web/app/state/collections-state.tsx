import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CollectionsStateV1 } from "~/storage/collections";
import { loadCollections, saveCollections } from "~/storage/collections";
import {
  DEFAULT_BOOK_ID,
  PREPARED_BOOK_ID,
  toggleSpellInBook,
} from "~/storage/collections";

type Ctx = {
  collections: CollectionsStateV1;
  toggleDefault: (spellId: number) => void;
  togglePrepared: (spellId: number) => void;
  isInDefault: (spellId: number) => boolean;
  isInPrepared: (spellId: number) => boolean;
};

const CollectionsContext = createContext<Ctx | null>(null);

export function CollectionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collections, setCollections] = useState<CollectionsStateV1>(() =>
    loadCollections(),
  );

  useEffect(() => saveCollections(collections), [collections]);

  const value = useMemo<Ctx>(() => {
    return {
      collections,
      toggleDefault: (spellId) =>
        setCollections((s) => toggleSpellInBook(s, DEFAULT_BOOK_ID, spellId)),
      togglePrepared: (spellId) =>
        setCollections((s) => toggleSpellInBook(s, PREPARED_BOOK_ID, spellId)),
      isInDefault: (spellId) => {
        const b = collections.books.find((x) => x.id === DEFAULT_BOOK_ID);
        return !!b?.spellIds.includes(spellId);
      },
      isInPrepared: (spellId) => {
        const b = collections.books.find((x) => x.id === PREPARED_BOOK_ID);
        return !!b?.spellIds.includes(spellId);
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
