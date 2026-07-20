import assert from "node:assert/strict";

import {
  extractPilotEntities,
  parsePilotPageRows,
  type PilotPageRow,
  type PilotPdfTextItem,
} from "./pilot-entities";
import type {
  PhbPilotCase,
  PhbPilotCoverage,
  PhbPilotManifest,
} from "./pilot-manifest";

const sourceId = "phb35-core";
const hash = "a".repeat(64);

function run() {
  const pages = fixturePages();
  const parsedPages = parsePilotPageRows(
    `${pages.map((page) => JSON.stringify(page)).join("\n")}\n`,
  );
  assert.deepEqual(parsedPages, pages);
  assert.throws(
    () =>
      parsePilotPageRows(
        `${JSON.stringify(pages[0])}\n${JSON.stringify(pages[0])}\n`,
      ),
    /PHB pilot page is duplicated/,
  );

  const extracted = extractPilotEntities(fixtureManifest(), parsedPages);
  assert.equal(extracted.spells.length, 2);
  assert.equal(extracted.classListOccurrences.length, 5);
  assert.equal(extracted.summonTables.length, 1);
  assert.equal(extracted.rows.length, 8);

  const crossPage = extracted.spells.find(
    (spell) => spell.caseId === "cross-page-description",
  );
  assert.ok(crossPage);
  assert.deepEqual(
    crossPage.sourcePages.map((page) => page.printedPageNumber),
    [10, 11],
  );
  assert.match(crossPage.bodyText, /continues on page two/);
  assert.doesNotMatch(crossPage.sourceText, /Next Spell/);
  assert.equal(crossPage.fields.target, "One creature");

  const wrapped = extracted.spells.find(
    (spell) => spell.caseId === "wrapped-field-description",
  );
  assert.ok(wrapped);
  assert.equal(
    wrapped.fields.target,
    "Up to one willing creature per level, all within 30 ft. of each other",
  );
  assert.ok(wrapped.reviewFlags.includes("wrapped-field:target"));
  assert.doesNotMatch(wrapped.sourceText, /Later Spell/);

  const dispelRows = extracted.classListOccurrences.filter(
    (row) => row.caseId === "dispel-magic-summary-group",
  );
  assert.deepEqual(
    dispelRows.map((row) => [row.owner, row.level]),
    [
      ["Bard", 3],
      ["Cleric", 3],
      ["Magic domain", 3],
    ],
  );
  assert.equal(new Set(dispelRows.map((row) => row.wordingGroupKey)).size, 2);
  assert.equal(dispelRows[0]!.wordingGroupKey, dispelRows[2]!.wordingGroupKey);
  assert.notEqual(
    dispelRows[0]!.wordingGroupKey,
    dispelRows[1]!.wordingGroupKey,
  );
  assert.equal(
    extracted.classListOccurrences.filter(
      (row) => row.caseId === "stone-shape-level-reconciliation",
    ).length,
    2,
  );

  const table = extracted.summonTables[0]!;
  assert.deepEqual(
    table.levels.map((level) => level.level),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(table.levels[0]!.monsters[0]!.monsterName, "Celestial dog");
  assert.deepEqual(table.levels[0]!.monsters[0]!.footnoteMarkers, ["1"]);
  assert.equal(
    table.levels[1]!.monsters[0]!.monsterName,
    "Fiendish monstrous centipede, Large",
  );
  assert.deepEqual(
    table.levels[2]!.monsters.map((monster) => monster.monsterName),
    ["Fixture monster 3", "Level 3 overflow A", "Level 3 overflow B"],
  );
  assert.deepEqual(
    table.levels[5]!.monsters.map((monster) => monster.monsterName),
    ["Fixture monster 6", "Level 6 overflow A", "Level 6 overflow B"],
  );
  assert.equal(table.levels[8]!.monsters[0]!.alignment, "CE");
  assert.deepEqual(table.footnotes, [{ marker: "1", text: "Aquatic only." }]);
  assert.equal(table.mineruLayoutHint.authority, "layout-hint-only");
  assert.equal(table.mineruLayoutHint.tableBlockCount, 1);
  assert.doesNotMatch(table.sourceText, /OCR SHOULD NOT BE USED/);

  const incomplete = parsedPages.filter((page) => page.sourcePageIndex !== 31);
  assert.throws(
    () => extractPilotEntities(fixtureManifest(), incomplete),
    /missing selected page phb35-core:31/,
  );
  console.log("PHB pilot entity portable tests passed");
}

function fixtureManifest(): PhbPilotManifest {
  return {
    schemaVersion: 1,
    workspace: "phb35",
    status: "proposed",
    sourceManifestSha256: hash,
    reviewer: null,
    decisionNote: null,
    cases: [
      pilotCase(
        "cross-page-description",
        "Cross Page Spell",
        ["cross-page-body"],
        [
          location("description", 10, "CROSS PAGE SPELL"),
          location("description", 11, "continuation from page 10"),
        ],
      ),
      pilotCase(
        "wrapped-field-description",
        "Wrapped Field Spell",
        ["wrapped-field", "column-transition"],
        [location("description", 20, "WRAPPED FIELD SPELL")],
      ),
      pilotCase(
        "dispel-magic-summary-group",
        "Dispel Magic",
        ["table-or-list", "repeated-summary"],
        [
          location("class-list", 30, "Bard 3"),
          location("class-list", 31, "Cleric 3"),
          location("class-list", 32, "Magic domain 3"),
        ],
      ),
      pilotCase(
        "stone-shape-level-reconciliation",
        "Stone Shape",
        ["table-or-list", "repeated-summary"],
        [
          location("class-list", 33, "Druid 3"),
          location("class-list", 34, "Sorcerer/Wizard 4"),
        ],
      ),
      pilotCase(
        "summon-monster-i-and-list",
        "Summon Monster I",
        ["table-or-list"],
        [location("class-list", 287, "SUMMON MONSTER")],
      ),
    ],
  };
}

function pilotCase(
  id: string,
  printedName: string,
  selectionReasons: PhbPilotCoverage[],
  locations: PhbPilotCase["locations"],
): PhbPilotCase {
  return {
    id,
    printedName,
    selectionReasons,
    locations,
    expectedRisk: "Synthetic portable fixture.",
  };
}

function location(
  kind: "description" | "class-list",
  printedPageNumber: number,
  anchor: string,
) {
  return {
    sourceId,
    kind,
    zeroBasedPageIndex: printedPageNumber,
    printedPageNumber,
    anchor,
  } as const;
}

function fixturePages() {
  return [
    page(
      10,
      ["cross-page-description"],
      ["description"],
      [
        line("Cross Page Spell", 40, 700, 11),
        line("Evocation", 49, 688),
        line("Level: Sor/Wiz 2", 49, 676),
        line("Target: One creature", 49, 664),
        line("Spell Resistance: Yes", 49, 652),
        line("The body begins on page one and", 49, 630),
      ],
    ),
    page(
      11,
      ["cross-page-description"],
      ["description"],
      [
        line("continues on page two.", 49, 720),
        line("Next Spell", 40, 690, 11),
        line("Conjuration", 49, 678),
        line("Level: Sor/Wiz 3", 49, 666),
        line("Spell Resistance: No", 49, 654),
        line("This belongs to the next spell.", 49, 642),
      ],
    ),
    page(
      20,
      ["wrapped-field-description"],
      ["description"],
      [
        line("Wrapped Field Spell", 220, 150, 11),
        line("Transmutation", 229, 138),
        line("Level: Drd 8", 229, 126),
        line("Targets: Up to one willing creature per", 229, 114),
        line("level, all within 30 ft. of each other", 238, 102),
        line("Spell Resistance: Yes (harmless)", 229, 90),
        line("The wrapped field is followed by this body.", 229, 70),
        line("Later Spell", 400, 700, 11),
        line("Abjuration", 409, 688),
        line("Level: Clr 1", 409, 676),
      ],
    ),
    classPage(
      30,
      "dispel-magic-summary-group",
      "Dispel Magic: Cancels magical spells and effects.",
    ),
    classPage(
      31,
      "dispel-magic-summary-group",
      "Dispel Magic: Cancels spells and magical effects.",
    ),
    classPage(
      32,
      "dispel-magic-summary-group",
      "3 Dispel Magic: Cancels magical spells and effects.",
    ),
    classPage(
      33,
      "stone-shape-level-reconciliation",
      "Stone Shape: Sculpts stone into any shape.",
    ),
    classPage(
      34,
      "stone-shape-level-reconciliation",
      "Stone Shape: Sculpts stone into any shape.",
    ),
    summonTablePage(),
  ];
}

function classPage(pageNumber: number, caseId: string, entry: string) {
  return page(
    pageNumber,
    [caseId],
    ["class-list"],
    [
      line(entry, pageNumber < 33 ? 70 : 330, 500),
      line(
        "Following Spell: A different summary.",
        pageNumber < 33 ? 70 : 330,
        488,
      ),
    ],
  );
}

function summonTablePage() {
  const items: PilotPdfTextItem[] = [line("Summon Monster", 25, 570, 10)];
  const columns = [34, 212, 390];
  const alignmentXs = [165, 343, 521];
  const headingYs = [550, 400, 250];
  for (let level = 1; level <= 9; level += 1) {
    const columnIndex = Math.floor((level - 1) / 3);
    const rowIndex = (level - 1) % 3;
    const x = columns[columnIndex]!;
    const y = headingYs[rowIndex]!;
    items.push(line(`${ordinal(level)} Level`, x, y, 8));
    const rowY = y - 10;
    if (level === 2) {
      items.push(line("Fiendish monstrous centipede,", x, rowY, 8));
      items.push(line("Large", x + 9, rowY - 10, 8));
    } else {
      items.push(
        line(
          level === 1 ? "Celestial dog" : `Fixture monster ${level}`,
          x,
          rowY,
          8,
        ),
      );
    }
    if (level === 1) items.push(line("1", x + 70, rowY + 3, 6));
    items.push(
      line(
        level === 9 ? "CE" : level % 2 === 0 ? "N" : "LG",
        alignmentXs[columnIndex]!,
        rowY,
        8,
      ),
    );
  }
  for (const [columnIndex, sourceLevel] of [
    [1, 3],
    [2, 6],
  ] as const) {
    const x = columns[columnIndex]!;
    const alignmentX = alignmentXs[columnIndex]!;
    items.push(line(`Level ${sourceLevel} overflow A`, x, 565, 8));
    items.push(line("LG", alignmentX, 565, 8));
    items.push(line(`Level ${sourceLevel} overflow B`, x, 557, 8));
    items.push(line("NG", alignmentX, 557, 8));
  }
  items.push(line("1 Aquatic only.", 390, 220, 8));
  return page(287, ["summon-monster-i-and-list"], ["class-list"], items, [
    {
      type: "table",
      bbox: [20, 200, 590, 580],
      textOrigin: "ocr-risk",
    },
  ]);
}

function page(
  pageNumber: number,
  caseIds: string[],
  kinds: string[],
  items: PilotPdfTextItem[],
  blocks: PilotPageRow["mineru"]["blocks"] = [],
): PilotPageRow {
  return {
    schemaVersion: 1,
    sourceId,
    sourceArtifactSha256: hash,
    subsetArtifactSha256: "b".repeat(64),
    subsetPageIndex: pageNumber,
    sourcePageIndex: pageNumber,
    printedPageNumber: pageNumber,
    caseIds,
    kinds,
    pdfjs: {
      extractor: { name: "pdfjs-dist", version: "portable" },
      width: 612,
      height: 792,
      textLayerSha256: "c".repeat(64),
      items,
    },
    mineru: {
      engine: "MinerU",
      version: "portable",
      contentListSha256: "d".repeat(64),
      blocks,
    },
  };
}

function line(
  text: string,
  x: number,
  y: number,
  height = 9,
): PilotPdfTextItem {
  return {
    text,
    x,
    y,
    width: Math.max(4, text.length * (height / 2)),
    height,
    fontName: height > 10 ? "heading" : "body",
    hasEol: true,
  };
}

function ordinal(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

run();
