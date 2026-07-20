import type {
  PhbPilotCase,
  PhbPilotLocation,
  PhbPilotManifest,
} from "./pilot-manifest";

const ALIGNMENTS = new Set(["LG", "NG", "CG", "N", "CN", "LE", "NE", "CE"]);
const SCHOOL_PATTERN =
  /^(?:Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation|Universal)\b/u;
const LEVEL_HEADING_PATTERN = /^([1-9])(?:st|nd|rd|th) Level$/u;

export type PilotPdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  hasEol: boolean;
};

export type PilotMineruLayoutBlock = {
  type: string;
  bbox: [number, number, number, number] | null;
  textOrigin: "text-layer" | "ocr-risk" | "none";
};

export type PilotPageRow = {
  schemaVersion: 1;
  sourceId: string;
  sourceArtifactSha256: string;
  subsetArtifactSha256: string;
  subsetPageIndex: number;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  caseIds: string[];
  kinds: string[];
  pdfjs: {
    extractor: { name: string; version: string };
    width: number;
    height: number;
    textLayerSha256: string;
    items: PilotPdfTextItem[];
  };
  mineru: {
    engine: string;
    version: string;
    contentListSha256: string;
    blocks: PilotMineruLayoutBlock[];
  };
};

export type PilotSourcePage = {
  sourceId: string;
  sourceArtifactSha256: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  textLayerSha256: string;
};

export type PilotSpellFieldName =
  | "level"
  | "components"
  | "castingTime"
  | "range"
  | "target"
  | "effect"
  | "area"
  | "duration"
  | "savingThrow"
  | "spellResistance";

export type PilotSpellEntity = {
  entityType: "spell";
  caseId: string;
  printedName: string;
  sourcePages: PilotSourcePage[];
  school: string;
  fields: Partial<Record<PilotSpellFieldName, string>>;
  bodyText: string;
  sourceText: string;
  reviewFlags: string[];
};

export type PilotClassListOccurrence = {
  entityType: "class-list-occurrence";
  caseId: string;
  printedName: string;
  owner: string;
  level: number;
  locationAnchor: string;
  locationAnchors: string[];
  sourcePage: PilotSourcePage;
  sourcePages: PilotSourcePage[];
  summaryText: string;
  sourceText: string;
  wordingGroupKey: string;
  reviewFlags: string[];
};

export type PilotSummonMonsterRow = {
  monsterName: string;
  alignment: string;
  footnoteMarkers: string[];
};

export type PilotSummonTableLevel = {
  level: number;
  monsters: PilotSummonMonsterRow[];
};

export type PilotSummonTableEntity = {
  entityType: "summon-table";
  caseId: string;
  printedName: "Summon Monster";
  sourcePage: PilotSourcePage;
  levels: PilotSummonTableLevel[];
  footnotes: Array<{ marker: string; text: string }>;
  sourceText: string;
  mineruLayoutHint: {
    authority: "layout-hint-only";
    risk: "ocr-risk";
    engine: string;
    version: string;
    tableBlockCount: number;
    tableBlockBboxes: Array<[number, number, number, number]>;
  };
  reviewFlags: string[];
};

export type PilotEntityRow =
  PilotSpellEntity | PilotClassListOccurrence | PilotSummonTableEntity;

export type PilotEntityExtraction = {
  spells: PilotSpellEntity[];
  classListOccurrences: PilotClassListOccurrence[];
  summonTables: PilotSummonTableEntity[];
  rows: PilotEntityRow[];
};

type ReadingLine = {
  page: PilotPageRow;
  text: string;
  x: number;
  y: number;
  height: number;
  segments: PilotPdfTextItem[];
};

type FieldMatch = {
  name: PilotSpellFieldName;
  value: string;
};

export function parsePilotPageRows(text: string): PilotPageRow[] {
  const rows: PilotPageRow[] = [];
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (line.length === 0) continue;
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch (error) {
      throw new Error(
        `PHB pilot page row ${index + 1} is not valid JSON: ${errorMessage(error)}`,
      );
    }
    rows.push(parsePilotPageRow(value, index + 1));
  }
  assertUniquePageRows(rows);
  return rows;
}

