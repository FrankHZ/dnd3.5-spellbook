export const MECHANIC_TYPES = [
  "casting_time",
  "range",
  "target",
  "effect",
  "area",
  "duration",
  "saving_throw",
  "spell_resistance",
] as const;

export type MechanicType = (typeof MECHANIC_TYPES)[number];

export const MECHANIC_DISPLAY_COVERAGES = [
  "complete",
  "partial",
  "review",
  "empty",
] as const;

export type MechanicDisplayCoverage =
  (typeof MECHANIC_DISPLAY_COVERAGES)[number];

export type NormalizedMechanicValue = {
  category: string;
  amount: number | null;
  unit: string | null;
  flags: Record<string, boolean | string>;
  normalizedText: string | null;
  displayCoverage: MechanicDisplayCoverage;
  issueCode: string | null;
};

const ACTION_CATEGORIES = {
  "immediate action": "immediate_action",
  "swift action": "swift_action",
  "free action": "free_action",
  "standard action": "standard_action",
  "full-round action": "full_round_action",
} as const;

const RANGE_DEFINITIONS = {
  personal: "Personal",
  touch: "Touch",
  close: "Close (25 ft. + 5 ft./2 levels)",
  medium: "Medium (100 ft. + 10 ft./level)",
  long: "Long (400 ft. + 40 ft./level)",
  unlimited: "Unlimited",
} as const;

export function normalizeMechanicValue(
  mechanicType: MechanicType,
  raw: string | null | undefined,
): NormalizedMechanicValue {
  switch (mechanicType) {
    case "casting_time":
      return parseCastingTime(raw);
    case "range":
      return parseRange(raw);
    case "target":
    case "effect":
    case "area":
      return parseTargetLike(raw);
    case "duration":
      return parseDuration(raw);
    case "saving_throw":
      return parseSavingThrow(raw);
    case "spell_resistance":
      return parseSpellResistance(raw);
  }
}

export function validateMechanicDisplayValue(value: unknown) {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["mechanic display value must be an object"];
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.displayCoverage !== "string" ||
    !MECHANIC_DISPLAY_COVERAGES.includes(
      record.displayCoverage as MechanicDisplayCoverage,
    )
  ) {
    errors.push("displayCoverage is invalid");
    return errors;
  }
  if (
    record.normalizedText !== null &&
    typeof record.normalizedText !== "string"
  ) {
    errors.push("normalizedText must be a string or null");
  }
  if (record.issueCode !== null && typeof record.issueCode !== "string") {
    errors.push("issueCode must be a string or null");
  }
  if (record.displayCoverage === "complete" && !record.normalizedText) {
    errors.push("complete mechanics require normalizedText");
  }
  if (record.displayCoverage !== "complete" && record.normalizedText !== null) {
    errors.push("non-complete mechanics must not expose normalizedText");
  }
  if (record.displayCoverage === "review" && !record.issueCode) {
    errors.push("review mechanics require issueCode");
  }
  if (record.displayCoverage !== "review" && record.issueCode) {
    errors.push("only review mechanics may expose issueCode");
  }
  return errors;
}

function parseCastingTime(raw: string | null | undefined) {
  const text = normalize(raw);
  if (!text) return mechanic("empty", { displayCoverage: "empty" });

  const actionMatch = text.match(
    /^(\d+) (immediate action|swift action|free action|standard action|full-round action)s?$/,
  );
  if (actionMatch) {
    const amount = Number(actionMatch[1]);
    const action = actionMatch[2] as keyof typeof ACTION_CATEGORIES;
    return mechanic(ACTION_CATEGORIES[action], {
      amount,
      unit: "action",
      normalizedText: `${amount} ${action}${amount === 1 ? "" : "s"}`,
      displayCoverage: "complete",
    });
  }

  const timeMatch = text.match(/^(\d+) (round|minute|hour)s?$/);
  if (timeMatch) {
    const amount = Number(timeMatch[1]);
    const unit = timeMatch[2] ?? "";
    return mechanic(unit, {
      amount,
      unit,
      normalizedText: amountUnitText(amount, unit),
      displayCoverage: "complete",
    });
  }

  const amountUnit = parseAmountUnit(text);
  for (const [label, category] of Object.entries(ACTION_CATEGORIES)) {
    if (text.includes(label)) {
      return mechanic(category, {
        amount: amountUnit.amount,
        unit: "action",
        displayCoverage: "partial",
      });
    }
  }
  for (const unit of ["round", "minute", "hour"]) {
    if (text.includes(unit)) {
      return mechanic(unit, {
        amount: amountUnit.amount,
        unit,
        displayCoverage: "partial",
      });
    }
  }
  return mechanic("special", {
    displayCoverage: "review",
    issueCode: "casting_time.review",
  });
}

