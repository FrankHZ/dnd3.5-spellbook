import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  chooseExact,
  exactNameMatchKeys,
  normalizeName,
} from "../short-desc/en-summary-matching";
import {
  parsePatchJsonlText,
  validateInsertSpellShape,
  validateLevelShape,
} from "../rules/spells-schema";
import {
  makeRulebookResolver,
  manualReviewBlocker,
  parseSourceAppearance,
  sourceAppearances,
  sourceLabelKey,
  spellNameVariants,
  summarizeInventory,
} from "../rules/spells-full";
import { classifySourceLabel } from "../rules/spells-full-source-rulebooks";
import { readSummaryJsonlText } from "../short-desc/summary-row-schema";
import { mapBookLabelToAbbr, normalizeBookLabel } from "../zh-parser/mapping";
import {
  auditNormalizedContent,
  normalizeRulesContent,
  type LegacyRulesContentInput,
} from "../rules-content/normalize";
import {
  auditRulebookLabels,
  readRulebookPublicationJsonlText,
} from "../rulebooks/labels-audit";

type TestCase = {
  name: string;
  run: () => void;
};

type FixtureManifest = {
  schemaVersion: number;
  dataRoots: string[];
  mappings: Array<{
    dataPath: string;
    portableFixturePaths: string[];
    note?: string;
  }>;
};