export function extractPilotEntities(
  manifest: PhbPilotManifest,
  pages: PilotPageRow[],
): PilotEntityExtraction {
  assertUniquePageRows(pages);
  assertUnique(
    manifest.cases.map((entry) => entry.id),
    "PHB pilot case id",
  );
  const pageByLocation = new Map(
    pages.map((page) => [pageKey(page.sourceId, page.sourcePageIndex), page]),
  );
  validateSelectedPages(manifest, pageByLocation);

  const spells: PilotSpellEntity[] = [];
  const classListOccurrences: PilotClassListOccurrence[] = [];
  const summonTables: PilotSummonTableEntity[] = [];

  for (const pilotCase of manifest.cases) {
    const descriptionLocations = pilotCase.locations.filter(
      (location) => location.kind === "description",
    );
    if (descriptionLocations.length > 0) {
      spells.push(
        extractSpellEntity(pilotCase, descriptionLocations, pageByLocation),
      );
    }

    const classListLocations = pilotCase.locations.filter(
      (candidate) => candidate.kind === "class-list",
    );
    for (const location of classListLocations.filter(isSummonTableLocation)) {
      const page = requiredPage(pageByLocation, location, pilotCase.id);
      summonTables.push(extractSummonTable(pilotCase, page));
    }
    for (const locations of groupClassListLocations(
      classListLocations.filter((location) => !isSummonTableLocation(location)),
      pilotCase.id,
    )) {
      const selectedPages = locations.map((location) =>
        requiredPage(pageByLocation, location, pilotCase.id),
      );
      classListOccurrences.push(
        extractClassListOccurrence(pilotCase, locations, selectedPages),
      );
    }
  }

  assertUnique(
    classListOccurrences.map(
      (row) =>
        `${row.caseId}\u0000${row.sourcePage.sourceId}\u0000${row.sourcePage.sourcePageIndex}\u0000${row.locationAnchors.join("\u0001")}`,
    ),
    "PHB pilot class-list occurrence",
  );
  assertUnique(
    summonTables.map(
      (row) =>
        `${row.caseId}\u0000${row.sourcePage.sourceId}\u0000${row.sourcePage.sourcePageIndex}`,
    ),
    "PHB pilot summon table",
  );

  const expectedSpellCount = manifest.cases.filter((pilotCase) =>
    pilotCase.locations.some((location) => location.kind === "description"),
  ).length;
  const expectedOccurrenceCount = manifest.cases.reduce(
    (total, pilotCase) =>
      total +
      groupClassListLocations(
        pilotCase.locations.filter(
          (location) =>
            location.kind === "class-list" && !isSummonTableLocation(location),
        ),
        pilotCase.id,
      ).length,
    0,
  );
  const expectedTableCount = manifest.cases.reduce(
    (total, pilotCase) =>
      total + pilotCase.locations.filter(isSummonTableLocation).length,
    0,
  );
  assertCount(spells.length, expectedSpellCount, "spell entities");
  assertCount(
    classListOccurrences.length,
    expectedOccurrenceCount,
    "class-list occurrences",
  );
  assertCount(summonTables.length, expectedTableCount, "summon tables");

  return {
    spells,
    classListOccurrences,
    summonTables,
    rows: [...spells, ...classListOccurrences, ...summonTables],
  };
}

function extractSpellEntity(
  pilotCase: PhbPilotCase,
  locations: PhbPilotLocation[],
  pageByLocation: Map<string, PilotPageRow>,
): PilotSpellEntity {
  const selectedPages = uniqueLocations(locations).map((location) =>
    requiredPage(pageByLocation, location, pilotCase.id),
  );
  const lines = selectedPages.flatMap(reconstructReadingLines);
  const headingIndexes = lines.flatMap((line, index) =>
    line.text === pilotCase.printedName && isSpellHeadingAt(lines, index)
      ? [index]
      : [],
  );
  if (headingIndexes.length !== 1) {
    throw new Error(
      `PHB pilot case ${pilotCase.id} expected one exact heading ${JSON.stringify(
        pilotCase.printedName,
      )}, found ${headingIndexes.length}`,
    );
  }
  const start = headingIndexes[0]!;
  let stop = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isSpellHeadingAt(lines, index)) {
      stop = index;
      break;
    }
  }
  const entityLines = lines.slice(start, stop);
  const levelIndex = entityLines.findIndex(
    (line, index) => index > 0 && parseField(line.text)?.name === "level",
  );
  if (levelIndex < 2) {
    throw new Error(`PHB pilot case ${pilotCase.id} has no school/Level block`);
  }
  const school = joinWrappedLines(
    entityLines.slice(1, levelIndex).map((line) => line.text),
  );
  if (!SCHOOL_PATTERN.test(school)) {
    throw new Error(
      `PHB pilot case ${pilotCase.id} has an unrecognized school line: ${school}`,
    );
  }

  const fields: Partial<Record<PilotSpellFieldName, string>> = {};
  const fieldLines = new Map<PilotSpellFieldName, string[]>();
  let currentField: PilotSpellFieldName | null = null;
  let bodyStart = -1;
  for (let index = levelIndex; index < entityLines.length; index += 1) {
    const line = entityLines[index]!;
    const field = parseField(line.text);
    if (field) {
      if (fieldLines.has(field.name)) {
        throw new Error(
          `PHB pilot case ${pilotCase.id} repeats field ${field.name}`,
        );
      }
      currentField = field.name;
      fieldLines.set(field.name, [field.value]);
      continue;
    }
    if (currentField === "spellResistance") {
      bodyStart = index;
      break;
    }
    if (currentField === null) {
      throw new Error(
        `PHB pilot case ${pilotCase.id} has text before its first field`,
      );
    }
    fieldLines.get(currentField)!.push(line.text);
  }
  if (bodyStart < 0) {
    throw new Error(`PHB pilot case ${pilotCase.id} has no description body`);
  }
  for (const [name, values] of fieldLines) {
    const value = joinWrappedLines(values);
    if (value.length === 0) {
      throw new Error(`PHB pilot case ${pilotCase.id} has empty field ${name}`);
    }
    fields[name] = value;
  }
  for (const required of ["level", "spellResistance"] as const) {
    if (!fields[required]) {
      throw new Error(
        `PHB pilot case ${pilotCase.id} is missing required field ${required}`,
      );
    }
  }
  const bodyLines = entityLines.slice(bodyStart).map((line) => line.text);
  const bodyText = joinWrappedLines(bodyLines);
  if (bodyText.length === 0) {
    throw new Error(`PHB pilot case ${pilotCase.id} has an empty body`);
  }
  const sourcePages = uniqueSourcePages(entityLines.map((line) => line.page));
  const wrappedFields = [...fieldLines]
    .filter(([, values]) => values.length > 1)
    .map(([name]) => `wrapped-field:${name}`);

  return {
    entityType: "spell",
    caseId: pilotCase.id,
    printedName: pilotCase.printedName,
    sourcePages,
    school,
    fields,
    bodyText,
    sourceText: entityLines.map((line) => line.text).join("\n"),
    reviewFlags: uniqueStrings([
      ...pilotCase.selectionReasons,
      ...wrappedFields,
      ...(sourcePages.length > 1 ? ["cross-page-source"] : []),
    ]),
  };
}

