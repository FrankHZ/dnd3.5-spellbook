import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type LocaleMap = Record<string, string>;
type LegacyAllowlist = Record<string, string[]>;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(scriptDir);
const repoDir = dirname(webDir);
const localesDir = join(webDir, "public", "locales");
const appConfigPath = join(webDir, "app", "i18n", "config.ts");
const i18nextConfigPath = join(webDir, "i18next.config.ts");
const allowlistPath = join(scriptDir, "i18n-legacy-keys.json");

const auditRulesPath = pathToFileURL(
  join(webDir, "app", "i18n", "audit-rules.ts"),
).href;
const { isRawEnglishI18nKey, normalizedKeySet, uniqueSorted } = (await import(
  auditRulesPath
)) as typeof import("../app/i18n/audit-rules");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function readStringArrayExport(path: string, exportName: string): string[] {
  const text = readFileSync(path, "utf8");
  const match = text.match(
    new RegExp(
      `export const ${exportName}\\s*=\\s*\\[(?<items>[\\s\\S]*?)\\]`,
      "m",
    ),
  );
  if (!match?.groups?.items) {
    throw new Error(`Failed to read ${exportName} from ${path}`);
  }

  return Array.from(
    match.groups.items.matchAll(/"([^"]+)"|'([^']+)'/g),
    (entry) => entry[1] ?? entry[2],
  );
}

function readIgnoreNamespaces(): string[] {
  const text = readFileSync(i18nextConfigPath, "utf8");
  if (/ignoreNamespaces:\s*IGNORED/.test(text)) {
    return readStringArrayExport(i18nextConfigPath, "IGNORED");
  }

  const match = text.match(/ignoreNamespaces:\s*\[(?<items>[^\]]*)\]/m);
  if (!match?.groups?.items) return [];
  return Array.from(
    match.groups.items.matchAll(/"([^"]+)"|'([^']+)'/g),
    (entry) => entry[1] ?? entry[2],
  );
}

function listNamespaces(lang: string): string[] {
  const langDir = join(localesDir, lang);
  return readdirSync(langDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => basename(entry, ".json"))
    .sort();
}

function readLocale(lang: string, namespace: string): LocaleMap {
  return readJson<LocaleMap>(join(localesDir, lang, `${namespace}.json`));
}

const MECHANIC_FILTER_TRANSLATION_GROUPS = [
  {
    label: "casting times",
    exportName: "SPELL_CASTING_TIME_FILTER_KEYS",
    localePrefix: "mechanics.casting-times.options",
  },
  {
    label: "ranges",
    exportName: "SPELL_RANGE_FILTER_KEYS",
    localePrefix: "mechanics.ranges.options",
  },
  {
    label: "durations",
    exportName: "SPELL_DURATION_FILTER_KEYS",
    localePrefix: "mechanics.durations.options",
  },
  {
    label: "saving throws",
    exportName: "SPELL_SAVING_THROW_FILTER_KEYS",
    localePrefix: "mechanics.saving-throws.options",
  },
  {
    label: "spell resistances",
    exportName: "SPELL_RESISTANCE_FILTER_KEYS",
    localePrefix: "mechanics.spell-resistances.options",
  },
] as const;

const MECHANIC_DETAIL_TRANSLATION_KEYS = [
  "sections.mechanics",
  "mechanics.casting-time",
  "mechanics.range",
  "mechanics.target",
  "mechanics.effect",
  "mechanics.area",
  "mechanics.duration",
  "mechanics.saving-throw",
  "mechanics.spell-resistance",
  "mechanics.notes.label",
  "mechanics.notes.dismissible",
  "mechanics.notes.discharge",
  "mechanics.notes.partial",
  "mechanics.notes.negates",
  "mechanics.notes.harmless",
  "mechanics.notes.object",
] as const;

