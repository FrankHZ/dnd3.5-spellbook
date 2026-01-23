export function parseCsvNumberList(value: unknown): number[] {
  if (value === undefined || value === null) return [];
  const s = String(value).trim();
  if (!s) return [];

  const nums = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));

  // dedupe + stable
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

export function parseIntOrDefault(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.trunc(n);
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function normalizeString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

export function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return defaultValue;
}
