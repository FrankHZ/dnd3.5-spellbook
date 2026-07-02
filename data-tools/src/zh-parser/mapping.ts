import { readOptionalLocalJsonRecord } from "../shared/local-data-json";

const BUILTIN_BOOK_LABEL_TO_ABBR: Record<string, string> = {
  DMG: "DMG",
  九剑: "ToB",
  模型手册: "MH",
  玩家手册2: "PH2",
};

/**
 * Map Chinese book labels (as they appear in headers) -> Rulebook.abbr in DB
 * Add new keys as we discover them in unmatched logs.
 */
export const BOOK_LABEL_TO_ABBR: Record<string, string> = {
  ...BUILTIN_BOOK_LABEL_TO_ABBR,
  ...readOptionalLocalJsonRecord<Record<string, string>>(
    "chm-mapping/books-zh-chm-mapping.json",
  ),
};

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
