import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseIdList(raw: string | null): number[] {
  if (raw == null) return [];
  const s = raw.trim();
  if (s === "") return []; // explicit empty
  const nums = s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n >= 0);
  return normalizeIds(nums);
}

export function normalizeIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

export function idsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function parseIntParam(raw: string | null): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

export function setOrDelete(
  sp: URLSearchParams,
  key: string,
  value: string | null,
) {
  if (value == null) sp.delete(key);
  else sp.set(key, value);
}
