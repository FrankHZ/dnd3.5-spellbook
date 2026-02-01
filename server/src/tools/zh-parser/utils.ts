export function isEnglishish(s: string, minLength = 3): boolean {
  const t = s.trim();
  if (!t) return false;

  const asciiRatio =
    [...t].filter((ch) => ch.charCodeAt(0) < 128).length / t.length;
  if (asciiRatio <= 0.8) return false;

  // Must include at least one letter
  if (!/[A-Za-z]/.test(t)) return false;
  const letterCount = (t.match(/[A-Za-z]/g) ?? []).length;
  if (letterCount < minLength) return false;
  return true;
}

export function normText(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace("(", "（")
    .replace(")", "）")
    .trim();
}