const MECHANIC_NORMALIZED_DISPLAY_TRANSLATION_KEYS = [
  "mechanics.values.actions.free-action",
  "mechanics.values.actions.full-round-action",
  "mechanics.values.actions.immediate-action",
  "mechanics.values.actions.standard-action",
  "mechanics.values.actions.swift-action",
  "mechanics.values.durations.concentration",
  "mechanics.values.durations.instantaneous",
  "mechanics.values.durations.permanent",
  "mechanics.values.flags.discharge",
  "mechanics.values.flags.dismissible",
  "mechanics.values.flags.harmless",
  "mechanics.values.flags.object",
  "mechanics.values.qualifiers.half",
  "mechanics.values.qualifiers.negates",
  "mechanics.values.qualifiers.partial",
  "mechanics.values.ranges.close",
  "mechanics.values.ranges.long",
  "mechanics.values.ranges.medium",
  "mechanics.values.ranges.personal",
  "mechanics.values.ranges.touch",
  "mechanics.values.ranges.unlimited",
  "mechanics.values.saving-throws.fortitude",
  "mechanics.values.saving-throws.none",
  "mechanics.values.saving-throws.reflex",
  "mechanics.values.saving-throws.will",
  "mechanics.values.separators.list",
  "mechanics.values.spell-resistances.no",
  "mechanics.values.spell-resistances.yes",
  "mechanics.values.templates.amount-action",
  "mechanics.values.templates.amount-unit",
  "mechanics.values.templates.parenthetical",
  "mechanics.values.templates.per-level",
  "mechanics.values.templates.qualified",
  "mechanics.values.units.action",
  "mechanics.values.units.day",
  "mechanics.values.units.ft",
  "mechanics.values.units.hour",
  "mechanics.values.units.mile",
  "mechanics.values.units.minute",
  "mechanics.values.units.round",
] as const;

function keySegment(value: string) {
  return value.replaceAll("_", "-");
}

function compareSets(label: string, actual: string[], expected: string[]) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((item) => !actualSet.has(item));
  const extra = actual.filter((item) => !expectedSet.has(item));
  return { label, missing, extra };
}

function formatList(values: string[], limit = 8): string {
  const head = values.slice(0, limit).join(", ");
  return values.length > limit ? `${head}, ... (${values.length} total)` : head;
}

function isSuspiciousTranslation(value: string, key: string) {
  const trimmed = value.trim();
  return (
    trimmed.length === 0 ||
    trimmed === key ||
    /\b(?:todo|tbd|fixme)\b/i.test(trimmed)
  );
}

function findDuplicateTranslations(locale: LocaleMap, keys: string[]) {
  const byValue = new Map<string, string[]>();
  for (const key of keys) {
    const value = locale[key]?.trim();
    if (!value) continue;
    const normalized = value.toLocaleLowerCase();
    byValue.set(normalized, [...(byValue.get(normalized) ?? []), key]);
  }

  return Array.from(byValue.entries())
    .filter(([, duplicateKeys]) => duplicateKeys.length > 1)
    .map(([value, duplicateKeys]) => `${value}: ${duplicateKeys.join(", ")}`);
}

