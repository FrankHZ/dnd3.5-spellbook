import aliasMapExtra from "DATA/chm-mapping/enName-aliases-extra.json";
import aliasMapGlobal from "DATA/chm-mapping/enName-aliases-global.json";

const BUILTIN_IMARVIN_ALIAS_EXTRA: Record<string, string[]> = {
  "Channel Greater Celestial": ["Greater Channel Celestial"],
  "Crown of Glory": ["Crown of Glory 2"],
  "Curse of Lycanthropy": ["Curse of Lycanthropy 2", "Curse of Lycanthropy 2 (M)"],
  Darkbolt: ["Darkness Darkbolt", "Vile Darkbolt"],
  Forceward: ["Force Effects Forceward"],
  Frostbite: ["Frostbite 2"],
  Razorfangs: ["Razorfanqs"],
  Sandblast: ["Sandblast (LE)"],
  "Silvered Weapon": ["Alternate Silvered Weapon"],
  "Status, Greater": ["Greater Status (HoB)"],
  "Tortoise Shell": ["Tortoise (AC) Shell"],
  "Undeniable Gravity, Legion's": ["Mass Undeniable Gravity"],
  "Wall of Sand": ["Wall of Sand 2"],
  "Prot\uFFFDg\uFFFD": ["Protege", "Prot\u00E9g\u00E9"],
  "Stars of Sel\uFFFDne": ["Stars Of Selune", "Stars of Selune"],
  "Unfettered Herosim": ["Unfettered Heroism"],
};

export function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/(?:\s+\((?:M|F|DF|XP)\))+$/gi, "")
    .trim()
    .toLowerCase();
}

function compactName(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]/gi, "");
}

export function nameMatchKeys(value: string) {
  return [...new Set([normalizeName(value), compactName(value)])].filter(Boolean);
}

export function alternateExactNames(exactName: string) {
  const names = [exactName];
  const target = normalizeName(exactName);

  const commaSuffix = exactName.match(/^(.+),\s*(.+)$/);
  if (commaSuffix?.[1] && commaSuffix[2]) {
    names.push(`${commaSuffix[2]} ${commaSuffix[1]}`);
  }

  for (const [canonical, aliases] of Object.entries(
    BUILTIN_IMARVIN_ALIAS_EXTRA,
  )) {
    if (normalizeName(canonical) === target) names.push(...aliases);
  }

  for (const [alias, canonical] of Object.entries(
    aliasMapGlobal as Record<string, string>,
  )) {
    if (normalizeName(canonical) === target) names.push(alias);
  }

  for (const [canonical, aliases] of Object.entries(
    aliasMapExtra as Record<string, string[]>,
  )) {
    if (normalizeName(canonical) === target) names.push(...aliases);
  }

  return [...new Set(names)];
}

export function chooseExact<T extends { name: string }>(
  rows: T[],
  exactName: string,
) {
  const targets = new Set(exactNameMatchKeys(exactName));
  return rows.filter((row) =>
    nameMatchKeys(row.name).some((key) => targets.has(key)),
  );
}

export function exactNameMatchKeys(exactName: string) {
  return alternateExactNames(exactName).flatMap(nameMatchKeys);
}