function parseRange(raw: string | null | undefined) {
  const text = normalize(raw);
  if (!text) return mechanic("empty", { displayCoverage: "empty" });

  for (const [category, normalizedText] of Object.entries(RANGE_DEFINITIONS)) {
    const exactForms =
      category === "close"
        ? ["close", "close (25 ft. + 5 ft./2 levels)"]
        : category === "medium"
          ? ["medium", "medium (100 ft. + 10 ft./level)"]
          : category === "long"
            ? ["long", "long (400 ft. + 40 ft./level)"]
            : [category];
    if (exactForms.includes(text)) {
      return mechanic(category, {
        normalizedText,
        displayCoverage: "complete",
      });
    }
    if (text.startsWith(category)) {
      return mechanic(category, { displayCoverage: "partial" });
    }
  }

  const fixedMatch = text.match(/^(\d+) (ft\.?|foot|feet|mile|miles)$/);
  if (fixedMatch) {
    const amount = Number(fixedMatch[1]);
    const sourceUnit = fixedMatch[2] ?? "";
    const unit = sourceUnit.startsWith("f") ? "ft" : "mile";
    const normalizedText =
      unit === "ft"
        ? `${amount} ft.`
        : `${amount} ${amount === 1 ? "mile" : "miles"}`;
    return mechanic("fixed", {
      amount,
      unit,
      normalizedText,
      displayCoverage: "complete",
    });
  }
  if (/^\d/.test(text)) {
    const amountUnit = parseAmountUnit(text);
    return mechanic("fixed", {
      amount: amountUnit.amount,
      unit: amountUnit.unit,
      displayCoverage: "partial",
    });
  }
  return mechanic("special", {
    displayCoverage: "review",
    issueCode: "range.review",
  });
}

function parseTargetLike(raw: string | null | undefined) {
  const text = normalize(raw);
  if (!text) return mechanic("empty", { displayCoverage: "empty" });
  for (const category of [
    "creature",
    "object",
    "area",
    "emanation",
    "burst",
    "spread",
    "ray",
  ]) {
    if (text.includes(category)) {
      return mechanic(category, { displayCoverage: "partial" });
    }
  }
  return mechanic("text", {
    displayCoverage: "review",
    issueCode: "target_effect_area.review",
  });
}

function parseDuration(raw: string | null | undefined) {
  const text = normalize(raw);
  if (!text) return mechanic("empty", { displayCoverage: "empty" });
  const flags = durationFlags(text);

  const simpleMatch = text.match(/^(instantaneous|permanent)(?: \(d\))?$/);
  if (simpleMatch) {
    const category = simpleMatch[1] ?? "";
    return mechanic(category, {
      flags,
      normalizedText: `${capitalize(category)}${flags.dismissible ? " (D)" : ""}`,
      displayCoverage: "complete",
    });
  }
  if (text === "concentration" || text === "concentration (d)") {
    return mechanic("concentration", {
      flags,
      normalizedText: `Concentration${flags.dismissible ? " (D)" : ""}`,
      displayCoverage: "complete",
    });
  }

  const timedMatch = text.match(
    /^(\d+) (round|minute|hour|day)s?(\/level)?(?: \(d\))?$/,
  );
  if (timedMatch) {
    const amount = Number(timedMatch[1]);
    const unit = timedMatch[2] ?? "";
    const perLevel = Boolean(timedMatch[3]);
    return mechanic("timed", {
      amount,
      unit,
      flags: { ...flags, perLevel },
      normalizedText: `${amountUnitText(amount, unit)}${perLevel ? "/level" : ""}${flags.dismissible ? " (D)" : ""}`,
      displayCoverage: "complete",
    });
  }

  const amountUnit = parseAmountUnit(text);
  if (text.includes("instantaneous")) {
    return mechanic("instantaneous", { flags, displayCoverage: "partial" });
  }
  if (text.includes("permanent")) {
    return mechanic("permanent", { flags, displayCoverage: "partial" });
  }
  if (flags.concentration) {
    return mechanic("concentration", { flags, displayCoverage: "partial" });
  }
  if (amountUnit.amount !== null) {
    return mechanic("timed", {
      amount: amountUnit.amount,
      unit: amountUnit.unit,
      flags,
      displayCoverage: "partial",
    });
  }
  return mechanic("special", {
    flags,
    displayCoverage: "review",
    issueCode: "duration.review",
  });
}

