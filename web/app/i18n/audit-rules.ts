const pluralSuffixPattern = /_(zero|one|two|few|many|other)$/;
const semanticKeyPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const rawKeyPattern = /[A-Z]|\s|[.!?,:;()[\]"'“”]|{{|\t|\n|…/;

const requiredPluralSuffixes = {
  en: ["one", "other"],
  zh: ["other"],
} as const;

export type AuditedPluralLang = keyof typeof requiredPluralSuffixes;

export function normalizePluralKey(key: string): string {
  return key.replace(pluralSuffixPattern, "");
}

export function isPluralVariantKey(key: string): boolean {
  return pluralSuffixPattern.test(key);
}

export function isSemanticI18nKey(key: string): boolean {
  return semanticKeyPattern.test(normalizePluralKey(key));
}

export function isRawEnglishI18nKey(key: string): boolean {
  return !isSemanticI18nKey(key) && rawKeyPattern.test(key);
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

export function normalizedKeySet(keys: Iterable<string>): Set<string> {
  return new Set(Array.from(keys, normalizePluralKey));
}

export function missingRequiredPluralVariantKeys(
  referenceKeys: Iterable<string>,
  localeKeys: Iterable<string>,
  lang: AuditedPluralLang,
): string[] {
  const pluralBases = uniqueSorted(
    Array.from(referenceKeys)
      .filter(isPluralVariantKey)
      .map(normalizePluralKey),
  );
  const localeKeySet = new Set(localeKeys);

  return pluralBases.flatMap((base) =>
    requiredPluralSuffixes[lang]
      .map((suffix) => `${base}_${suffix}`)
      .filter((key) => !localeKeySet.has(key)),
  );
}
