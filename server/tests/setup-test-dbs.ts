import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
  loadPortableFixtureFile,
  serverDbFixturePath,
} from "./support/portable-fixtures";

// Public-safe, synthetic SQLite fixtures for API tests. Keep these minimal and
// expand them only when a server test needs a new schema shape or seed row.
const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "spellbook-api-test-"),
);
const rulesDbPath = path.join(fixtureRoot, "rules-test.sqlite");
const contentDbPath = path.join(fixtureRoot, "content-test.sqlite");
const appStateDbPath = path.join(fixtureRoot, "app-state-test.sqlite");

process.env.RULES_DATABASE_URL = `file:${rulesDbPath.replace(/\\/g, "/")}`;
process.env.CONTENT_DATABASE_URL = `file:${contentDbPath.replace(/\\/g, "/")}`;
process.env.APP_STATE_DATABASE_URL = `file:${appStateDbPath.replace(/\\/g, "/")}`;
process.env.SPELL_READ_SOURCE = "rules";

function execMany(db: Database.Database, statements: string[]) {
  for (const statement of statements) {
    db.exec(statement);
  }
}

function removeFixtureRoot() {
  try {
    fs.rmSync(fixtureRoot, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (error) {
    const code =
      error instanceof Error && "code" in error ? error.code : undefined;
    if (process.platform === "win32" && (code === "EPERM" || code === "EBUSY")) {
      console.warn(`Skipped locked test fixture cleanup: ${fixtureRoot}`);
      return;
    }
    throw error;
  }
}

function seedRulesDb() {
  const db = new Database(rulesDbPath);
  execMany(db, [
    `
      CREATE TABLE dnd_dndedition (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        system TEXT NOT NULL,
        slug TEXT NOT NULL,
        core INTEGER NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_rulebook (
        id INTEGER PRIMARY KEY,
        dnd_edition_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        abbr TEXT NOT NULL,
        description TEXT NOT NULL,
        year TEXT,
        official_url TEXT NOT NULL,
        slug TEXT NOT NULL,
        image TEXT,
        published TEXT
      )
    `,
    `
      CREATE TABLE dnd_characterclass (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        prestige INTEGER NOT NULL DEFAULT 0,
        short_description TEXT NOT NULL,
        short_description_html TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_domain (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_spellschool (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_spellsubschool (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_spelldescriptor (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_spell (
        id INTEGER PRIMARY KEY,
        added TEXT NOT NULL,
        rulebook_id INTEGER NOT NULL,
        page INTEGER,
        name TEXT NOT NULL,
        school_id INTEGER NOT NULL,
        sub_school_id INTEGER,
        verbal_component INTEGER NOT NULL DEFAULT 0,
        somatic_component INTEGER NOT NULL DEFAULT 0,
        material_component INTEGER NOT NULL DEFAULT 0,
        arcane_focus_component INTEGER NOT NULL DEFAULT 0,
        divine_focus_component INTEGER NOT NULL DEFAULT 0,
        xp_component INTEGER NOT NULL DEFAULT 0,
        casting_time TEXT,
        range TEXT,
        target TEXT,
        effect TEXT,
        area TEXT,
        duration TEXT,
        saving_throw TEXT,
        spell_resistance TEXT,
        description TEXT NOT NULL,
        slug TEXT NOT NULL,
        meta_breath_component INTEGER NOT NULL DEFAULT 0,
        true_name_component INTEGER NOT NULL DEFAULT 0,
        extra_components TEXT,
        description_html TEXT NOT NULL,
        corrupt_component INTEGER NOT NULL DEFAULT 0,
        corrupt_level INTEGER,
        verified INTEGER NOT NULL DEFAULT 0,
        verified_author_id INTEGER,
        verified_time TEXT
      )
    `,
    `
      CREATE TABLE dnd_spell_descriptors (
        id INTEGER PRIMARY KEY,
        spell_id INTEGER NOT NULL,
        spelldescriptor_id INTEGER NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_spellclasslevel (
        id INTEGER PRIMARY KEY,
        character_class_id INTEGER NOT NULL,
        spell_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        extra TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE dnd_spelldomainlevel (
        id INTEGER PRIMARY KEY,
        domain_id INTEGER NOT NULL,
        spell_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        extra TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE idx_spell_class_level (
        spell_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        rulebook_id INTEGER NOT NULL,
        edition_id INTEGER NOT NULL,
        extra TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (spell_id, class_id, level, rulebook_id, extra)
      )
    `,
    `
      CREATE TABLE idx_spell_domain_level (
        spell_id INTEGER NOT NULL,
        domain_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        rulebook_id INTEGER NOT NULL,
        edition_id INTEGER NOT NULL,
        extra TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (spell_id, domain_id, level, rulebook_id, extra)
      )
    `,
  ]);

  loadPortableFixtureFile(
    db,
    serverDbFixturePath("rules-clean", "base-lookups.jsonl"),
  );
  loadPortableFixtureFile(
    db,
    serverDbFixturePath("rules-clean", "rulebooks.jsonl"),
  );
  loadPortableFixtureFile(
    db,
    serverDbFixturePath("rules-clean", "spell-runtime.jsonl"),
  );

  db.close();
}

function seedContentDb() {
  const db = new Database(contentDbPath);
  execMany(db, [
    `
      CREATE TABLE RulesContentBuild (
        id TEXT PRIMARY KEY,
        sourceKind TEXT NOT NULL DEFAULT 'rules-clean',
        sourceSha256 TEXT,
        generatorVersion TEXT NOT NULL,
        generatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        spellCount INTEGER NOT NULL,
        issueCount INTEGER NOT NULL,
        parentRepoCommit TEXT,
        dataRepoCommit TEXT,
        rulesManifestSha256 TEXT,
        rulesDbSha256 TEXT,
        migrationSetSha256 TEXT,
        buildMetaJson TEXT
      )
    `,
    `
      CREATE TABLE I18nSpellText (
        id TEXT PRIMARY KEY,
        spellId INTEGER NOT NULL,
        rulebookId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        descriptionHtml TEXT,
        descriptionText TEXT,
        sourceKey TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (spellId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nSpellSummaryText (
        id TEXT PRIMARY KEY,
        spellId INTEGER NOT NULL,
        rulebookId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        summaryText TEXT NOT NULL,
        sourceKey TEXT,
        sourceName TEXT,
        sourceKind TEXT,
        reviewStatus TEXT NOT NULL DEFAULT 'accepted',
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (spellId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nCharacterClassText (
        id TEXT PRIMARY KEY,
        classId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        shortDescriptionText TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (classId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nDomainText (
        id TEXT PRIMARY KEY,
        domainId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (domainId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nRulebookText (
        id TEXT PRIMARY KEY,
        rulebookId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        descriptionText TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (rulebookId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nSpellSchoolText (
        id TEXT PRIMARY KEY,
        schoolId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (schoolId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nSpellSubschoolText (
        id TEXT PRIMARY KEY,
        subschoolId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (subschoolId, lang, variant)
      )
    `,
    `
      CREATE TABLE I18nDescriptorText (
        id TEXT PRIMARY KEY,
        descriptorId INTEGER NOT NULL,
        lang TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'default',
        name TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (descriptorId, lang, variant)
      )
    `,
    `
      CREATE TABLE RulebookContent (
        id TEXT PRIMARY KEY,
        legacyRulebookId INTEGER NOT NULL UNIQUE,
        editionId INTEGER NOT NULL,
        name TEXT NOT NULL,
        abbr TEXT NOT NULL,
        slug TEXT NOT NULL,
        displayName TEXT,
        displayAbbr TEXT,
        publicationCategory TEXT NOT NULL DEFAULT 'other',
        publicationFamily TEXT NOT NULL DEFAULT 'other',
        publicationSourceKind TEXT NOT NULL DEFAULT 'rulebook',
        publicationDisplayOrder INTEGER NOT NULL DEFAULT 90000,
        publicationReviewStatus TEXT NOT NULL DEFAULT 'accepted',
        rawJson TEXT
      )
    `,
    `
      CREATE TABLE SpellContent (
        id TEXT PRIMARY KEY,
        legacySpellId INTEGER NOT NULL UNIQUE,
        canonicalName TEXT NOT NULL,
        slug TEXT NOT NULL,
        sourceRulebookId INTEGER NOT NULL,
        sourcePage INTEGER,
        schoolRaw TEXT,
        subschoolRaw TEXT,
        castingTimeRaw TEXT,
        rangeRaw TEXT,
        targetRaw TEXT,
        effectRaw TEXT,
        areaRaw TEXT,
        durationRaw TEXT,
        savingThrowRaw TEXT,
        resistanceRaw TEXT,
        componentsRaw TEXT,
        corruptLevel INTEGER,
        descriptionText TEXT NOT NULL,
        descriptionHtml TEXT,
        descriptionHash TEXT NOT NULL,
        addedAt DATETIME NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        verifiedAuthorId INTEGER,
        verifiedTime DATETIME,
        rawJson TEXT
      )
    `,
    `
      CREATE TABLE SpellTaxonomyFacet (
        id TEXT PRIMARY KEY,
        spellId TEXT NOT NULL,
        facetType TEXT NOT NULL,
        facetKey TEXT NOT NULL,
        legacyFacetId INTEGER,
        name TEXT NOT NULL,
        slug TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        rawText TEXT,
        sourceField TEXT NOT NULL,
        reviewStatus TEXT NOT NULL DEFAULT 'accepted',
        issueCode TEXT
      )
    `,
    `
      CREATE TABLE SpellListEntry (
        id TEXT PRIMARY KEY,
        spellId TEXT NOT NULL,
        listType TEXT NOT NULL,
        ownerLegacyId INTEGER NOT NULL,
        ownerName TEXT NOT NULL,
        ownerSlug TEXT NOT NULL,
        ownerPrestige BOOLEAN,
        level INTEGER NOT NULL,
        rulebookId INTEGER,
        rawExtra TEXT,
        variantLabel TEXT,
        note TEXT,
        sourceRowId INTEGER,
        sourceTable TEXT NOT NULL,
        reviewStatus TEXT NOT NULL DEFAULT 'accepted',
        issueCode TEXT
      )
    `,
    `
      CREATE TABLE SpellComponent (
        id TEXT PRIMARY KEY,
        spellId TEXT NOT NULL,
        componentType TEXT NOT NULL,
        present BOOLEAN NOT NULL,
        rawText TEXT,
        detailText TEXT,
        sourceField TEXT NOT NULL,
        reviewStatus TEXT NOT NULL DEFAULT 'accepted',
        issueCode TEXT
      )
    `,
    `
      CREATE TABLE SpellMechanicFacet (
        id TEXT PRIMARY KEY,
        spellId TEXT NOT NULL,
        mechanicType TEXT NOT NULL,
        rawText TEXT,
        category TEXT NOT NULL,
        amount INTEGER,
        unit TEXT,
        flagsJson TEXT,
        sourceField TEXT NOT NULL,
        reviewStatus TEXT NOT NULL DEFAULT 'accepted',
        issueCode TEXT
      )
    `,
    `
      CREATE TABLE RulesContentIssue (
        id TEXT PRIMARY KEY,
        spellId TEXT,
        sourceTable TEXT NOT NULL,
        sourceField TEXT NOT NULL,
        rawText TEXT,
        issueCode TEXT NOT NULL,
        severity TEXT NOT NULL,
        detail TEXT
      )
    `,
  ]);

  loadPortableFixtureFile(
    db,
    serverDbFixturePath("content", "rules-content-builds.jsonl"),
  );

  loadPortableFixtureFile(
    db,
    serverDbFixturePath("content", "i18n-spell-overlays.jsonl"),
  );
  loadPortableFixtureFile(
    db,
    serverDbFixturePath("content", "i18n-rulebooks.jsonl"),
  );
  loadPortableFixtureFile(
    db,
    serverDbFixturePath("content", "normalized-rules-spells.jsonl"),
  );

  db.close();
}

seedRulesDb();
seedContentDb();

afterAll(async () => {
  const [{ rulesPrisma }, { contentPrisma }] = await Promise.all([
    import("#server/lib/rules-prisma-client"),
    import("#server/lib/content-prisma-client"),
  ]);
  await Promise.all([rulesPrisma.$disconnect(), contentPrisma.$disconnect()]);
  removeFixtureRoot();
});