function extractClassListOccurrence(
  pilotCase: PhbPilotCase,
  locations: PhbPilotLocation[],
  pages: PilotPageRow[],
): PilotClassListOccurrence {
  const provenanceLocation = locations[0]!;
  const ownerAndLevel = /^(.*?)\s+([1-9])(?:\s+section)?$/u.exec(
    provenanceLocation.anchor,
  );
  if (!ownerAndLevel || ownerAndLevel[1]!.trim().length === 0) {
    throw new Error(
      `PHB pilot class-list anchor must be owner plus level: ${provenanceLocation.anchor}`,
    );
  }
  const owner = ownerAndLevel[1]!.trim();
  const level = Number(ownerAndLevel[2]);
  const lines = pages.flatMap(reconstructReadingLines);
  const escapedName = escapeRegExp(pilotCase.printedName);
  const entryPattern = new RegExp(
    `^(?:([1-9])\\s+)?${escapedName}:\\s*(.*)$`,
    "u",
  );
  const matches = lines.flatMap((line, index) => {
    const match = entryPattern.exec(line.text);
    if (match) return [{ index, match }];
    const segmentIndex = line.segments.findIndex((item) =>
      new RegExp(`^(?:[1-9]\\s+)?${escapedName}:$`, "u").test(item.text.trim()),
    );
    if (segmentIndex < 0) return [];
    const entryText = joinLineSegments(line.segments.slice(segmentIndex));
    return [{ index, match: entryPattern.exec(entryText) }];
  });
  if (matches.length !== 1) {
    throw new Error(
      `PHB pilot case ${pilotCase.id} locations ${locations.map((location) => location.anchor).join(" -> ")} expected one exact class-list row, found ${matches.length}`,
    );
  }
  const found = matches[0]!;
  const parsed = found.match ?? entryPattern.exec(lines[found.index]!.text);
  if (!parsed) {
    throw new Error(
      `PHB pilot case ${pilotCase.id} could not reconstruct its class-list row`,
    );
  }
  if (parsed[1] && Number(parsed[1]) !== level) {
    throw new Error(
      `PHB pilot case ${pilotCase.id} printed level ${parsed[1]} does not match anchor ${provenanceLocation.anchor}`,
    );
  }
  const sourceLines = [lines[found.index]!];
  for (let index = found.index + 1; index < lines.length; index += 1) {
    const candidate = lines[index]!;
    if (looksLikeClassListEntry(candidate, sourceLines[0]!.x)) break;
    if (Math.abs(candidate.x - sourceLines[0]!.x) > 24) break;
    sourceLines.push(candidate);
  }
  const firstSummary = parsed[2]!.trim();
  const summaryText = joinWrappedLines([
    firstSummary,
    ...sourceLines.slice(1).map((line) => line.text),
  ]);
  if (summaryText.length === 0) {
    throw new Error(
      `PHB pilot case ${pilotCase.id} location ${provenanceLocation.anchor} has an empty summary`,
    );
  }
  return {
    entityType: "class-list-occurrence",
    caseId: pilotCase.id,
    printedName: pilotCase.printedName,
    owner,
    level,
    locationAnchor: provenanceLocation.anchor,
    locationAnchors: locations.map((location) => location.anchor),
    sourcePage: toSourcePage(sourceLines[0]!.page),
    sourcePages: uniqueSourcePages(pages),
    summaryText,
    sourceText: sourceLines.map((line) => line.text).join("\n"),
    wordingGroupKey: normalizeWordingGroup(summaryText),
    reviewFlags: uniqueStrings(pilotCase.selectionReasons),
  };
}

