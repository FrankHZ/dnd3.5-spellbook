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
import { readSummaryJsonlText } from "../short-desc/summary-row-schema";
import { mapBookLabelToAbbr, normalizeBookLabel } from "../zh-parser/mapping";
import {
  auditNormalizedContent,
  normalizeRulesContent,
  type LegacyRulesContentInput,
} from "../rules-content/normalize";
import { auditRulebookLabels } from "../rulebooks/labels-audit";

type TestCase = {
  name: string;
  run: () => void;
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
        ],
        descriptors: [
          { spellId: 10, descriptorId: 3, name: "Fire", slug: "fire" },
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
      assert.equal(normalized.counts.spells, 1);
      assert.equal(normalized.spells[0]?.descriptionText, "Fixture rules text.");
      assert.equal(normalized.spells[0]?.verified, true);
      assert.equal(normalized.taxonomyFacets.length, 2);
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
        spellCompendium?.issues.includes("known-common-abbr-mismatch"),
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

for (const test of tests) {
  test.run();
  console.log(`ok - ${test.name}`);
}

console.log(`Portable data-tools tests OK (${tests.length})`);
