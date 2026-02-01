import mapping from "DATA/books-zh-mapping.json";
/**
 * Map Chinese book labels (as they appear in headers) -> Rulebook.abbr in DB
 * Add new keys as we discover them in unmatched logs.
 */
export const BOOK_LABEL_TO_ABBR: Record<string, string> = mapping;

export function normalizeBookLabel(label: string): string {
  return label
    .replace(/\s+/g, "")
    .replace(/[《》「」『』"]/g, "")
    .replace(/：/g, ":")
    .trim();
}

export function mapBookLabelToAbbr(rawLabel: string): {
  abbr: string | null;
  norm: string;
} {
  const norm = normalizeBookLabel(rawLabel);
  return { abbr: BOOK_LABEL_TO_ABBR[norm] ?? null, norm };
}