function extractSummonTable(
  pilotCase: PhbPilotCase,
  page: PilotPageRow,
): PilotSummonTableEntity {
  if (page.printedPageNumber !== 287) {
    throw new Error(
      `PHB pilot summon table must use printed page 287, got ${String(page.printedPageNumber)}`,
    );
  }
  const items = page.pdfjs.items.filter((item) => item.text.trim().length > 0);
  const titles = items.filter((item) => item.text.trim() === "Summon Monster");
  if (titles.length !== 1) {
    throw new Error(
      `PHB pilot summon table expected one exact Summon Monster title, found ${titles.length}`,
    );
  }
  const title = titles[0]!;
  const headings = items.flatMap((item) => {
    const match = LEVEL_HEADING_PATTERN.exec(item.text.trim());
    return match && item.y < title.y ? [{ item, level: Number(match[1]) }] : [];
  });
  assertUnique(
    headings.map((heading) => String(heading.level)),
    "Summon Monster table level",
  );
  if (headings.length !== 9) {
    throw new Error(
      `Summon Monster table must contain levels 1-9, found ${headings.length}`,
    );
  }
  const headingByLevel = new Map(
    headings.map((heading) => [heading.level, heading]),
  );
  for (let level = 1; level <= 9; level += 1) {
    if (!headingByLevel.has(level)) {
      throw new Error(`Summon Monster table is missing level ${level}`);
    }
  }
  const columnStarts = uniqueNumbers(headings.map((heading) => heading.item.x));
  if (columnStarts.length !== 3) {
    throw new Error(
      `Summon Monster table must have three PDF.js coordinate columns, found ${columnStarts.length}`,
    );
  }
  const columnBounds = columnStarts.map((start, index) => ({
    start,
    min: Math.max(0, start - 18),
    max:
      index === columnStarts.length - 1
        ? page.pdfjs.width
        : columnStarts[index + 1]! - 8,
  }));
  const footnotes = extractTableFootnotes(items, columnBounds.at(-1)!);
  const definedMarkers = new Set(footnotes.map((footnote) => footnote.marker));

  const levels: PilotSummonTableLevel[] = [];
  for (let level = 1; level <= 9; level += 1) {
    const heading = headingByLevel.get(level)!;
    const column = nearestColumn(columnBounds, heading.item.x);
    const columnIndex = columnBounds.indexOf(column);
    const nextHeading = headings
      .filter(
        (candidate) =>
          candidate.item.x === heading.item.x &&
          candidate.item.y < heading.item.y,
      )
      .sort((left, right) => right.item.y - left.item.y)[0];
    const lowerY = nextHeading?.item.y ?? 0;
    const regions = [{ column, upperY: heading.item.y, lowerY }];
    if (!nextHeading && columnIndex < columnBounds.length - 1) {
      const overflowColumn = columnBounds[columnIndex + 1]!;
      const firstOverflowHeading = headings
        .filter(
          (candidate) => Math.abs(candidate.item.x - overflowColumn.start) <= 2,
        )
        .sort((left, right) => right.item.y - left.item.y)[0];
      if (!firstOverflowHeading) {
        throw new Error(
          `Summon Monster level ${level} cannot locate the next-column heading`,
        );
      }
      regions.push({
        column: overflowColumn,
        upperY: title.y,
        lowerY: firstOverflowHeading.item.y,
      });
    }
    const alignmentGroups = regions.map((region) => ({
      region,
      alignments: items
        .filter(
          (item) =>
            item.x >= region.column.min &&
            item.x < region.column.max &&
            item.y < region.upperY &&
            item.y > region.lowerY &&
            ALIGNMENTS.has(item.text.trim()),
        )
        .sort((left, right) => right.y - left.y || left.x - right.x),
    }));
    if (alignmentGroups.every((group) => group.alignments.length === 0)) {
      throw new Error(`Summon Monster level ${level} has no monster rows`);
    }
    const monsters = alignmentGroups.flatMap(({ region, alignments }) =>
      alignments.map((alignment, index) => {
        const nextAlignment = alignments[index + 1];
        const lowerRowY = nextAlignment
          ? (alignment.y + nextAlignment.y) / 2 - 0.25
          : Math.max(region.lowerY, alignment.y - 13);
        const rowItems = items.filter(
          (item) =>
            item.x >= region.column.min &&
            item.x < alignment.x - 1 &&
            item.y <= alignment.y + 4.5 &&
            item.y >= lowerRowY &&
            item !== heading.item &&
            !LEVEL_HEADING_PATTERN.test(item.text.trim()) &&
            !ALIGNMENTS.has(item.text.trim()),
        );
        const markerItems = rowItems.filter(
          (item) =>
            /^\d+$/u.test(item.text.trim()) &&
            definedMarkers.has(item.text.trim()),
        );
        const nameItems = rowItems.filter(
          (item) => !markerItems.includes(item),
        );
        const reconstructed = reconstructCoordinateText(nameItems);
        const embeddedCandidate = /^(.*?)(\d+)$/u.exec(reconstructed);
        const embedded =
          embeddedCandidate && definedMarkers.has(embeddedCandidate[2]!)
            ? embeddedCandidate
            : null;
        const monsterName = (embedded?.[1] ?? reconstructed).trim();
        const footnoteMarkers = uniqueStrings([
          ...markerItems.map((item) => item.text.trim()),
          ...(embedded ? embedded[2]!.split("") : []),
        ]);
        if (monsterName.length === 0) {
          throw new Error(
            `Summon Monster level ${level} has an empty monster name at y=${alignment.y}`,
          );
        }
        return {
          monsterName,
          alignment: alignment.text.trim(),
          footnoteMarkers,
        };
      }),
    );
    levels.push({ level, monsters });
  }

  for (const level of levels) {
    for (const monster of level.monsters) {
      for (const marker of monster.footnoteMarkers) {
        if (!definedMarkers.has(marker)) {
          throw new Error(
            `Summon Monster row ${monster.monsterName} references missing footnote ${marker}`,
          );
        }
      }
    }
  }
  const sourceText = [
    "Summon Monster",
    ...levels.flatMap((entry) => [
      `${ordinal(entry.level)} Level`,
      ...entry.monsters.map(
        (monster) =>
          `${monster.monsterName}${monster.footnoteMarkers.join("")}\t${monster.alignment}`,
      ),
    ]),
    ...footnotes.map((footnote) => `${footnote.marker} ${footnote.text}`),
  ].join("\n");
  const tableBlocks = page.mineru.blocks.filter(
    (block) => block.type === "table",
  );
  return {
    entityType: "summon-table",
    caseId: pilotCase.id,
    printedName: "Summon Monster",
    sourcePage: toSourcePage(page),
    levels,
    footnotes,
    sourceText,
    mineruLayoutHint: {
      authority: "layout-hint-only",
      risk: "ocr-risk",
      engine: page.mineru.engine,
      version: page.mineru.version,
      tableBlockCount: tableBlocks.length,
      tableBlockBboxes: tableBlocks.flatMap((block) =>
        block.bbox ? [block.bbox] : [],
      ),
    },
    reviewFlags: uniqueStrings([
      ...pilotCase.selectionReasons,
      ...(tableBlocks.length > 0 ? ["mineru-layout-hint-only"] : []),
    ]),
  };
}

