import type { ResolveSpellNamesResponse } from "@dnd/contracts";

export type CandidateItem = {
  id: number;
  name: string;
  rulebookId: number;
  rulebookName: string;
};

export type ResolvedRow =
  | { key: string; input: string; status: "not_found" }
  | { key: string; input: string; status: "resolved"; spellId: number }
  | {
      key: string;
      input: string;
      status: "ambiguous";
      candidates: CandidateItem[];
      pickedId: number;
      defaultPickedId: number;
    };

export function parseTsvNames(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/[\t\n]/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function mapResolvedRows(
  data: ResolveSpellNamesResponse,
  opts: {
    getCandidateName: (candidate: {
      id: number;
      name: string;
      nameZhHans?: string | null;
      nameZhHant?: string | null;
    }) => string;
    getRulebookName: (rulebook: { id: number; name: string }) => string;
  },
): ResolvedRow[] {
  return data.results.map((r, idx) => {
    const key = `${idx}-${r.input}`;

    if (r.status === "resolved") {
      return {
        key,
        input: r.input,
        status: "resolved",
        spellId: r.spellId,
      };
    }

    if (r.status === "not_found") {
      return { key, input: r.input, status: "not_found" };
    }

    const candidates: CandidateItem[] = r.candidates.map((c) => ({
      id: c.id,
      name: opts.getCandidateName(c),
      rulebookId: c.rulebook.id,
      rulebookName: opts.getRulebookName(c.rulebook),
    }));

    candidates.sort((a, b) => b.rulebookId - a.rulebookId || b.id - a.id);

    const defaultPickedId = candidates[0]?.id ?? 0;

    return {
      key,
      input: r.input,
      status: "ambiguous",
      candidates,
      pickedId: defaultPickedId,
      defaultPickedId,
    };
  });
}

export function countAddableRows(rows: ResolvedRow[] | null): number {
  if (!rows) return 0;
  let count = 0;
  for (const r of rows) {
    if (r.status === "resolved") count += 1;
    if (r.status === "ambiguous" && r.pickedId > 0) count += 1;
  }
  return count;
}

export function summarizeRows(rows: ResolvedRow[] | null): {
  resolved: number;
  conflicts: number;
  notFound: number;
} {
  if (!rows) {
    return { resolved: 0, conflicts: 0, notFound: 0 };
  }

  let resolved = 0;
  let conflicts = 0;
  let notFound = 0;

  for (const r of rows) {
    if (r.status === "resolved") resolved += 1;
    else if (r.status === "ambiguous") conflicts += 1;
    else if (r.status === "not_found") notFound += 1;
  }

  return { resolved, conflicts, notFound };
}

export function collectSelectedSpellIds(rows: ResolvedRow[] | null): number[] {
  if (!rows) return [];

  const ids: number[] = [];
  for (const r of rows) {
    if (r.status === "resolved") ids.push(r.spellId);
    else if (r.status === "ambiguous" && r.pickedId > 0) ids.push(r.pickedId);
  }
  return ids;
}

export function setAmbiguousPickedId(
  rows: ResolvedRow[] | null,
  rowKey: string,
  pickedId: number,
): ResolvedRow[] | null {
  if (!rows) return rows;
  return rows.map((x) => {
    if (x.key !== rowKey) return x;
    if (x.status !== "ambiguous") return x;
    return { ...x, pickedId };
  });
}