const tests: TestCase[] = [
  {
    name: "script manifest classifies every npm script",
    run: () => {
      const dataToolsRoot = path.resolve(__dirname, "..", "..");
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(dataToolsRoot, "package.json"), "utf-8"),
      ) as { scripts: Record<string, string> };
      const manifest = JSON.parse(
        fs.readFileSync(
          path.join(dataToolsRoot, "scripts.manifest.json"),
          "utf-8",
        ),
      ) as {
        commands: Record<
          string,
          {
            module: string;
            lifecycle: string;
            requiresLocalData: boolean;
            requiresSqlite: boolean;
            writeCapable: boolean;
          }
        >;
      };
      const scriptNames = Object.keys(packageJson.scripts).sort();
      const manifestNames = Object.keys(manifest.commands).sort();
      assert.deepEqual(manifestNames, scriptNames);

      const modules = new Set([
        "harness",
        "rules",
        "rules-content",
        "short-desc",
        "zh-parser",
      ]);
      const lifecycles = new Set([
        "portable",
        "local-acceptance",
        "maintained-local",
        "dormant-local",
      ]);
      for (const [name, command] of Object.entries(manifest.commands)) {
        assert.ok(modules.has(command.module), `${name}: invalid module`);
        assert.ok(
          lifecycles.has(command.lifecycle),
          `${name}: invalid lifecycle`,
        );
        assert.equal(
          typeof command.requiresLocalData,
          "boolean",
          `${name}: requiresLocalData must be boolean`,
        );
        assert.equal(
          typeof command.requiresSqlite,
          "boolean",
          `${name}: requiresSqlite must be boolean`,
        );
        assert.equal(
          typeof command.writeCapable,
          "boolean",
          `${name}: writeCapable must be boolean`,
        );
      }
    },
  },
  {
    name: "server DB fixture manifest mirrors maintained data inputs",
    run: () => {
      const repoRoot = path.resolve(__dirname, "..", "..", "..");
      const manifestPath = path.join(
        repoRoot,
        "server",
        "db",
        "fixtures.manifest.json",
      );
      const manifest = JSON.parse(
        fs.readFileSync(manifestPath, "utf-8"),
      ) as FixtureManifest;

      assert.equal(manifest.schemaVersion, 1);
      assert.ok(manifest.dataRoots.length > 0);
      assert.ok(manifest.mappings.length > 0);

      const mappedDataPaths = new Set<string>();
      for (const mapping of manifest.mappings) {
        assert.ok(mapping.dataPath.startsWith("data/"), mapping.dataPath);
        assert.equal(
          mappedDataPaths.has(mapping.dataPath),
          false,
          `duplicate fixture data mapping: ${mapping.dataPath}`,
        );
        mappedDataPaths.add(mapping.dataPath);
        assert.ok(
          manifest.dataRoots.some((root) => isSameOrChild(root, mapping.dataPath)),
          `${mapping.dataPath} is outside fixture manifest dataRoots`,
        );
        assert.ok(
          mapping.portableFixturePaths.length > 0,
          `${mapping.dataPath} has no portable fixture paths`,
        );
        for (const portablePath of mapping.portableFixturePaths) {
          assert.ok(
            portablePath.startsWith("server/db/"),
            `${portablePath} must stay under server/db`,
          );
          assert.ok(
            fs.existsSync(path.join(repoRoot, portablePath)),
            `missing portable fixture for ${mapping.dataPath}: ${portablePath}`,
          );
        }
      }

      const dataRoot = path.join(repoRoot, "data");
      if (!fs.existsSync(dataRoot)) return;

      const maintainedDataFiles = manifest.dataRoots
        .flatMap((root) => collectJsonlFiles(path.join(repoRoot, root)))
        .map((filePath) => toRepoPath(repoRoot, filePath))
        .sort();

      const missingMappings = maintainedDataFiles.filter(
        (filePath) => !mappedDataPaths.has(filePath),
      );
      assert.deepEqual(
        missingMappings,
        [],
        "maintained data JSONL files need server DB portable fixture mappings",
      );

      for (const mappedPath of mappedDataPaths) {
        assert.ok(
          fs.existsSync(path.join(repoRoot, mappedPath)),
          `fixture manifest maps a missing data repo file: ${mappedPath}`,
        );
      }
    },
  },
  {
    name: "source-label mapping normalizes built-in Chinese labels",
    run: () => {
      assert.equal(normalizeBookLabel(" 《 九剑 》 "), "九剑");
      assert.deepEqual(mapBookLabelToAbbr("《 九剑 》"), {
        abbr: "ToB",
        norm: "九剑",
      });
      assert.deepEqual(mapBookLabelToAbbr(" 模型手册 "), {
        abbr: "MH",
        norm: "模型手册",
      });
      assert.deepEqual(mapBookLabelToAbbr("未知规则书"), {
        abbr: null,
        norm: "未知规则书",
      });
    },
  },
  {
    name: "English name matching normalizes punctuation and known aliases",
    run: () => {
      assert.equal(normalizeName(" Protégé’s Spell (M) "), "protege's spell");
      assert.ok(exactNameMatchKeys("Undeniable Gravity, Legion's").includes(
        "mass undeniable gravity",
      ));
      assert.deepEqual(
        chooseExact(
          [{ name: "Mass Undeniable Gravity" }, { name: "Fireball" }],
          "Undeniable Gravity, Legion's",
        ),
        [{ name: "Mass Undeniable Gravity" }],
      );
    },
  },
  {
    name: "spells-full source helpers parse appearances and rulebook aliases",
    run: () => {
      assert.deepEqual(parseSourceAppearance("Complete Mage 128"), {
        raw: "Complete Mage 128",
        label: "Complete Mage",
        page: 128,
      });
      assert.deepEqual(parseSourceAppearance("Player’s Handbook 3.0 173"), {
        raw: "Player’s Handbook 3.0 173",
        label: "Player’s Handbook 3.0",
        page: 173,
      });
      assert.deepEqual(parseSourceAppearance("Dragon Magazine 304"), {
        raw: "Dragon Magazine 304",
        label: "Dragon Magazine 304",
        page: null,
      });
      assert.deepEqual(
        sourceAppearances(
          "Forgotten Realms: Magic of Faerûn 108; Spell Compendium",
        ).map((source) => ({
          label: source.label,
          page: source.page,
        })),
        [
          { label: "Forgotten Realms: Magic of Faerûn", page: 108 },
          { label: "Spell Compendium", page: null },
        ],
      );
      assert.equal(sourceLabelKey("Player’s Handbook 3.5"), "player s handbook 3 5");
      assert.deepEqual(spellNameVariants("Acid Breath / Mestil’s Acid Breath"), [
        "Acid Breath",
        "Mestil’s Acid Breath",
      ]);

      const resolveRulebook = makeRulebookResolver([
        { id: 1, abbr: "Sc_", name: "Spell Compendium" },
        { id: 2, abbr: "Mag", name: "Magic of Faerun" },
        { id: 3, abbr: "PH", name: "Player's Handbook v.3.5" },
      ]);
      assert.equal(
        resolveRulebook(parseSourceAppearance("Spell Compendium")).targetRulebook
          ?.abbr,
        "Sc_",
      );
      assert.equal(
        resolveRulebook(
          parseSourceAppearance("Forgotten Realms: Magic of Faerûn 108"),
        ).targetRulebook?.abbr,
        "Mag",
      );
      assert.equal(
        resolveRulebook(parseSourceAppearance("Player’s Handbook 3.5"))
          .targetRulebook?.abbr,
        "PH",
      );

      assert.deepEqual(
        summarizeInventory([
          {
            category: "ready",
            name: "Ready Spell",
            source: "Spell Compendium",
            sourceLabel: "Spell Compendium",
            page: null,
            targetRulebook: "Sc_",
            notes: [],
          },
          {
            category: "deferred",
            name: "Deferred Spell",
            source: "Unknown Source",
            sourceLabel: "Unknown Source",
            page: null,
            notes: ["unmapped source label"],
          },
        ]).counts,
        {
          ready: 1,
          duplicate: 0,
          mismatch: 0,
          "manual-review": 0,
          deferred: 1,
        },
      );
    },
  },
  {
    name: "spells-full deferred source classifier separates rulebook families",
    run: () => {
      assert.equal(
        classifySourceLabel("Dragon Magazine 304").sourceCategory,
        "wotc-3e35-periodical",
      );
      assert.equal(
        classifySourceLabel("Dragon Magazine 304").importDisposition,
        "defer-out-of-scope",
      );
      assert.equal(
        classifySourceLabel("Dragon Magazine 309").importDisposition,
        "candidate-import-rulebook",
      );
      assert.equal(
        classifySourceLabel("Rokugan: Magic of Rokugan").importDisposition,
        "defer-out-of-scope",
      );
      assert.equal(
        classifySourceLabel("Dragonlance: Age of Mortals").importDisposition,
        "defer-out-of-scope",
      );
      assert.equal(
        classifySourceLabel("Far Corners of the World: Fire and Ash")
          .sourceCategory,
        "wotc-web-article",
      );
      assert.equal(
        classifySourceLabel("Player’s Handbook").sourceCategory,
        "ambiguous-core-source",
      );
      assert.match(
        manualReviewBlocker({ name: "Augment Truefiend" }, "TM") ?? "",
        /Augment Truefriend/,
      );
      assert.match(
        manualReviewBlocker({ name: "Wake of Trailing" }, "Sto") ?? "",
        /Wake Trailing/,
      );
    },
  },
  {
    name: "summary JSONL validation accepts reviewed rows and rejects duplicates",
    run: () => {
      const valid = {
        schemaVersion: 1,
        spellId: 10,
        rulebookId: 20,
        lang: "zh",
        variant: "chm",
        summaryText: "短描述。",
        sourceKey: "chm:10",
        sourceName: "九剑",
        sourceKind: "chm-overview",
        reviewStatus: "accepted",
      };
      const { rows, errors } = readSummaryJsonlText(`${JSON.stringify(valid)}\n`);
      assert.deepEqual(errors, []);
      assert.equal(rows[0]?.id, "spell-summary:10:zh:chm");

      const duplicate = readSummaryJsonlText(
        `${JSON.stringify(valid)}\n${JSON.stringify(valid)}\n`,
      );
      assert.equal(duplicate.rows.length, 1);
      assert.ok(
        duplicate.errors.some((error) =>
          error.includes("duplicate spell/lang/variant"),
        ),
      );

      const invalid = readSummaryJsonlText(
        JSON.stringify({ ...valid, lang: "fr", reviewStatus: "todo" }),
      );
      assert.ok(invalid.errors.some((error) => error.includes("lang must be")));
      assert.ok(
        invalid.errors.some((error) =>
          error.includes("reviewStatus must be accepted"),
        ),
      );
    },
  },
  {
    name: "rules content normalizer preserves raw mechanics and emits review issues",
    run: () => {
      const input: LegacyRulesContentInput = {
        rulebooks: [
          {
            id: 1,
            dndEditionId: 1,
            name: "Player's Handbook",
            abbr: "PHB",
            slug: "players-handbook",
            displayAbbr: "PH",
          },
        ],
        spells: [
          {
            id: 10,
            added: "2020-01-01T00:00:00.000Z",
            rulebookId: 1,
            page: 231,
            name: "Fixture Spell",
            slug: "fixture-spell",
            schoolId: 2,
            schoolName: "Evocation",
            schoolSlug: "evocation",
            subSchoolId: null,
            subSchoolName: null,
            subSchoolSlug: null,
            verbalComponent: true,
            somaticComponent: true,
            materialComponent: true,
            arcaneFocusComponent: false,
            divineFocusComponent: false,
            xpComponent: false,
            metaBreathComponent: false,
            trueNameComponent: false,
            corruptComponent: false,
            extraComponents: "ruby dust worth 50 gp",
            castingTime: "1 standard action",
            range: "Close (25 ft. + 5 ft./2 levels)",
            target: "One creature",
            effect: null,
            area: null,
            duration: "1 round/level (D)",
            savingThrow: "Reflex half",
            spellResistance: "Yes",
            description: "Fixture rules text.",
            descriptionHtml: "<p>Fixture rules text.</p>",
            verified: true,
            verifiedAuthorId: null,
            verifiedTime: null,
          },
          {
            id: 11,
            added: "2020-01-01T00:00:00.000Z",
            rulebookId: 1,
            page: 232,
            name: "Combined Taxonomy Fixture",
            slug: "combined-taxonomy-fixture",
            schoolId: 10,
            schoolName: "Conjuration/Evocation",
            schoolSlug: "conjurationevocation",
            subSchoolId: 20,
            subSchoolName: "Creation or Calling",
            subSchoolSlug: "creation-or-calling",
            verbalComponent: true,
            somaticComponent: true,
            materialComponent: false,
            arcaneFocusComponent: false,
            divineFocusComponent: false,
            xpComponent: false,
            metaBreathComponent: false,
            trueNameComponent: false,
            corruptComponent: false,
            extraComponents: null,
            castingTime: "1 standard action",
            range: "Medium",
            target: "One creature",
            effect: null,
            area: null,
            duration: "Instantaneous",
            savingThrow: "None",
            spellResistance: "Yes",
            description: "Combined taxonomy fixture text.",
            descriptionHtml: "<p>Combined taxonomy fixture text.</p>",
            verified: true,
            verifiedAuthorId: null,
            verifiedTime: null,
          },
        ],
        descriptors: [
          { spellId: 10, descriptorId: 3, name: "Fire", slug: "fire" },
          {
            spellId: 11,
            descriptorId: 39,
            name: "see text for summon monster I",
            slug: "see-text-for-summon-monster-i",
          },
        ],
        listEntries: [
          {
            id: 100,
            spellId: 10,
            listType: "class",
            ownerId: 5,
            ownerName: "Wizard",
            ownerSlug: "wizard",
            level: 3,
            rulebookId: 1,
            extra: "except specialist variants",
            sourceTable: "dnd_spellclasslevel",
          },
        ],
      };

      const normalized = normalizeRulesContent(input, "2026-07-02T00:00:00.000Z");
      assert.equal(normalized.counts.spells, 2);
      assert.equal(normalized.rulebooks[0]?.displayAbbr, "PH");
      assert.equal(normalized.spells[0]?.descriptionText, "Fixture rules text.");
      assert.equal(normalized.spells[0]?.verified, true);
      assert.equal(normalized.taxonomyFacets.length, 7);
      const combinedTaxonomy = normalized.taxonomyFacets.filter(
        (row) => row.spellId === "spell:11",
      );
      assert.deepEqual(
        combinedTaxonomy
          .filter((row) => row.facetType === "school")
          .map((row) => row.facetKey)
          .sort(),
        ["conjuration", "evocation"],
      );
      assert.deepEqual(
        combinedTaxonomy
          .filter((row) => row.facetType === "subschool")
          .map((row) => row.facetKey)
          .sort(),
        ["calling", "creation"],
      );
      assert.equal(
        combinedTaxonomy.some((row) =>
          ["conjurationevocation", "creation-or-calling"].includes(row.facetKey),
        ),
        false,
      );
      assert.deepEqual(
        combinedTaxonomy
          .filter((row) => row.facetType === "descriptor")
          .map((row) => ({
            legacyFacetId: row.legacyFacetId,
            facetKey: row.facetKey,
            name: row.name,
            rawText: row.rawText,
          })),
        [
          {
            legacyFacetId: null,
            facetKey: "see-text",
            name: "See text",
            rawText: "see text for summon monster I",
          },
        ],
      );
      assert.ok(
        normalized.mechanicFacets.some(
          (row) =>
            row.mechanicType === "casting_time" &&
            row.category === "standard_action" &&
            row.amount === 1,
        ),
      );
      assert.ok(
        normalized.mechanicFacets.some(
          (row) => row.mechanicType === "range" && row.category === "close",
        ),
      );
      assert.ok(
        normalized.components.some(
          (row) =>
            row.componentType === "other" &&
            row.reviewStatus === "review" &&
            row.rawText === "ruby dust worth 50 gp",
        ),
      );
      assert.ok(
        normalized.issues.some(
          (row) => row.issueCode === "list.extra.review",
        ),
      );

      const audit = auditNormalizedContent(normalized);
      assert.equal(audit.reviewCounts.components, 1);
      assert.equal(audit.issueCounts["component.extra.review"], 1);
    },
  },
  {
    name: "rulebook label audit flags source artifacts and missing localized names",
    run: () => {
      const report = auditRulebookLabels(
        [
          {
            id: 1,
            name: "Spell Compendium",
            abbr: "Sc_",
            slug: "spell-compendium",
            editionSlug: "supplementals-35",
            spellCount: 120,
            zhName: "法术大全",
            chmSourceLabels: ["法术大全"],
            publicationDisplayAbbr: "SpC",
            publicationZhName: "万法大全",
            publicationSource: "artifacts/chm-clean/出版物.html",
          },
          {
            id: 2,
            name: "Source With Missing Translation",
            abbr: "SWT",
            slug: "source-with-missing-translation",
            editionSlug: "supplementals-35",
            spellCount: 1,
          },
          {
            id: 3,
            name: "Source With Same Proposed Label",
            abbr: "SWT",
            slug: "source-with-same-proposed-label",
            editionSlug: "supplementals-35",
            spellCount: 1,
            zhName: "重复缩写来源",
          },
          {
            id: 4,
            name: "Unused Source",
            abbr: "UN",
            slug: "unused-source",
            editionSlug: "supplementals-35",
            spellCount: 0,
          },
        ],
        "2026-07-02T00:00:00.000Z",
      );

      const spellCompendium = report.rows.find((row) => row.rulebookId === 1);
      assert.equal(spellCompendium?.proposedDisplayAbbr, "SpC");
      assert.equal(spellCompendium?.status, "replace");
      assert.ok(spellCompendium?.issues.includes("source-abbr-artifact"));
      assert.ok(
        spellCompendium?.issues.includes("publication-display-abbr-mismatch"),
      );

      const missingTranslation = report.rows.find((row) => row.rulebookId === 2);
      assert.equal(missingTranslation?.status, "needs-review");
      assert.ok(missingTranslation?.issues.includes("missing-zh-name"));
      assert.ok(
        missingTranslation?.issues.includes("duplicate-proposed-display-abbr"),
      );

      const unused = report.rows.find((row) => row.rulebookId === 4);
      assert.equal(unused?.status, "defer");
      assert.equal(report.counts.replace, 1);
      assert.equal(report.counts.needsReview, 2);
      assert.equal(report.counts.defer, 1);
      assert.equal(report.counts.duplicateProposedDisplayAbbrs, 2);
    },
  },
  {
    name: "rulebook publication JSONL validates maintained display labels",
    run: () => {
      const valid = readRulebookPublicationJsonlText(
        `${JSON.stringify({
          schemaVersion: 1,
          source: "chm-publications",
          displayAbbr: "SpC",
          englishName: "Spell Compendium",
          zhName: "万法大全",
          reviewStatus: "accepted",
        })}\n`,
        "fixture.jsonl",
      );
      assert.deepEqual(valid.errors, []);
      assert.equal(valid.rows[0]?.displayAbbr, "SpC");

      const duplicate = readRulebookPublicationJsonlText(
        `${JSON.stringify(valid.rows[0])}\n${JSON.stringify(valid.rows[0])}\n`,
        "fixture.jsonl",
      );
      assert.ok(
        duplicate.errors.some((error) =>
          error.includes("duplicate englishName"),
        ),
      );

      const invalid = readRulebookPublicationJsonlText(
        JSON.stringify({
          schemaVersion: 1,
          source: "chm-publications",
          englishName: "Spell Compendium",
          reviewStatus: "review",
        }),
        "fixture.jsonl",
      );
      assert.ok(
        invalid.errors.some((error) =>
          error.includes("displayAbbr is required"),
        ),
      );
      assert.ok(
        invalid.errors.some((error) =>
          error.includes("reviewStatus must be accepted"),
        ),
      );
    },
  },
  {
    name: "structured spell patch schema catches portable JSONL errors",
    run: () => {
      const parseErrors: string[] = [];
      const parsed = parsePatchJsonlText(
        "{}\n[]\n{\"op\":\"deleteSpell\"}\nnot-json",
        parseErrors,
      );
      assert.equal(parsed.length, 0);
      assert.ok(parseErrors.some((error) => error.includes("unsupported operation")));
      assert.ok(parseErrors.some((error) => error.includes("must be a JSON object")));
      assert.ok(parseErrors.some((error) => error.includes("invalid JSON")));

      const shapeErrors: string[] = [];
      validateInsertSpellShape(
        {
          op: "insertSpell",
          id: 1,
          source: { rulebook: "SC" },
          spell: {
            name: "Fixture Spell",
            slug: "Fixture Spell",
            school: "Evocation",
            description: "Text",
            descriptionHtml: "<p>Text</p>",
          },
          levels: { classes: [{ class: "Wizard", level: 10 }] },
        },
        1,
        shapeErrors,
      );
      assert.ok(shapeErrors.some((error) => error.includes("slug is not normalized")));

      validateLevelShape(
        { class: "Wizard", level: 10 },
        1,
        "levels.classes",
        0,
        shapeErrors,
      );
      assert.ok(shapeErrors.some((error) => error.includes("level must be 0..9")));

      const okErrors: string[] = [];
      const ok = validateInsertSpellShape(
        {
          op: "insertSpell",
          id: 2,
          source: { rulebook: "SC" },
          spell: {
            name: "Fixture Spell",
            slug: "fixture-spell",
            school: "Evocation",
            description: "Text",
            descriptionHtml: "<p>Text</p>",
          },
          levels: { classes: [{ class: "Wizard", level: 1 }] },
        },
        1,
        okErrors,
      );
      assert.deepEqual(okErrors, []);
      assert.equal(ok.name, "Fixture Spell");
      assert.equal(ok.classLevels[0]?.level, 1);
    },
  },
];

function collectJsonlFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(entryPath);
    }
  }
  return files;
}

function toRepoPath(repoRoot: string, filePath: string) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function isSameOrChild(root: string, candidate: string) {
  return candidate === root || candidate.startsWith(`${root}/`);
}

for (const test of tests) {
  test.run();
  console.log(`ok - ${test.name}`);
}

console.log(`Portable data-tools tests OK (${tests.length})`);
