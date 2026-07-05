import { type Request, type Response, type NextFunction } from "express";
import { ApiError } from "#server/utils/errors";
import {
  clampInt,
  normalizeString,
  parseCsvNumberList,
  parseIntOrDefault,
} from "#server/utils/parse";
import { spellsService } from "#server/services/spells/spells.service";
import { getDefaultRulebookIds } from "#server/services/rulebooks.service";
import type {
  SpellBatchRequest,
  SpellComponentFilterKey,
  SpellComponentFilters,
  SpellDescriptorBucketKey,
  SpellMechanicFilters,
  SpellNameSearchResponse,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import {
  SPELL_CASTING_TIME_FILTER_KEYS,
  SPELL_COMPONENT_FILTER_KEYS,
  SPELL_DESCRIPTOR_BUCKET_KEYS,
  SPELL_RANGE_FILTER_KEYS,
} from "@dnd/contracts";
import { getI18nContext, hasCjk } from "#server/utils/i18n";
import { LevelMode } from "#server/services/spells/spells.service.by-level";
import { ResolveSpellNamesRequest } from "@dnd/contracts";

function parseTaxonomyFilterIds(query: Request["query"]): SpellTaxonomyFilterIds {
  const positiveIntIds = (value: unknown) =>
    parseCsvNumberList(value).filter((id) => Number.isInteger(id) && id > 0);
  const descriptorBucketKeys = new Set<string>(SPELL_DESCRIPTOR_BUCKET_KEYS);
  const descriptorBuckets =
    query.descriptorBuckets === undefined || query.descriptorBuckets === null
      ? []
      : String(query.descriptorBuckets)
          .split(",")
          .map((value) => value.trim().toLowerCase())
          .filter((value) => descriptorBucketKeys.has(value));

  return {
    schoolIds: positiveIntIds(query.schoolIds),
    subschoolIds: positiveIntIds(query.subschoolIds),
    descriptorIds: positiveIntIds(query.descriptorIds),
    descriptorBuckets: Array.from(
      new Set(descriptorBuckets),
    ) as SpellDescriptorBucketKey[],
  };
}

function parseComponentFilters(query: Request["query"]): SpellComponentFilters {
  const allowed = new Set<string>(SPELL_COMPONENT_FILTER_KEYS);
  const raw = query.componentKeys;
  if (raw === undefined || raw === null) return { componentKeys: [] };

  const componentKeys = String(raw)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => allowed.has(value)) as SpellComponentFilterKey[];

  return { componentKeys: Array.from(new Set(componentKeys)) };
}

function parseMechanicFilters(query: Request["query"]): SpellMechanicFilters {
  const parseKeys = <T extends string>(
    value: unknown,
    allowedKeys: readonly T[],
  ) => {
    if (value === undefined || value === null) return [];
    const selected = new Set(
      String(value)
        .split(",")
        .map((item) => item.trim().toLowerCase()),
    );
    return allowedKeys.filter((key) => selected.has(key));
  };

  return {
    castingTimeKeys: parseKeys(
      query.castingTimeKeys,
      SPELL_CASTING_TIME_FILTER_KEYS,
    ),
    rangeKeys: parseKeys(query.rangeKeys, SPELL_RANGE_FILTER_KEYS),
  };
}

