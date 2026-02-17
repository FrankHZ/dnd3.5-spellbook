export const ACTIVE_VERSION = 2 as const;

export type BookKind = "spellbook" | "prepared" | "custom";
export type PreparedEntry = {
  // stable per-instance id (uuid/nanoid)
  entryId: string;
  spellId: number;

  used: boolean;
  notes?: string | undefined; // free text; can host metamagic later
};

export type SpellBookBase = {
  id: string;
  kind: BookKind;
  name: string;
};

export type SpellIdBook = SpellBookBase & {
  kind: "spellbook" | "custom";
  spellIds: number[];
};

export type PreparedBook = SpellBookBase & {
  kind: "prepared";
  entries: PreparedEntry[];

  selectedClassIds: number[]; // ordered list (priority order if we ever need it)
  selectedDomainIds: number[]; // optional now; same mechanism
};

export type SpellBook = SpellIdBook | PreparedBook;

type CollectionsStateV2 = {
  version: 2;
  books: SpellBook[];
};

export type CollectionsState = CollectionsStateV2;
