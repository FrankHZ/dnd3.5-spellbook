import assert from "node:assert/strict";

import { discoverFullSpellEntities, type FullPageRow } from "./full-extraction";
import { compareTokenMultisets } from "./pilot-extraction";

const page = fullPage([
  "First Spell",
  "Evocation [Force]",
  "Level: Sor/Wiz 1",
  "Components: V, S",
  "Casting Time: 1 standard action",
  "Range: Medium (100 ft. + 10 ft./level)",
  "Target: One creature",
  "Duration: Instantaneous",
  "Saving Throw: None",
  "Spell Resistance: Yes",
  "The first spell has a body.",
  "Broken Spell",
  "Conjuration",
  "Level: Sor/Wiz 2",
  "Components: V",
]);

const result = discoverFullSpellEntities([page]);
assert.equal(result.headingCount, 2);
assert.equal(result.spells.length, 1);
assert.equal(result.spells[0]!.printedName, "First Spell");
assert.equal(result.spells[0]!.fields.level, "Sor/Wiz 1");
assert.equal(result.issues.length, 1);
assert.equal(result.issues[0]!.kind, "spell-block-parse-failed");
assert.match(result.issues[0]!.message, /no description body/u);

const duplicate = discoverFullSpellEntities([
  page,
  fullPage(
    [
      "First Spell",
      "Evocation [Force]",
      "Level: Sor/Wiz 1",
      "Spell Resistance: Yes",
      "Another body.",
    ],
    197,
  ),
]);
assert.equal(
  duplicate.issues.some((issue) => issue.kind === "duplicate-spell-heading"),
  true,
);

const headingVariants = discoverFullSpellEntities([
  fullPage([
    "Open/Close",
    "Transmutation",
    "Level: Sor/Wiz 0",
    "Spell Resistance: Yes",
    "This spell opens or closes an object.",
  ]),
  fullPageWithWrappedHeading(197),
]);
assert.deepEqual(
  headingVariants.spells.map((spell) => spell.printedName),
  ["Open/Close", "Sympathetic Vibration"],
);

const tableOwner = discoverFullSpellEntities([fullPageWithDetachedTable(198)]);
assert.equal(tableOwner.issues.length, 0);
assert.equal(tableOwner.spells.length, 2);
assert.match(
  tableOwner.spells.find((spell) => spell.printedName === "Table Spell")!
    .bodyText,
  /First row Second row/u,
);
assert.doesNotMatch(
  tableOwner.spells.find((spell) => spell.printedName === "Following Spell")!
    .bodyText,
  /First row/u,
);
assert.deepEqual(
  tableOwner.spells.find((spell) => spell.printedName === "Table Spell")!
    .reviewFlags,
  ["detached-named-table", "table-or-list"],
);
assert.equal(tableOwner.detachedTables.length, 1);
assert.equal(tableOwner.detachedTables[0]!.rowId, "detached-table:table-spell");
assert.equal(tableOwner.detachedTables[0]!.lines[1]!.text, "First row");
assert.equal(tableOwner.detachedTables[0]!.lines[1]!.segments[0]!.x, 24);

const wrappedResistance = discoverFullSpellEntities([
  fullPage(
    [
      "Wrapped Resistance",
      "Abjuration",
      "Level: Sor/Wiz 1",
      "Spell Resistance: Yes (harm-",
      "less)",
      "The spell has a body.",
    ],
    199,
  ),
]);
assert.equal(wrappedResistance.issues.length, 0);
assert.equal(
  wrappedResistance.spells[0]!.fields.spellResistance,
  "Yes (harm-less)",
);
assert.equal(wrappedResistance.spells[0]!.bodyText, "The spell has a body.");

const combinedTarget = discoverFullSpellEntities([
  fullPage(
    [
      "Combined Target",
      "Divination",
      "Level: Sor/Wiz 1",
      "Target or Area: One creature or a 10-ft. burst",
      "Duration: Instantaneous",
      "Spell Resistance: No",
      "The spell has a body.",
    ],
    201,
  ),
]);
assert.equal(
  combinedTarget.spells[0]!.fields.targetOrArea,
  "One creature or a 10-ft. burst",
);
assert.equal(combinedTarget.spells[0]!.fields.target, undefined);
assert.ok(
  combinedTarget.spells[0]!.reviewFlags.includes(
    "uncertain:combined-target-effect-area-field",
  ),
);

const editorialBoundary = discoverFullSpellEntities([
  fullPage(
    [
      "Boundary Spell",
      "Evocation",
      "Level: Sor/Wiz 1",
      "Spell Resistance: No",
      "The spell has a body.",
      "Greater (Spell Name)",
      "This editorial note is not spell mechanics.",
    ],
    200,
  ),
]);
assert.equal(editorialBoundary.issues.length, 0);
assert.equal(editorialBoundary.spells[0]!.bodyText, "The spell has a body.");