export async function searchSpellsByName(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = normalizeString(req.query.q);
    if (!q) {
      next(
        new ApiError(400, "Invalid request", "q must be a non-empty string"),
      );
      return;
    }

    let rulebookIds = parseCsvNumberList(req.query.rulebookIds);
    if (rulebookIds.length === 0) rulebookIds = await getDefaultRulebookIds();
    const classIds = parseCsvNumberList(req.query.classIds);
    const domainIds = parseCsvNumberList(req.query.domainIds);
    const taxonomyFilters = parseTaxonomyFilterIds(req.query);
    const componentFilters = parseComponentFilters(req.query);
    const mechanicFilters = parseMechanicFilters(req.query);
    const levelRaw = normalizeString(req.query.level);
    let level: number | "all" | null = null;
    if (levelRaw) {
      if (levelRaw === "all") {
        level = "all";
      } else {
        const n = Number(levelRaw);
        if (!Number.isInteger(n) || n < 0 || n > 9) {
          next(
            new ApiError(
              400,
              "Invalid request",
              "level must be either 'all' or integer 0-9",
            ),
          );
          return;
        }
        level = n;
      }
    }

    const page = clampInt(parseIntOrDefault(req.query.page, 1), 1, 1_000_000);
    const pageSize = clampInt(
      parseIntOrDefault(req.query.pageSize, 20),
      1,
      100,
    );

    const minLen = hasCjk(q) ? 1 : 2;
    if (q.length < minLen) {
      res.status(200).json({
        q,
        rulebookIds,
        ...taxonomyFilters,
        ...componentFilters,
        ...mechanicFilters,
        page,
        pageSize,
        total: 0,
        items: [],
      } satisfies SpellNameSearchResponse);
      return;
    }

    const result = await spellsService.searchByName({
      q,
      rulebookIds,
      classIds,
      domainIds,
      taxonomyFilters,
      componentFilters,
      mechanicFilters,
      level,
      page,
      pageSize,
      i18n: getI18nContext(req),
    });

    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function listSpellsByClassAndDomainLevel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let levelMode: LevelMode;
    let levelNum: number | null = null;

    const classIds = parseCsvNumberList(req.query.classIds);
    const domainIds = parseCsvNumberList(req.query.domainIds);
    const taxonomyFilters = parseTaxonomyFilterIds(req.query);
    const componentFilters = parseComponentFilters(req.query);
    const mechanicFilters = parseMechanicFilters(req.query);

    if (classIds.length === 0 && domainIds.length === 0) {
      next(
        new ApiError(
          400,
          "Invalid request",
          "At least one classId or domainId is required",
        ),
      );
      return;
    }

    const levelRaw = normalizeString(req.query.level);
    if (!levelRaw) {
      next(new ApiError(400, "Invalid request", "level is required (0-9)"));
      return;
    }

    if (levelRaw === "all") {
      levelMode = "all";
    } else {
      const n = Number(levelRaw);
      if (!Number.isInteger(n) || n < 0 || n > 9) {
        next(
          new ApiError(
            400,
            "Invalid request",
            "level must be either 'all' or integer 0-9",
          ),
        );
        return;
      }
      levelMode = "single";
      levelNum = n;
    }

    let rulebookIds = parseCsvNumberList(req.query.rulebookIds);
    if (rulebookIds.length === 0) rulebookIds = await getDefaultRulebookIds();

    const page = clampInt(parseIntOrDefault(req.query.page, 1), 1, 1_000_000);
    const pageSize = clampInt(
      parseIntOrDefault(req.query.pageSize, 20),
      1,
      100,
    );

    const result = await spellsService.listByClassAndDomainLevel({
      classIds,
      domainIds,
      levelMode,
      level: levelNum,
      rulebookIds,
      taxonomyFilters,
      componentFilters,
      mechanicFilters,
      page,
      pageSize,
      i18n: getI18nContext(req),
    });

    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function getSpellDetail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const idRaw = normalizeString(req.params.id);
    if (!idRaw) {
      next(new ApiError(400, "Invalid request", "id is required"));
      return;
    }

    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) {
      next(
        new ApiError(400, "Invalid request", "id must be a positive integer"),
      );
      return;
    }

    const spell = await spellsService.getSpellDetail({
      id,
      i18n: getI18nContext(req),
    });

    if (!spell) {
      next(new ApiError(404, "Not found", `Spell ${id} not found`));
      return;
    }

    res.status(200).json(spell);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

const MAX_BATCH_IDS = 100;

export async function batchSpells(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = req.body as Partial<SpellBatchRequest>;

    if (!body || !Array.isArray(body.ids)) {
      next(
        new ApiError(400, "Invalid request", "ids must be an array of numbers"),
      );
      return;
    }

    // sanitize
    const ids = body.ids
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) {
      next(
        new ApiError(
          400,
          "Invalid request",
          "ids must contain at least one positive integer",
        ),
      );
      return;
    }
    if (ids.length > MAX_BATCH_IDS) {
      next(
        new ApiError(400, "Invalid request", `ids must be <= ${MAX_BATCH_IDS}`),
      );
      return;
    }

    const response = await spellsService.batch({
      ids,
      i18n: getI18nContext(req),
    });

    res.status(200).json(response);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

const MAX_RESOLVE_NAMES = 200;

export async function resolveSpellNames(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = req.body as Partial<ResolveSpellNamesRequest> | undefined;

    if (!body || !Array.isArray(body.names)) {
      next(
        new ApiError(
          400,
          "Invalid request",
          "names must be an array of strings",
        ),
      );
      return;
    }

    let rulebookIds = Array.isArray(body.rulebookIds) ? body.rulebookIds : [];

    rulebookIds = rulebookIds
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0);

    rulebookIds = Array.from(new Set(rulebookIds));

    if (rulebookIds.length === 0) {
      rulebookIds = await getDefaultRulebookIds();
    }

    const names = body.names.map((x) =>
      typeof x === "string" ? x : String(x).trim(),
    );

    const nonEmptyCount = names.filter((s) => s.length > 0).length;
    if (nonEmptyCount === 0) {
      next(
        new ApiError(
          400,
          "Invalid request",
          "names must contain at least one non-empty string",
        ),
      );
      return;
    }

    if (names.length > MAX_RESOLVE_NAMES) {
      next(
        new ApiError(
          400,
          "Invalid request",
          `names must be <= ${MAX_RESOLVE_NAMES}`,
        ),
      );
      return;
    }

    const response = await spellsService.resolveSpellNames({
      names,
      i18n: getI18nContext(req),
      rulebookIds,
    });

    res.status(200).json(response);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
