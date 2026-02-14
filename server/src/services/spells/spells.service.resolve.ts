import type {
  ResolveSpellNamesResponse,
  ResolveSpellNameResult,
  SpellItemView,
  I18nContext,
  SpellID,
  RulebookId,
} from "@dnd/contracts";
import {
  fetchSpellsInOrder,
  queryByExactNames,
  SELECT_SPELL_LIST,
} from "./spells.repo.rules";
import {
  queryByExactI18nNames,
  queryI18nMap,
  SpellI18nRow,
} from "./spells.repo.app";
import { mapSpellItem } from "./spells.mapper";

type Draft =
  | {
      index: number;
      input: string;
      status: "not_found";
    }
  | {
      index: number;
      input: string;
      status: "resolved";
      matchedOn: "en" | "zh";
      spellId: SpellID;
    }
  | {
      index: number;
      input: string;
      status: "ambiguous";
      matchedOn: "en" | "zh";
      candidateIds: SpellID[];
    };

/**
 * v3.0: Resolve spell names to candidates (no priority resolution).
 *
 * Matching rules:
 * - Exact match only.
 * - lang="en": match English name only.
 * - lang="zh": try exact Chinese match first; if none, fallback to exact English match.
 *
 * Ambiguity is never silently resolved.
 */
export async function resolveSpellNames(input: {
  names: string[];
  i18n: I18nContext;
  rulebookIds: RulebookId[];
}): Promise<ResolveSpellNamesResponse> {
  const names = input.names;
  const lang = input.i18n.lang;
  const doAppQuery = lang != "en";

  // Keep original ordering for result mapping
  // Also build a unique set for batch queries
  const uniqueNames = Array.from(
    new Set(
      names
        .map((s) => (typeof s === "string" ? s : ""))
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  );

  // Edge: empty input => empty result
  if (names.length === 0) {
    return { results: [], conflictRulebooks: [] };
  }

  // Maps inputName -> SpellItemView[]
  const byEn = new Map<string, SpellID[]>();
  const byZh = new Map<string, SpellID[]>();

  const enMatches = await queryByExactNames(uniqueNames, input.rulebookIds);

  for (const sp of enMatches) {
    const key = sp.name;
    const arr = byEn.get(key) ?? [];
    arr.push(sp.id);
    byEn.set(key, arr);
  }

  // 2) Batch fetch ZH matches only when lang="zh"
  if (doAppQuery) {
    const zhMatches = await queryByExactI18nNames(
      uniqueNames,
      input.rulebookIds,
      lang,
    );
    for (const sp of zhMatches) {
      const zhName = sp.name;
      if (!zhName) continue;
      const arr = byZh.get(zhName) ?? [];
      arr.push(sp.spellId);
      byZh.set(zhName, arr);
    }
  }

  // Phase 1: build drafts and collect ids to fetch
  const drafts: Draft[] = [];
  const idsToFetch = new Set<SpellID>();

  for (let i = 0; i < names.length; i++) {
    const raw = names[i] ?? "";
    const key = raw.trim();

    if (!key) {
      drafts.push({ index: i, input: raw, status: "not_found" });
      continue;
    }

    let candidateIds: SpellID[] | undefined;
    let matchedOn: "en" | "zh" | undefined;

    if (doAppQuery) {
      const zh = byZh.get(key);
      if (zh && zh.length > 0) {
        candidateIds = zh;
        matchedOn = "zh";
      } else {
        const en = byEn.get(key);
        if (en && en.length > 0) {
          candidateIds = en;
          matchedOn = "en";
        }
      }
    } else {
      const en = byEn.get(key);
      if (en && en.length > 0) {
        candidateIds = en;
        matchedOn = "en";
      }
    }

    if (!candidateIds || candidateIds.length === 0 || !matchedOn) {
      drafts.push({ index: i, input: raw, status: "not_found" });
      continue;
    }

    if (candidateIds.length === 1) {
      const id = candidateIds[0]!;
      drafts.push({
        index: i,
        input: raw,
        status: "resolved",
        matchedOn,
        spellId: id,
      });
      idsToFetch.add(id);
      continue;
    }

    drafts.push({
      index: i,
      input: raw,
      status: "ambiguous",
      matchedOn,
      candidateIds,
    });
    for (const id of candidateIds) idsToFetch.add(id);
  }

  // Phase 2: fetch spell details once
  const allIds = Array.from(idsToFetch);
  const spells = allIds.length
    ? await fetchSpellsInOrder(allIds, SELECT_SPELL_LIST)
    : [];

  const i18nMap = spells.length
    ? await queryI18nMap(
        spells.map((s) => s.id),
        input.i18n,
      )
    : new Map<number, SpellI18nRow>();

  const viewById = new Map<SpellID, SpellItemView>();
  for (const s of spells) {
    viewById.set(s.id, mapSpellItem(s, i18nMap.get(s.id) ?? null));
  }

  // Phase 3: materialize results + conflictRulebooks
  const conflictRulebooks = new Set<number>();
  const results: ResolveSpellNameResult[] = drafts.map((d) => {
    if (d.status === "not_found") {
      return { index: d.index, input: d.input, status: "not_found" };
    }

    if (d.status === "resolved") {
      const spell = viewById.get(d.spellId);
      // In theory should always exist; if missing, degrade safely.
      if (!spell) {
        return { index: d.index, input: d.input, status: "not_found" };
      }
      return {
        index: d.index,
        input: d.input,
        status: "resolved",
        matchedOn: d.matchedOn,
        spellId: d.spellId,
        spell,
      };
    }

    // ambiguous
    const candidates: SpellItemView[] = [];
    for (const id of d.candidateIds) {
      const sp = viewById.get(id);
      if (sp) {
        candidates.push(sp);
        conflictRulebooks.add(sp.rulebook.id);
      }
    }

    // If somehow all candidate views missing, degrade to not_found
    if (candidates.length === 0) {
      return { index: d.index, input: d.input, status: "not_found" };
    }

    return {
      index: d.index,
      input: d.input,
      status: "ambiguous",
      matchedOn: d.matchedOn,
      candidates,
    };
  });

  return {
    results,
    conflictRulebooks: Array.from(conflictRulebooks).sort((a, b) => a - b),
  };
}
