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