function auditMechanicsLocalization(): {
  errors: string[];
  summary: string;
} {
  const errors: string[] = [];
  const contractSpellPath = join(repoDir, "contracts", "src", "dto", "spell.ts");
  const filterLocales = {
    en: readLocale("en", "spell-filter-vocabulary"),
    zh: readLocale("zh", "spell-filter-vocabulary"),
  };
  const detailLocales = {
    en: readLocale("en", "spell-detail"),
    zh: readLocale("zh", "spell-detail"),
  };
  const normalizedDisplayLocales = {
    en: readLocale("en", "spell-mechanic-vocabulary"),
    zh: readLocale("zh", "spell-mechanic-vocabulary"),
  };
  const expectedFilterLocaleKeys: string[] = [];

  for (const group of MECHANIC_FILTER_TRANSLATION_GROUPS) {
    const expectedSegments = readStringArrayExport(
      contractSpellPath,
      group.exportName,
    ).map(keySegment);
    const expectedKeys = expectedSegments.map(
      (segment) => `${group.localePrefix}.${segment}`,
    );
    expectedFilterLocaleKeys.push(...expectedKeys);

    for (const [lang, locale] of Object.entries(filterLocales)) {
      const actualSegments = Object.keys(locale)
        .filter((key) => key.startsWith(`${group.localePrefix}.`))
        .map((key) => key.slice(group.localePrefix.length + 1))
        .sort();
      const comparison = compareSets(
        `spell-filter-vocabulary ${lang} mechanics ${group.label}`,
        actualSegments,
        expectedSegments,
      );
      if (comparison.missing.length > 0) {
        errors.push(
          `${comparison.label}: missing ${formatList(comparison.missing)}`,
        );
      }
      if (comparison.extra.length > 0) {
        errors.push(
          `${comparison.label}: extra ${formatList(comparison.extra)}`,
        );
      }

      for (const key of expectedKeys) {
        const value = locale[key];
        if (typeof value !== "string" || isSuspiciousTranslation(value, key)) {
          errors.push(`${lang} mechanics translation is suspicious: ${key}`);
        }
      }
    }

    const duplicateZh = findDuplicateTranslations(
      filterLocales.zh,
      expectedKeys,
    );
    if (duplicateZh.length > 0) {
      errors.push(
        `zh mechanics ${group.label} has duplicate translations ${formatList(
          duplicateZh,
        )}`,
      );
    }
  }

  for (const key of expectedFilterLocaleKeys) {
    const enValue = filterLocales.en[key]?.trim();
    const zhValue = filterLocales.zh[key]?.trim();
    if (enValue && zhValue && enValue === zhValue) {
      errors.push(`zh mechanics translation matches English: ${key}`);
    }
  }

  for (const [lang, locale] of Object.entries(detailLocales)) {
    for (const key of MECHANIC_DETAIL_TRANSLATION_KEYS) {
      const value = locale[key];
      if (typeof value !== "string" || isSuspiciousTranslation(value, key)) {
        errors.push(`${lang} mechanic detail translation is suspicious: ${key}`);
      }
    }
  }

  for (const key of MECHANIC_DETAIL_TRANSLATION_KEYS) {
    const enValue = detailLocales.en[key]?.trim();
    const zhValue = detailLocales.zh[key]?.trim();
    if (enValue && zhValue && enValue === zhValue) {
      errors.push(`zh mechanic detail translation matches English: ${key}`);
    }
  }

  for (const [lang, locale] of Object.entries(normalizedDisplayLocales)) {
    const comparison = compareSets(
      `spell-mechanic-vocabulary ${lang}`,
      Object.keys(locale).sort(),
      [...MECHANIC_NORMALIZED_DISPLAY_TRANSLATION_KEYS].sort(),
    );
    if (comparison.missing.length > 0) {
      errors.push(
        `${comparison.label}: missing ${formatList(comparison.missing)}`,
      );
    }
    if (comparison.extra.length > 0) {
      errors.push(`${comparison.label}: extra ${formatList(comparison.extra)}`);
    }

    for (const key of MECHANIC_NORMALIZED_DISPLAY_TRANSLATION_KEYS) {
      const value = locale[key];
      if (typeof value !== "string" || isSuspiciousTranslation(value, key)) {
        errors.push(
          `${lang} normalized mechanic translation is suspicious: ${key}`,
        );
      }
    }
  }

  for (const key of MECHANIC_NORMALIZED_DISPLAY_TRANSLATION_KEYS) {
    const enValue = normalizedDisplayLocales.en[key]?.trim();
    const zhValue = normalizedDisplayLocales.zh[key]?.trim();
    if (enValue && zhValue && enValue === zhValue) {
      errors.push(`zh normalized mechanic translation matches English: ${key}`);
    }
  }

  const duplicateNormalizedZh = findDuplicateTranslations(
    normalizedDisplayLocales.zh,
    [...MECHANIC_NORMALIZED_DISPLAY_TRANSLATION_KEYS],
  );
  if (duplicateNormalizedZh.length > 0) {
    errors.push(
      `zh normalized mechanics has duplicate translations ${formatList(
        duplicateNormalizedZh,
      )}`,
    );
  }

  return {
    errors,
    summary: [
      "mechanics-localization",
      `filterKeys=${expectedFilterLocaleKeys.length}`,
      `detailKeys=${MECHANIC_DETAIL_TRANSLATION_KEYS.length}`,
      `normalizedDisplayKeys=${MECHANIC_NORMALIZED_DISPLAY_TRANSLATION_KEYS.length}`,
    ].join("\t"),
  };
}

