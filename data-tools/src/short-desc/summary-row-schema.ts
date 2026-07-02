export type SummaryLang = "en" | "zh";

export type SummaryRecord = {
  schemaVersion?: unknown;
  stableKey?: unknown;
  spellId?: unknown;
  rulebookId?: unknown;
  rulebookAbbr?: unknown;
  lang?: unknown;
  variant?: unknown;
  summaryText?: unknown;
  sourceKey?: unknown;
  sourceName?: unknown;
  sourceKind?: unknown;
  reviewStatus?: unknown;
};

export type SummaryRow = {
  id: string;
  spellId: number;
  rulebookId: number;
  lang: SummaryLang;
  variant: string;
  summaryText: string;
  sourceKey: string | null;
  sourceName: string | null;
  sourceKind: string | null;
  reviewStatus: string;
};

function asInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function asOptionalString(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value.trim() || null : undefined;
}

export function stableSummaryId(
  spellId: number,
  lang: SummaryLang,
  variant: string,
) {
  return `spell-summary:${spellId}:${lang}:${variant}`;
}

export function validateSummaryRecord(
  record: SummaryRecord,
  line: number,
  errors: string[],
): SummaryRow | null {
  if (record.schemaVersion !== 1) {
    errors.push(`line ${line}: schemaVersion must be 1`);
  }

  const spellId = asInteger(record.spellId);
  const rulebookId = asInteger(record.rulebookId);
  const langRaw = asString(record.lang);
  const variant = asString(record.variant);
  const summaryText = asString(record.summaryText);
  const reviewStatus = asString(record.reviewStatus);
  const sourceKey = asOptionalString(record.sourceKey);
  const sourceName = asOptionalString(record.sourceName);
  const sourceKind = asOptionalString(record.sourceKind);

  if (spellId === undefined || spellId <= 0) {
    errors.push(`line ${line}: spellId must be a positive integer`);
  }
  if (rulebookId === undefined || rulebookId <= 0) {
    errors.push(`line ${line}: rulebookId must be a positive integer`);
  }
  if (langRaw !== "en" && langRaw !== "zh") {
    errors.push(`line ${line}: lang must be en or zh`);
  }
  if (!variant) errors.push(`line ${line}: variant is required`);
  if (!summaryText) errors.push(`line ${line}: summaryText is required`);
  if (reviewStatus !== "accepted") {
    errors.push(`line ${line}: reviewStatus must be accepted`);
  }
  if (sourceKey === undefined) {
    errors.push(`line ${line}: sourceKey must be a string or null`);
  }
  if (sourceName === undefined) {
    errors.push(`line ${line}: sourceName must be a string or null`);
  }
  if (sourceKind === undefined) {
    errors.push(`line ${line}: sourceKind must be a string or null`);
  }

  if (
    spellId === undefined ||
    rulebookId === undefined ||
    (langRaw !== "en" && langRaw !== "zh") ||
    !variant ||
    !summaryText ||
    reviewStatus !== "accepted" ||
    sourceKey === undefined ||
    sourceName === undefined ||
    sourceKind === undefined
  ) {
    return null;
  }

  return {
    id: stableSummaryId(spellId, langRaw, variant),
    spellId,
    rulebookId,
    lang: langRaw,
    variant,
    summaryText,
    sourceKey,
    sourceName,
    sourceKind,
    reviewStatus,
  };
}

export function readSummaryJsonlText(text: string) {
  const errors: string[] = [];
  const rows: SummaryRow[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((lineText, index) => {
    const line = index + 1;
    const trimmed = lineText.trim();
    if (!trimmed) return;

    let parsed: SummaryRecord;
    try {
      parsed = JSON.parse(trimmed) as SummaryRecord;
    } catch (error) {
      errors.push(
        `line ${line}: invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    const row = validateSummaryRecord(parsed, line, errors);
    if (!row) return;

    const key = `${row.spellId}:${row.lang}:${row.variant}`;
    if (seen.has(key)) {
      errors.push(`line ${line}: duplicate spell/lang/variant ${key}`);
      return;
    }
    seen.add(key);
    rows.push(row);
  });

  return { rows, errors };
}