console.log("PHB full extraction portable tests passed");

function fullPage(lines: string[], sourcePageIndex = 196): FullPageRow {
  const items = lines.map((text, index) => ({
    text,
    x: 36,
    y: 750 - index * 12,
    width: text.length * 5,
    height: 10,
    fontName: "fixture",
    hasEol: true,
  }));
  return {
    schemaVersion: 1,
    sourceId: "phb35-core",
    sourceArtifactSha256: "a".repeat(64),
    sourcePageIndex,
    printedPageNumber: sourcePageIndex,
    rangeKinds: ["description"],
    pdfjs: {
      extractor: { name: "pdfjs-dist", version: "fixture" },
      width: 612,
      height: 792,
      textLayerSha256: "b".repeat(64),
      items,
    },
    ...mineruPayload(items),
  };
}

function fullPageWithWrappedHeading(sourcePageIndex: number): FullPageRow {
  const lines = [
    { text: "Sympathetic", y: 750, height: 11.04, fontName: "heading" },
    { text: "Vibration", y: 736.6, height: 11.04, fontName: "heading" },
    { text: "Evocation [Sonic]", y: 724.6, height: 9, fontName: "body" },
    { text: "Level: Brd 6", y: 712.6, height: 9, fontName: "body" },
    { text: "Duration: Instantaneous", y: 700.6, height: 9, fontName: "body" },
    {
      text: "The vibration damages structures.",
      y: 680.6,
      height: 9,
      fontName: "body",
    },
  ];
  const items = lines.map((line) => ({
    text: line.text,
    x: 36,
    y: line.y,
    width: line.text.length * 5,
    height: line.height,
    fontName: line.fontName,
    hasEol: true,
  }));
  return {
    ...fullPage([], sourcePageIndex),
    pdfjs: {
      ...fullPage([], sourcePageIndex).pdfjs,
      items,
    },
    ...mineruPayload(items),
  };
}

function fullPageWithDetachedTable(sourcePageIndex: number): FullPageRow {
  const page = fullPage(
    [
      "Table Spell",
      "Divination",
      "Level: Wiz 1",
      "Component: V",
      "Range: Personal",
      "Target or Targets: You",
      "Duration: Instantaneous",
      "Spell Resistance: No",
      "The table spell has a body.",
      "Following Spell",
      "Evocation",
      "Level: Sor/Wiz 1",
      "Spell Resistance: No",
      "The following spell has a body.",
    ],
    sourcePageIndex,
  );
  const tableItems = ["Table Spell", "First row", "Second row"].map(
    (text, index) => ({
      text,
      x: 24,
      y: 300 - index * 12,
      width: text.length * 5,
      height: index === 0 ? 9.96 : 9,
      fontName: index === 0 ? "table-heading" : "body",
      hasEol: true,
    }),
  );
  page.pdfjs.items.push(...tableItems);
  Object.assign(
    page,
    mineruPayload([
      ...page.pdfjs.items.slice(0, 9),
      ...tableItems,
      ...page.pdfjs.items.slice(9, -tableItems.length),
    ]),
  );
  return page;
}

function mineruPayload(
  items: FullPageRow["pdfjs"]["items"],
): Pick<FullPageRow, "mineru" | "comparison"> {
  const groups = items.reduce<Array<typeof items>>((result, item) => {
    const last = result.at(-1);
    if (last && last[0]?.y === item.y) {
      last.push(item);
    } else {
      result.push([item]);
    }
    return result;
  }, []);
  const blocks = groups.map((group, blockIndex) => {
    const centers = group.map((item) => ({
      x: ((item.x + item.width / 2) / 612) * 1000,
      y: ((792 - (item.y + item.height / 2)) / 792) * 1000,
    }));
    return {
      blockIndex,
      type: "text",
      bbox: [
        Math.min(...centers.map((center) => center.x)) - 1,
        Math.min(...centers.map((center) => center.y)) - 1,
        Math.max(...centers.map((center) => center.x)) + 1,
        Math.max(...centers.map((center) => center.y)) + 1,
      ] as [number, number, number, number],
      text: group.map((item) => item.text).join(""),
      textLevel: null,
      tableHtml: null,
      listItems: [],
      captions: [],
      footnotes: [],
      assetPath: null,
      textOrigin: "text-layer" as const,
    };
  });
  const pdfText = items.map((item) => item.text).join(" ");
  const mineruText = blocks.map((block) => block.text).join(" ");
  return {
    mineru: {
      engine: "MinerU",
      version: "fixture",
      contentListSha256: "c".repeat(64),
      blocks,
    },
    comparison: compareTokenMultisets(pdfText, mineruText),
  };
}
