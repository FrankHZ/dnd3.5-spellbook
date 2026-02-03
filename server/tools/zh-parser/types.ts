export interface ZhExtractRecord {
  sourceKey: string; // provenance/debug handle, not identity
  file: string; // relative path
  zhName: string;
  zhDescriptionHtml: string; // raw HTML slice (pre-sanitize)
  enNameHint?: string; // internal helper for matching
  bookLabelsHint?: string[]; // internal helper for matching
  confidence: number; // 0..1 (extract+match combined later)
  matchMethod: string; // trace string
}

export interface ZhMatchedRecord {
  spellId: number | null;
  rulebookAbbr: string | null;
  rulebookId: number | null;

  sourceKey: string;
  file: string;

  zhName: string;
  enName: string;
  zhDescriptionHtml: string;

  chmRulebookLabels: string[];
  matchMethod: string;
}

export interface ParserStats {
  filesScanned: number;
  segmentsFound: number;
  segmentsWithHeader: number;
  matched: number;
  unmatched: number;
  unknownBookLabel: number;
  missingRulebookInDb: number;
  missingSpellInDb: number;
  lowConfidence: number;
  errors: number;
  byMatchMethod: Record<string, number>;
}