function extractTableFootnotes(
  items: PilotPdfTextItem[],
  rightColumn: { min: number; max: number },
) {
  const starts = items
    .filter(
      (item) =>
        item.x >= rightColumn.min &&
        item.x < rightColumn.max &&
        /^(\d+)\s+\S/u.test(item.text.trim()),
    )
    .sort((left, right) => right.y - left.y);
  return starts.flatMap((start) => {
    const match = /^(\d+)\s+(.+)$/u.exec(start.text.trim());
    if (!match) return [];
    const continuation = items
      .filter(
        (item) =>
          item.x >= start.x &&
          item.x < rightColumn.max &&
          item.y < start.y - 1 &&
          item.y >= start.y - 12 &&
          !ALIGNMENTS.has(item.text.trim()),
      )
      .sort((left, right) => right.y - left.y || left.x - right.x)
      .map((item) => item.text.trim())
      .filter(Boolean);
    return [
      {
        marker: match[1]!,
        text: joinWrappedLines([match[2]!, ...continuation]),
      },
    ];
  });
}

function reconstructReadingLines(page: PilotPageRow): ReadingLine[] {
  const lines: ReadingLine[] = [];
  let segments: PilotPdfTextItem[] = [];
  let baseline: number | null = null;
  const flush = () => {
    const visible = segments.filter((item) => item.text.trim().length > 0);
    if (visible.length > 0) {
      const text = joinLineSegments(segments);
      if (text.length > 0 && !isPageFurniture(text, page)) {
        lines.push({
          page,
          text,
          x: Math.min(...visible.map((item) => item.x)),
          y: Math.max(...visible.map((item) => item.y)),
          height: Math.max(...visible.map((item) => item.height)),
          segments: visible,
        });
      }
    }
    segments = [];
    baseline = null;
  };

  for (const item of page.pdfjs.items) {
    if (
      baseline !== null &&
      item.text.trim().length > 0 &&
      Math.abs(item.y - baseline) > 2
    ) {
      flush();
    }
    if (item.text.length > 0) {
      segments.push(item);
      if (item.text.trim().length > 0) baseline = item.y;
    }
    if (item.hasEol) flush();
  }
  flush();
  return lines;
}

