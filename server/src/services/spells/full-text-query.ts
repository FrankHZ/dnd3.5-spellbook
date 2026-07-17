import { SPELL_FULL_TEXT_MIN_TOKEN_CODE_POINTS } from "@dnd/contracts";

export function fullTextSearchTokens(query: string) {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of query.trim().split(/\s+/u)) {
    if (Array.from(token).length < SPELL_FULL_TEXT_MIN_TOKEN_CODE_POINTS) {
      continue;
    }
    const key = token.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
  }

  return tokens;
}

export function toFts5Query(query: string) {
  return fullTextSearchTokens(query)
    .map((token) => `"${token.replaceAll('"', '""')}"`)
    .join(" AND ");
}
