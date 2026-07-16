import type {
  SpellMechanicDetailFacet,
  SpellMechanicDetailMetadata,
} from "@dnd/contracts";

export type SpellMechanicField = keyof SpellMechanicDetailMetadata;

export type SpellMechanicDisplayTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type DisplayOptions = {
  field: SpellMechanicField;
  raw: string | null | undefined;
  facet: SpellMechanicDetailFacet | undefined;
  language: string;
  t: SpellMechanicDisplayTranslator;
};

const ACTION_CATEGORIES = new Set([
  "immediate_action",
  "swift_action",
  "free_action",
  "standard_action",
  "full_round_action",
]);

const SIMPLE_RANGE_CATEGORIES = new Set([
  "personal",
  "touch",
  "close",
  "medium",
  "long",
  "unlimited",
]);

const SIMPLE_DURATION_CATEGORIES = new Set([
  "instantaneous",
  "permanent",
  "concentration",
]);

const SAVING_THROW_CATEGORIES = new Set([
  "none",
  "fortitude",
  "reflex",
  "will",
]);

function keySegment(value: string) {
  return value.replaceAll("_", "-");
}

function translate(
  t: SpellMechanicDisplayTranslator,
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) {
  const value = t(`mechanics.values.${key}`, {
    defaultValue: fallback,
    ns: "spell-mechanic-vocabulary",
    ...options,
  });
  return value.trim() || fallback;
}

function hasFlag(facet: SpellMechanicDetailFacet, key: string) {
  return facet.flags[key] === true;
}

function formatAmountUnit(
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  if (facet.amount === null || !facet.unit) return null;
  const unit = translate(t, `units.${keySegment(facet.unit)}`, facet.unit);
  return translate(t, "templates.amount-unit", `${facet.amount}${unit}`, {
    amount: facet.amount,
    unit,
  });
}

function appendParenthetical(
  base: string,
  notes: string[],
  t: SpellMechanicDisplayTranslator,
) {
  if (notes.length === 0) return base;
  const separator = translate(t, "separators.list", ", ");
  return translate(
    t,
    "templates.parenthetical",
    `${base} (${notes.join(separator)})`,
    {
      base,
      notes: notes.join(separator),
    },
  );
}

function formatCastingTime(
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  if (ACTION_CATEGORIES.has(facet.category) && facet.amount !== null) {
    const action = translate(
      t,
      `actions.${keySegment(facet.category)}`,
      facet.category,
    );
    return translate(t, "templates.amount-action", `${facet.amount}${action}`, {
      amount: facet.amount,
      action,
    });
  }
  if (["round", "minute", "hour"].includes(facet.category)) {
    return formatAmountUnit(facet, t);
  }
  return null;
}

function formatRange(
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  if (SIMPLE_RANGE_CATEGORIES.has(facet.category)) {
    return translate(t, `ranges.${keySegment(facet.category)}`, facet.category);
  }
  if (facet.category === "fixed") return formatAmountUnit(facet, t);
  return null;
}

function formatDuration(
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  let value: string | null = null;
  if (SIMPLE_DURATION_CATEGORIES.has(facet.category)) {
    value = translate(
      t,
      `durations.${keySegment(facet.category)}`,
      facet.category,
    );
  } else if (facet.category === "timed") {
    value = formatAmountUnit(facet, t);
    if (value && hasFlag(facet, "perLevel")) {
      value = translate(t, "templates.per-level", `${value}/level`, { value });
    }
  }
  if (!value) return null;

  const notes = [
    hasFlag(facet, "dismissible")
      ? translate(t, "flags.dismissible", "Dismissible")
      : null,
    hasFlag(facet, "discharge")
      ? translate(t, "flags.discharge", "Discharge")
      : null,
  ].filter((note): note is string => note !== null);
  return appendParenthetical(value, notes, t);
}

function formatSavingThrow(
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  if (!SAVING_THROW_CATEGORIES.has(facet.category)) return null;
  let value = translate(
    t,
    `saving-throws.${keySegment(facet.category)}`,
    facet.category,
  );
  const qualifier = hasFlag(facet, "negates")
    ? translate(t, "qualifiers.negates", "negates")
    : hasFlag(facet, "partial")
      ? translate(t, "qualifiers.partial", "partial")
      : hasFlag(facet, "half")
        ? translate(t, "qualifiers.half", "half")
        : null;
  if (qualifier) {
    value = translate(t, "templates.qualified", `${value} ${qualifier}`, {
      base: value,
      qualifier,
    });
  }

  const notes = [
    hasFlag(facet, "harmless")
      ? translate(t, "flags.harmless", "Harmless")
      : null,
    hasFlag(facet, "object") ? translate(t, "flags.object", "Object") : null,
  ].filter((note): note is string => note !== null);
  return appendParenthetical(value, notes, t);
}

function formatSpellResistance(
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  if (!["yes", "no"].includes(facet.category)) return null;
  const value = translate(
    t,
    `spell-resistances.${keySegment(facet.category)}`,
    facet.category,
  );
  const notes = [
    hasFlag(facet, "harmless")
      ? translate(t, "flags.harmless", "Harmless")
      : null,
    hasFlag(facet, "object") ? translate(t, "flags.object", "Object") : null,
  ].filter((note): note is string => note !== null);
  return appendParenthetical(value, notes, t);
}

function formatChineseCompleteValue(
  field: SpellMechanicField,
  facet: SpellMechanicDetailFacet,
  t: SpellMechanicDisplayTranslator,
) {
  switch (field) {
    case "castingTime":
      return formatCastingTime(facet, t);
    case "range":
      return formatRange(facet, t);
    case "duration":
      return formatDuration(facet, t);
    case "savingThrow":
      return formatSavingThrow(facet, t);
    case "spellResistance":
      return formatSpellResistance(facet, t);
    case "target":
    case "effect":
    case "area":
      return null;
  }
}

export function getSpellMechanicDisplayValue({
  field,
  raw,
  facet,
  language,
  t,
}: DisplayOptions) {
  if (facet?.displayCoverage !== "complete" || !facet.normalizedText) {
    return raw;
  }
  if (!language.toLowerCase().startsWith("zh")) {
    return facet.normalizedText;
  }
  return formatChineseCompleteValue(field, facet, t) ?? raw;
}