function joinLineSegments(items: PilotPdfTextItem[]) {
  const visible = items.filter((item) => item.text.length > 0);
  let output = "";
  let previous: PilotPdfTextItem | null = null;
  for (const item of visible) {
    const text = item.text;
    if (
      previous &&
      output.length > 0 &&
      !/\s$/u.test(output) &&
      !/^\s/u.test(text) &&
      !/^[,.;:!?\])}]/u.test(text) &&
      !/[([{]$/u.test(output) &&
      item.x - (previous.x + previous.width) > 1
    ) {
      output += " ";
    }
    output += text;
    previous = item;
  }
  return output.replace(/\s+/gu, " ").trim();
}

function reconstructCoordinateText(items: PilotPdfTextItem[]) {
  const lines = new Map<number, PilotPdfTextItem[]>();
  for (const item of items) {
    const existingY = [...lines.keys()].find(
      (y) => Math.abs(y - item.y) <= 1.5,
    );
    const key = existingY ?? item.y;
    const line = lines.get(key) ?? [];
    line.push(item);
    lines.set(key, line);
  }
  return [...lines]
    .sort(([left], [right]) => right - left)
    .map(([, line]) =>
      joinLineSegments(line.sort((left, right) => left.x - right.x)),
    )
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function isSpellHeadingAt(lines: ReadingLine[], index: number) {
  const heading = lines[index];
  if (
    !heading ||
    heading.text.includes(":") ||
    /[.!?]$/u.test(heading.text) ||
    !/^\p{Lu}[\p{L}\p{N}’'(),\- ]+$/u.test(heading.text)
  ) {
    return false;
  }
  const following = lines.slice(index + 1, index + 5);
  if (!following[0] || !SCHOOL_PATTERN.test(following[0].text)) return false;
  return following.some((line) => parseField(line.text)?.name === "level");
}

function parseField(text: string): FieldMatch | null {
  const match =
    /^(Level|Components|Casting Time|Range|Target or Area|Targets?|Effect|Area|Duration|Saving Throw|Spell Resistance):\s*(.*)$/u.exec(
      text,
    );
  if (!match) return null;
  const names: Record<string, PilotSpellFieldName> = {
    Level: "level",
    Components: "components",
    "Casting Time": "castingTime",
    Range: "range",
    Target: "target",
    Targets: "target",
    "Target or Area": "target",
    Effect: "effect",
    Area: "area",
    Duration: "duration",
    "Saving Throw": "savingThrow",
    "Spell Resistance": "spellResistance",
  };
  return { name: names[match[1]!]!, value: match[2]!.trim() };
}

function looksLikeClassListEntry(line: ReadingLine, targetX: number) {
  if (line.x > targetX + 2) return false;
  return line.segments.some((item) =>
    /^(?:[1-9]\s+)?[\p{L}][^:]*:\s*$/u.test(item.text.trim()),
  );
}

function normalizeWordingGroup(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u2013\u2014]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

function joinWrappedLines(values: string[]) {
  let result = "";
  for (const raw of values) {
    const value = raw.trim();
    if (value.length === 0) continue;
    if (result.length === 0) {
      result = value;
    } else if (result.endsWith("-")) {
      result += value;
    } else {
      result += ` ${value}`;
    }
  }
  return result.replace(/\s+/gu, " ").trim();
}

function validateSelectedPages(
  manifest: PhbPilotManifest,
  pageByLocation: Map<string, PilotPageRow>,
) {
  for (const pilotCase of manifest.cases) {
    for (const location of pilotCase.locations) {
      if (location.kind === "errata") continue;
      const page = requiredPage(pageByLocation, location, pilotCase.id);
      if (!page.caseIds.includes(pilotCase.id)) {
        throw new Error(
          `PHB pilot page ${page.sourceId}:${page.sourcePageIndex} does not include case ${pilotCase.id}`,
        );
      }
      if (!page.kinds.includes(location.kind)) {
        throw new Error(
          `PHB pilot page ${page.sourceId}:${page.sourcePageIndex} does not include kind ${location.kind}`,
        );
      }
      if (page.printedPageNumber !== location.printedPageNumber) {
        throw new Error(
          `PHB pilot page number mismatch for ${pilotCase.id}:${location.anchor}`,
        );
      }
    }
  }
}

function parsePilotPageRow(value: unknown, lineNumber: number): PilotPageRow {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error(
      `PHB pilot page row ${lineNumber} must use schemaVersion 1`,
    );
  }
  requireString(value.sourceId, lineNumber, "sourceId");
  requireString(value.sourceArtifactSha256, lineNumber, "sourceArtifactSha256");
  requireString(value.subsetArtifactSha256, lineNumber, "subsetArtifactSha256");
  requireNonNegativeInteger(
    value.subsetPageIndex,
    lineNumber,
    "subsetPageIndex",
  );
  requireNonNegativeInteger(
    value.sourcePageIndex,
    lineNumber,
    "sourcePageIndex",
  );
  if (
    value.printedPageNumber !== null &&
    (!Number.isInteger(value.printedPageNumber) ||
      (value.printedPageNumber as number) <= 0)
  ) {
    throw new Error(
      `PHB pilot page row ${lineNumber}.printedPageNumber must be positive integer or null`,
    );
  }
  requireStringArray(value.caseIds, lineNumber, "caseIds");
  requireStringArray(value.kinds, lineNumber, "kinds");
  if (!isRecord(value.pdfjs) || !isRecord(value.pdfjs.extractor)) {
    throw new Error(`PHB pilot page row ${lineNumber}.pdfjs is invalid`);
  }
  requireString(value.pdfjs.extractor.name, lineNumber, "pdfjs.extractor.name");
  requireString(
    value.pdfjs.extractor.version,
    lineNumber,
    "pdfjs.extractor.version",
  );
  requirePositiveNumber(value.pdfjs.width, lineNumber, "pdfjs.width");
  requirePositiveNumber(value.pdfjs.height, lineNumber, "pdfjs.height");
  requireString(
    value.pdfjs.textLayerSha256,
    lineNumber,
    "pdfjs.textLayerSha256",
  );
  if (!Array.isArray(value.pdfjs.items) || value.pdfjs.items.length === 0) {
    throw new Error(`PHB pilot page row ${lineNumber}.pdfjs.items is invalid`);
  }
  const items = value.pdfjs.items.map((item, index) =>
    parseTextItem(item, lineNumber, index),
  );
  if (!isRecord(value.mineru) || !Array.isArray(value.mineru.blocks)) {
    throw new Error(`PHB pilot page row ${lineNumber}.mineru is invalid`);
  }
  requireString(value.mineru.engine, lineNumber, "mineru.engine");
  requireString(value.mineru.version, lineNumber, "mineru.version");
  requireString(
    value.mineru.contentListSha256,
    lineNumber,
    "mineru.contentListSha256",
  );
  const blocks = value.mineru.blocks.map((block, index) =>
    parseLayoutBlock(block, lineNumber, index),
  );
  return {
    schemaVersion: 1,
    sourceId: value.sourceId as string,
    sourceArtifactSha256: value.sourceArtifactSha256 as string,
    subsetArtifactSha256: value.subsetArtifactSha256 as string,
    subsetPageIndex: value.subsetPageIndex as number,
    sourcePageIndex: value.sourcePageIndex as number,
    printedPageNumber: value.printedPageNumber as number | null,
    caseIds: value.caseIds as string[],
    kinds: value.kinds as string[],
    pdfjs: {
      extractor: {
        name: value.pdfjs.extractor.name as string,
        version: value.pdfjs.extractor.version as string,
      },
      width: value.pdfjs.width as number,
      height: value.pdfjs.height as number,
      textLayerSha256: value.pdfjs.textLayerSha256 as string,
      items,
    },
    mineru: {
      engine: value.mineru.engine as string,
      version: value.mineru.version as string,
      contentListSha256: value.mineru.contentListSha256 as string,
      blocks,
    },
  };
}

function parseTextItem(value: unknown, row: number, index: number) {
  if (
    !isRecord(value) ||
    typeof value.text !== "string" ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    typeof value.fontName !== "string" ||
    typeof value.hasEol !== "boolean"
  ) {
    throw new Error(
      `PHB pilot page row ${row}.pdfjs.items[${index}] is invalid`,
    );
  }
  return value as PilotPdfTextItem;
}

function parseLayoutBlock(value: unknown, row: number, index: number) {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    (value.textOrigin !== "text-layer" &&
      value.textOrigin !== "ocr-risk" &&
      value.textOrigin !== "none")
  ) {
    throw new Error(
      `PHB pilot page row ${row}.mineru.blocks[${index}] is invalid`,
    );
  }
  const parsedBbox = nullableBbox(value.bbox);
  if (value.bbox !== null && parsedBbox === null) {
    throw new Error(
      `PHB pilot page row ${row}.mineru.blocks[${index}].bbox is invalid`,
    );
  }
  return {
    type: value.type,
    bbox: parsedBbox,
    textOrigin: value.textOrigin,
  } as PilotMineruLayoutBlock;
}