function main() {
  const errors: string[] = [];
  const report = process.argv.includes("--report");

  const supportedLangs = ["en", "zh"];
  const appNamespaces = readStringArrayExport(appConfigPath, "I18N_NAMESPACES");
  const ignoredNamespaces = readStringArrayExport(i18nextConfigPath, "IGNORED");
  const extractIgnoredNamespaces = readIgnoreNamespaces();
  const legacyAllowlist = existsSync(allowlistPath)
    ? readJson<LegacyAllowlist>(allowlistPath)
    : {};

  const enNamespaces = listNamespaces("en");
  const namespaceSet = new Set(enNamespaces);

  for (const comparison of [
    compareSets("app I18N_NAMESPACES vs en locale files", appNamespaces, enNamespaces),
    compareSets("extract ignoreNamespaces vs IGNORED", extractIgnoredNamespaces, ignoredNamespaces),
  ]) {
    if (comparison.missing.length > 0) {
      errors.push(
        `${comparison.label}: missing ${formatList(comparison.missing)}`,
      );
    }
    if (comparison.extra.length > 0) {
      errors.push(`${comparison.label}: extra ${formatList(comparison.extra)}`);
    }
  }

  for (const lang of supportedLangs) {
    const comparison = compareSets(
      `${lang} locale namespaces vs en locale files`,
      listNamespaces(lang),
      enNamespaces,
    );
    if (comparison.missing.length > 0) {
      errors.push(`${comparison.label}: missing ${formatList(comparison.missing)}`);
    }
    if (comparison.extra.length > 0) {
      errors.push(`${comparison.label}: extra ${formatList(comparison.extra)}`);
    }
  }

  for (const namespace of Object.keys(legacyAllowlist).sort()) {
    if (!namespaceSet.has(namespace)) {
      errors.push(`legacy allowlist namespace does not exist: ${namespace}`);
    }
  }

  const legacyAllowedByNamespace = new Map(
    Object.entries(legacyAllowlist).map(([namespace, keys]) => [
      namespace,
      new Set(keys),
    ]),
  );

  const namespaceSummaries: string[] = [];

  for (const namespace of enNamespaces) {
    const enLocale = readLocale("en", namespace);
    const zhLocale = readLocale("zh", namespace);
    const enKeys = Object.keys(enLocale).sort();
    const zhKeys = Object.keys(zhLocale).sort();
    const allowedLegacyKeys = legacyAllowedByNamespace.get(namespace) ?? new Set();

    for (const allowedKey of allowedLegacyKeys) {
      if (!enKeys.includes(allowedKey)) {
        errors.push(`legacy allowlist has stale key ${namespace}:${allowedKey}`);
      } else if (!isRawEnglishI18nKey(allowedKey)) {
        errors.push(
          `legacy allowlist key is no longer raw-English ${namespace}:${allowedKey}`,
        );
      }
    }

    for (const key of enKeys) {
      if (isRawEnglishI18nKey(key) && !allowedLegacyKeys.has(key)) {
        errors.push(`raw-English key is not allowlisted ${namespace}:${key}`);
      }
    }

    const enBaseKeys = normalizedKeySet(enKeys);
    const zhBaseKeys = normalizedKeySet(zhKeys);
    const missingZh = uniqueSorted(
      Array.from(enBaseKeys).filter((key) => !zhBaseKeys.has(key)),
    );
    const extraZh = uniqueSorted(
      Array.from(zhBaseKeys).filter((key) => !enBaseKeys.has(key)),
    );

    if (missingZh.length > 0) {
      errors.push(`${namespace}: zh missing base keys ${formatList(missingZh)}`);
    }
    if (extraZh.length > 0) {
      errors.push(`${namespace}: zh has extra base keys ${formatList(extraZh)}`);
    }

    namespaceSummaries.push(
      [
        namespace,
        `keys=${enKeys.length}`,
        `legacy=${allowedLegacyKeys.size}`,
        `bases=${enBaseKeys.size}`,
      ].join("\t"),
    );
  }

  const mechanicsAudit = auditMechanicsLocalization();
  errors.push(...mechanicsAudit.errors);
  namespaceSummaries.push(mechanicsAudit.summary);

  if (report) {
    console.log(namespaceSummaries.join("\n"));
  }

  if (errors.length > 0) {
    console.error("i18n audit failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `i18n audit passed for ${enNamespaces.length} namespaces in ${repoDir}`,
  );
}

main();