function parseSavingThrow(raw: string | null | undefined) {
  const text = normalize(raw);
  if (!text) {
    return mechanic("none", {
      flags: savingThrowFlags(text, false),
      displayCoverage: "empty",
    });
  }
  if (text === "none" || text === "no") {
    return mechanic("none", {
      flags: savingThrowFlags(text, false),
      normalizedText: "None",
      displayCoverage: "complete",
    });
  }

  const exactMatch = text.match(
    /^(fortitude|reflex|will)(?: (negates|partial|half))?(?: \((harmless|object)(?:, (harmless|object))?\))?$/,
  );
  const flags = savingThrowFlags(text, true);
  if (exactMatch) {
    const category = exactMatch[1] ?? "";
    const qualifier = exactMatch[2] ?? null;
    const parentheticals = [exactMatch[3], exactMatch[4]].filter(
      (value): value is string => Boolean(value),
    );
    const suffix = parentheticals.length
      ? ` (${parentheticals.join(", ")})`
      : "";
    return mechanic(category, {
      flags,
      normalizedText: `${capitalize(category)}${qualifier ? ` ${qualifier}` : ""}${suffix}`,
      displayCoverage: "complete",
    });
  }
  for (const category of ["fortitude", "reflex", "will"]) {
    if (text.includes(category)) {
      return mechanic(category, { flags, displayCoverage: "partial" });
    }
  }
  if (text.startsWith("no ")) {
    return mechanic("none", { flags, displayCoverage: "partial" });
  }
  return mechanic("special", {
    flags,
    displayCoverage: "review",
    issueCode: "saving_throw.review",
  });
}

function parseSpellResistance(raw: string | null | undefined) {
  const text = normalize(raw);
  if (!text) return mechanic("empty", { displayCoverage: "empty" });
  const flags = resistanceFlags(text);
  const exactMatch = text.match(
    /^(yes|no)(?: \((harmless|object)(?:, (harmless|object))?\))?$/,
  );
  if (exactMatch) {
    const category = exactMatch[1] ?? "";
    const parentheticals = [exactMatch[2], exactMatch[3]].filter(
      (value): value is string => Boolean(value),
    );
    const suffix = parentheticals.length
      ? ` (${parentheticals.join(", ")})`
      : "";
    return mechanic(category, {
      flags,
      normalizedText: `${capitalize(category)}${suffix}`,
      displayCoverage: "complete",
    });
  }
  if (text.startsWith("yes")) {
    return mechanic("yes", { flags, displayCoverage: "partial" });
  }
  if (text.startsWith("no")) {
    return mechanic("no", { flags, displayCoverage: "partial" });
  }
  return mechanic("special", {
    flags,
    displayCoverage: "review",
    issueCode: "spell_resistance.review",
  });
}

function durationFlags(text: string) {
  return {
    concentration: text.includes("concentration"),
    discharge: text.includes("discharge"),
    dismissible: text.includes("(d)") || text.includes("dismissible"),
  };
}

function savingThrowFlags(text: string, allowsSave: boolean) {
  return {
    allowsSave,
    fortitude: text.includes("fortitude"),
    reflex: text.includes("reflex"),
    will: text.includes("will"),
    partial: text.includes("partial"),
    negates: text.includes("negates"),
    half: text.includes("half"),
    harmless: text.includes("harmless"),
    object: text.includes("object"),
  };
}

function resistanceFlags(text: string) {
  return {
    harmless: text.includes("harmless"),
    object: text.includes("object"),
  };
}

function mechanic(
  category: string,
  options: Partial<Omit<NormalizedMechanicValue, "category">> = {},
): NormalizedMechanicValue {
  return {
    category,
    amount: options.amount ?? null,
    unit: options.unit ?? null,
    flags: options.flags ?? {},
    normalizedText: options.normalizedText ?? null,
    displayCoverage: options.displayCoverage ?? "partial",
    issueCode: options.issueCode ?? null,
  };
}

function parseAmountUnit(text: string) {
  const match = text.match(/(\d+)\s*([a-z-]+)/);
  return {
    amount: match ? Number(match[1]) : null,
    unit: match?.[2] ?? null,
  };
}

function amountUnitText(amount: number, unit: string) {
  return `${amount} ${unit}${amount === 1 ? "" : "s"}`;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