function requiredPage(
  pageByLocation: Map<string, PilotPageRow>,
  location: PhbPilotLocation,
  caseId: string,
) {
  const page = pageByLocation.get(
    pageKey(location.sourceId, location.zeroBasedPageIndex),
  );
  if (!page) {
    throw new Error(
      `PHB pilot case ${caseId} is missing selected page ${location.sourceId}:${location.zeroBasedPageIndex}`,
    );
  }
  return page;
}

function uniqueLocations(locations: PhbPilotLocation[]) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = pageKey(location.sourceId, location.zeroBasedPageIndex);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSourcePages(pages: PilotPageRow[]) {
  const seen = new Set<string>();
  return pages.flatMap((page) => {
    const key = pageKey(page.sourceId, page.sourcePageIndex);
    if (seen.has(key)) return [];
    seen.add(key);
    return [toSourcePage(page)];
  });
}

function toSourcePage(page: PilotPageRow): PilotSourcePage {
  return {
    sourceId: page.sourceId,
    sourceArtifactSha256: page.sourceArtifactSha256,
    sourcePageIndex: page.sourcePageIndex,
    printedPageNumber: page.printedPageNumber,
    textLayerSha256: page.pdfjs.textLayerSha256,
  };
}

function assertUniquePageRows(pages: PilotPageRow[]) {
  assertUnique(
    pages.map((page) => pageKey(page.sourceId, page.sourcePageIndex)),
    "PHB pilot page",
  );
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} is duplicated: ${value}`);
    seen.add(value);
  }
}

function assertCount(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(
      `PHB pilot ${label} are incomplete: expected ${expected}, got ${actual}`,
    );
  }
}

function pageKey(sourceId: string, sourcePageIndex: number) {
  return `${sourceId}\u0000${sourcePageIndex}`;
}

function isSummonTableLocation(location: PhbPilotLocation) {
  return (
    location.kind === "class-list" &&
    location.printedPageNumber === 287 &&
    location.anchor === "SUMMON MONSTER"
  );
}

function groupClassListLocations(
  locations: PhbPilotLocation[],
  caseId: string,
) {
  const groups: PhbPilotLocation[][] = [];
  for (let index = 0; index < locations.length; index += 1) {
    const location = locations[index]!;
    if (/\ssection$/u.test(location.anchor)) {
      const continuation = locations[index + 1];
      if (!continuation || !/row continuation$/u.test(continuation.anchor)) {
        throw new Error(
          `PHB pilot case ${caseId} section anchor has no row continuation`,
        );
      }
      groups.push([location, continuation]);
      index += 1;
      continue;
    }
    if (/row continuation$/u.test(location.anchor)) {
      throw new Error(
        `PHB pilot case ${caseId} has an unowned class-list row continuation`,
      );
    }
    groups.push([location]);
  }
  return groups;
}

function isPageFurniture(text: string, page: PilotPageRow) {
  return (
    (page.printedPageNumber !== null &&
      text === String(page.printedPageNumber)) ||
    text === "CHAPTER 11:" ||
    text === "SPELLS"
  );
}

function nearestColumn<T extends { start: number }>(columns: T[], x: number) {
  return [...columns].sort(
    (left, right) => Math.abs(left.start - x) - Math.abs(right.start - x),
  )[0]!;
}

function uniqueNumbers(values: number[]) {
  const result: number[] = [];
  for (const value of [...values].sort((left, right) => left - right)) {
    if (!result.some((candidate) => Math.abs(candidate - value) <= 2)) {
      result.push(value);
    }
  }
  return result;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function ordinal(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

function nullableBbox(value: unknown): [number, number, number, number] | null {
  return Array.isArray(value) &&
    value.length === 4 &&
    value.every(isFiniteNumber)
    ? (value as [number, number, number, number])
    : null;
}

function requireString(value: unknown, row: number, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`PHB pilot page row ${row}.${field} must be a string`);
  }
}

function requireStringArray(value: unknown, row: number, field: string) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((entry) => typeof entry === "string" && entry.length > 0)
  ) {
    throw new Error(`PHB pilot page row ${row}.${field} must be string[]`);
  }
}

function requireNonNegativeInteger(value: unknown, row: number, field: string) {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(
      `PHB pilot page row ${row}.${field} must be a non-negative integer`,
    );
  }
}

function requirePositiveNumber(value: unknown, row: number, field: string) {
  if (!isFiniteNumber(value) || value <= 0) {
    throw new Error(
      `PHB pilot page row ${row}.${field} must be a positive number`,
    );
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
