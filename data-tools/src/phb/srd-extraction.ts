import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import parseRtf from "rtf-parser";

import { resolveInside } from "./source-manifest";
import {
  readAndVerifySrdSourceManifest,
  type SrdSourceMember,
} from "./srd-source";

export const PHB_SRD_SPELLS_RELATIVE_PATH = "phb35/extracted/srd/spells.jsonl";
export const PHB_SRD_SUMMARIES_RELATIVE_PATH =
  "phb35/extracted/srd/short-descriptions.jsonl";
export const PHB_SRD_ISSUES_RELATIVE_PATH = "phb35/extracted/srd/issues.jsonl";
export const PHB_SRD_EXTRACTION_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/srd/extraction-manifest.json";

const FIELD_PATTERN =
  /^(Level|Components|Casting Time|Range|Target|Targets|Effect|Area|Target or Area|Target, Effect, or Area|Target\/Effect|Area or Target|Duration|Saving Throw|Spell Resistance):\s*(.*)$/iu;
const SCHOOL_PATTERN =
  /^(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation|Universal)(?:\s|$)/iu;
const DESCRIPTION_FILE_PATTERN = /^Spells.+\.rtf$/u;
const LIST_FILE_PATTERN = /^SpellList.+\.rtf$/u;

export type SrdSpellEntity = {
  schemaVersion: 1;
  rowId: string;
  printedName: string;
  sourceFile: string;
  sourceFileSha256: string;
  sourceParagraphStart: number;
  sourceParagraphEnd: number;
  school: string;
  fields: Record<string, string>;
  bodyText: string;
  bodyBlocks: Array<
    { kind: "paragraph"; text: string } | { kind: "table-row"; cells: string[] }
  >;
  reviewFlags: string[];
};

export type SrdShortDescription = {
  schemaVersion: 1;
  rowId: string;
  printedName: string;
  summaryText: string;
  listOwner: string;
  level: number;
  sourceFile: string;
  sourceFileSha256: string;
  sourceParagraph: number;
};

export type SrdExtractionIssue = {
  schemaVersion: 1;
  issueId: string;
  sourceFile: string;
  sourceParagraph: number | null;
  kind:
    | "duplicate-spell"
    | "missing-body"
    | "missing-required-field"
    | "unparsed-list-row";
  detail: string;
};

type Paragraph = {
  index: number;
  text: string;
};

