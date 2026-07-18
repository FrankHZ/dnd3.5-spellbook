import type { RulebookId } from "./rulebook.js";
import type { SpellItemView } from "./spell.js";

// NOTE: Backend matching rules (v3.0):
// - Language and variant are selected through the request query context.
// - lang="en": exact match on spell.name only
// - lang="zh": exact match on zh name first (if available), else fallback to spell.name exact match
// No fuzzy matching. No silent disambiguation.

export type ResolveSpellNamesRequest = {
  names: string[];
  rulebookIds?: RulebookId[] | undefined;
};

// ---------- Response ----------
export type ResolveSpellNamesResponse = {
  results: ResolveSpellNameResult[];
  /**
   * Rulebook IDs that appear among ambiguous candidates.
   * Frontend should prompt user to set book priority only if non-empty.
   */
  conflictRulebooks: RulebookId[];
};

export type ResolveSpellNameResult =
  | ResolveSpellNameResolved
  | ResolveSpellNameAmbiguous
  | ResolveSpellNameNotFound;

export type ResolveSpellNameStatus = "resolved" | "ambiguous" | "not_found";

export type ResolveSpellNameBase = {
  /** Original cell text (spell name) */
  input: string;

  /** Optional position in the request.names array */
  index?: number;

  status: ResolveSpellNameStatus;

  /**
   * For debugging / UX. Especially useful when lang="zh" but we fell back to EN.
   * - "zh": matched via Chinese name
   * - "en": matched via English name
   */
  matchedOn?: "en" | "zh" | undefined;
};

export type ResolveSpellNameResolved = ResolveSpellNameBase & {
  status: "resolved";
  spellId: number;
  spell: SpellItemView; // full view is fine for now (per your note)
};

export type ResolveSpellNameAmbiguous = ResolveSpellNameBase & {
  status: "ambiguous";
  candidates: SpellItemView[];
};

export type ResolveSpellNameNotFound = ResolveSpellNameBase & {
  status: "not_found";
};
