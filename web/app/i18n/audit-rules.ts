const pluralSuffixPattern = /_(zero|one|two|few|many|other)$/;
const semanticKeyPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const rawKeyPattern = /[A-Z]|\s|[.!?,:;()[\]"'“”]|{{|\t|\n|…/;

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