export async function runSrdExtraction(dataRoot: string) {
  const source = readAndVerifySrdSourceManifest(dataRoot);
  const spells: SrdSpellEntity[] = [];
  const summaries: SrdShortDescription[] = [];
  const issues: SrdExtractionIssue[] = [];

  for (const member of source.manifest.members) {
    const bytes = source.entries.get(member.name)!;
    if (member.role === "spell-description") {
      const parsed = parseSpellParagraphs(await rtfParagraphs(bytes), member);
      spells.push(...parsed.spells);
      issues.push(...parsed.issues);
    } else if (member.role === "spell-list") {
      const parsed = parseSummaryParagraphs(await rtfParagraphs(bytes), member);
      summaries.push(...parsed.summaries);
      issues.push(...parsed.issues);
    }
  }

  const duplicateNames = duplicateNormalizedNames(spells);
  for (const name of duplicateNames) {
    issues.push({
      schemaVersion: 1,
      issueId: `duplicate-spell:${slug(name)}`,
      sourceFile: "multiple",
      sourceParagraph: null,
      kind: "duplicate-spell",
      detail: name,
    });
  }
  spells.sort((left, right) =>
    left.printedName.localeCompare(right.printedName, "en-US"),
  );
  summaries.sort((left, right) =>
    left.rowId.localeCompare(right.rowId, "en-US"),
  );
  issues.sort((left, right) =>
    left.issueId.localeCompare(right.issueId, "en-US"),
  );

  const spellsPath = resolveInside(dataRoot, PHB_SRD_SPELLS_RELATIVE_PATH);
  const summariesPath = resolveInside(
    dataRoot,
    PHB_SRD_SUMMARIES_RELATIVE_PATH,
  );
  const issuesPath = resolveInside(dataRoot, PHB_SRD_ISSUES_RELATIVE_PATH);
  writeJsonl(spellsPath, spells);
  writeJsonl(summariesPath, summaries);
  writeJsonl(issuesPath, issues);

  const manifestPath = resolveInside(
    dataRoot,
    PHB_SRD_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  const manifest = {
    schemaVersion: 1,
    sourceManifest: artifact(
      path.relative(dataRoot, source.manifestPath).replace(/\\/gu, "/"),
      source.manifestPath,
    ),
    sourceManifestCommit: source.manifestCommit,
    outputs: {
      spells: artifact(PHB_SRD_SPELLS_RELATIVE_PATH, spellsPath),
      shortDescriptions: artifact(
        PHB_SRD_SUMMARIES_RELATIVE_PATH,
        summariesPath,
      ),
      issues: artifact(PHB_SRD_ISSUES_RELATIVE_PATH, issuesPath),
    },
    counts: {
      spells: spells.length,
      shortDescriptionOccurrences: summaries.length,
      shortDescriptionNames: new Set(
        summaries.map((row) => normalizeName(row.printedName)),
      ).size,
      issues: issues.length,
      duplicateSpells: duplicateNames.length,
    },
  };
  writeJson(manifestPath, manifest);
  return { manifestPath, manifest };
}

export function parseSpellParagraphs(
  paragraphs: Paragraph[],
  member: Pick<SrdSourceMember, "name" | "sha256">,
) {
  const starts: number[] = [];
  for (let index = 0; index < paragraphs.length; index += 1) {
    const school = nextNonempty(paragraphs, index + 1);
    const level = school ? nextNonempty(paragraphs, school.position + 1) : null;
    if (
      paragraphs[index]?.text &&
      school &&
      SCHOOL_PATTERN.test(school.paragraph.text) &&
      level?.paragraph.text.startsWith("Level:")
    ) {
      starts.push(index);
    }
  }

  const spells: SrdSpellEntity[] = [];
  const issues: SrdExtractionIssue[] = [];
  starts.forEach((start, spellIndex) => {
    const end = starts[spellIndex + 1] ?? paragraphs.length;
    const segment = paragraphs.slice(start, end).filter((row) => row.text);
    const name = segment[0]!.text;
    const school = segment[1]!.text;
    const fields: Record<string, string> = {};
    let cursor = 2;
    let currentField: string | null = null;
    while (cursor < segment.length) {
      const text = segment[cursor]!.text;
      const field = FIELD_PATTERN.exec(text);
      if (field?.[1] !== undefined && field[2] !== undefined) {
        currentField = normalizeFieldName(field[1]);
        fields[currentField] = field[2].trim();
        cursor += 1;
        continue;
      }
      const laterField = segment
        .slice(cursor + 1)
        .some((row) => FIELD_PATTERN.test(row.text));
      if (currentField && laterField) {
        fields[currentField] = `${fields[currentField]} ${text}`.trim();
        cursor += 1;
        continue;
      }
      break;
    }
    const bodyBlocks = parseBodyBlocks(
      segment.slice(cursor).map((row) => row.text),
    );
    const bodyText = bodyBlocks
      .map((block) =>
        block.kind === "paragraph" ? block.text : block.cells.join(" | "),
      )
      .join("\n")
      .trim();
    const reviewFlags: string[] = [];
    if (!("level" in fields)) {
      reviewFlags.push("missing-field:level");
      issues.push({
        schemaVersion: 1,
        issueId: `missing-field:${slug(name)}:level`,
        sourceFile: member.name,
        sourceParagraph: segment[0]!.index,
        kind: "missing-required-field",
        detail: `${name}: level`,
      });
    }
    if (bodyBlocks.some((block) => block.kind === "table-row")) {
      reviewFlags.push("table-structure");
    }
    if (!bodyText) {
      reviewFlags.push("missing-body");
      issues.push({
        schemaVersion: 1,
        issueId: `missing-body:${slug(name)}`,
        sourceFile: member.name,
        sourceParagraph: segment[0]!.index,
        kind: "missing-body",
        detail: name,
      });
    }
    spells.push({
      schemaVersion: 1,
      rowId: `srd-spell:${slug(name)}`,
      printedName: name,
      sourceFile: member.name,
      sourceFileSha256: member.sha256,
      sourceParagraphStart: segment[0]!.index,
      sourceParagraphEnd: segment.at(-1)!.index,
      school,
      fields,
      bodyText,
      bodyBlocks,
      reviewFlags,
    });
  });
  return { spells, issues };
}

export function parseSummaryParagraphs(
  paragraphs: Paragraph[],
  member: Pick<SrdSourceMember, "name" | "sha256">,
) {
  const summaries: SrdShortDescription[] = [];
  const issues: SrdExtractionIssue[] = [];
  let listOwner: string | null = null;
  let level: number | null = null;
  for (const paragraph of paragraphs) {
    const text = paragraph.text;
    if (/^[A-Z][A-Z '\/-]+ (?:SPELLS|DOMAIN)$/u.test(text)) {
      listOwner = titleCase(text.replace(/ (?:SPELLS|DOMAIN)$/u, ""));
      level = null;
      continue;
    }
    const levelMatch = /^(\d+)(?:ST|ND|RD|TH)-LEVEL\b/iu.exec(text);
    if (levelMatch?.[1]) {
      level = Number(levelMatch[1]);
      continue;
    }
    if (!listOwner || level === null || !text.includes(":")) continue;
    const colon = text.indexOf(":");
    const rawName = text.slice(0, colon).trim();
    const summaryText = text.slice(colon + 1).trim();
    const printedName = rawName.replace(/(?:\s+[MFX]){1,3}$/u, "").trim();
    if (!printedName || !summaryText) {
      issues.push({
        schemaVersion: 1,
        issueId: `unparsed-list:${member.name}:${paragraph.index}`,
        sourceFile: member.name,
        sourceParagraph: paragraph.index,
        kind: "unparsed-list-row",
        detail: text,
      });
      continue;
    }
    summaries.push({
      schemaVersion: 1,
      rowId: `srd-list:${slug(listOwner)}:${level}:${member.name.toLocaleLowerCase("en-US")}:${paragraph.index}:${slug(printedName)}`,
      printedName,
      summaryText,
      listOwner,
      level,
      sourceFile: member.name,
      sourceFileSha256: member.sha256,
      sourceParagraph: paragraph.index,
    });
  }
  return { summaries, issues };
}

export async function rtfParagraphs(bytes: Buffer): Promise<Paragraph[]> {
  const source = replaceUnsupportedRtfControls(bytes.toString("latin1"));
  const document = await new Promise<{
    content: Array<{ content: Array<{ value: string }> }>;
  }>((resolve, reject) => {
    parseRtf.string(source, (error, parsed) => {
      if (error) reject(error);
      else resolve(parsed);
    });
  });
  return document.content.map((paragraph, index) => ({
    index,
    text: normalizeParagraph(
      paragraph.content.map((span) => span.value).join(""),
    ),
  }));
}

function replaceUnsupportedRtfControls(value: string) {
  const replacements: Record<string, string> = {
    bullet: "•",
    emdash: "—",
    endash: "–",
    ldblquote: "“",
    lquote: "‘",
    rdblquote: "”",
    rquote: "’",
  };
  return value
    .replace(
      /\\(bullet|emdash|endash|ldblquote|lquote|rdblquote|rquote)\b ?/gu,
      (_match, name: string) => replacements[name]!,
    )
    .replace(/\\trowd\b ?/gu, "\ue000")
    .replace(/\\cell\b ?/gu, "\ue001")
    .replace(/\\row\b ?/gu, "\ue002");
}

function normalizeParagraph(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function nextNonempty(paragraphs: Paragraph[], start: number) {
  for (let position = start; position < paragraphs.length; position += 1) {
    const paragraph = paragraphs[position];
    if (paragraph?.text) return { position, paragraph };
  }
  return null;
}

function parseBodyBlocks(paragraphs: string[]): SrdSpellEntity["bodyBlocks"] {
  const blocks: SrdSpellEntity["bodyBlocks"] = [];
  let tableCells: string[] | null = null;
  for (const paragraph of paragraphs) {
    const tokens = paragraph.split(/([\ue000-\ue002])/gu);
    for (const token of tokens) {
      if (token === "\ue000") {
        tableCells ??= [];
      } else if (token === "\ue001") {
        tableCells ??= [];
        tableCells.push("");
      } else if (token === "\ue002") {
        blocks.push({ kind: "table-row", cells: tableCells ?? [] });
        tableCells = null;
      } else if (token.trim()) {
        if (tableCells) {
          const last = tableCells.length - 1;
          if (last < 0 || tableCells[last]) tableCells.push(token.trim());
          else tableCells[last] = token.trim();
        } else {
          blocks.push({ kind: "paragraph", text: token.trim() });
        }
      }
    }
  }
  if (tableCells) blocks.push({ kind: "table-row", cells: tableCells });
  return blocks;
}

function normalizeFieldName(value: string) {
  const compact = value.toLocaleLowerCase("en-US").replace(/[^a-z]/gu, "");
  const aliases: Record<string, string> = {
    castingtime: "castingTime",
    savingthrow: "savingThrow",
    spellresistance: "spellResistance",
    targets: "target",
  };
  return aliases[compact] ?? compact;
}

function duplicateNormalizedNames(spells: SrdSpellEntity[]) {
  const groups = new Map<string, SrdSpellEntity[]>();
  for (const spell of spells) {
    const key = normalizeName(spell.printedName);
    groups.set(key, [...(groups.get(key) ?? []), spell]);
  }
  return Array.from(groups.values())
    .filter((rows) => rows.length > 1)
    .map((rows) => rows[0]!.printedName);
}

export function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function slug(value: string) {
  return normalizeName(value)
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/\b[a-z]/gu, (letter) => letter.toLocaleUpperCase("en-US"));
}

function artifact(relativePath: string, filePath: string) {
  return {
    relativePath,
    bytes: fs.statSync(filePath).size,
    sha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(filePath))
      .digest("hex"),
  };
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    "utf8",
  );
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
