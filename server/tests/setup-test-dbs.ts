import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

// Public-safe, synthetic SQLite fixtures for API tests. Keep these minimal and
// expand them only when a server test needs a new schema shape or seed row.
const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "spellbook-api-test-"),
);
const rulesDbPath = path.join(fixtureRoot, "rules-test.sqlite");
const appDbPath = path.join(fixtureRoot, "app-test.sqlite");

process.env.RULES_DATABASE_URL = `file:${rulesDbPath.replace(/\\/g, "/")}`;
process.env.APP_DATABASE_URL = `file:${appDbPath.replace(/\\/g, "/")}`;

function execMany(db: Database.Database, statements: string[]) {
  for (const statement of statements) {
    db.exec(statement);
  }
}

function htmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function insertSpell(
  db: Database.Database,
  input: {
    id: number;
    name: string;
    slug: string;
    rulebookId: number;
    schoolId?: number;
    subSchoolId?: number | null;
    description?: string;
  },
) {
  db.prepare(
    `
      INSERT INTO dnd_spell (
        id, added, rulebook_id, page, name, school_id, sub_school_id,
        verbal_component, somatic_component, material_component,
        arcane_focus_component, divine_focus_component, xp_component,
        casting_time, range, target, effect, area, duration,
        saving_throw, spell_resistance, description, slug,
        meta_breath_component, true_name_component, extra_components,
        description_html, corrupt_component, corrupt_level,
        verified, verified_author_id, verified_time
      )
      VALUES (
        @id, '2020-01-01T00:00:00.000Z', @rulebookId, 1, @name,
        @schoolId, @subSchoolId,
        1, 1, 0, 0, 0, 0,
        '1 standard action', 'Medium', 'One creature', NULL, NULL,
        'Instantaneous', 'None', 'Yes', @description, @slug,
        0, 0, NULL, @descriptionHtml, 0, NULL, 1, NULL, NULL
      )
    `,
  ).run({
    ...input,
    schoolId: input.schoolId ?? 1,
    subSchoolId: input.subSchoolId ?? null,
    description: input.description ?? `${input.name} description.`,
    descriptionHtml: `<p>${htmlText(input.description ?? `${input.name} description.`)}</p>`,
  });
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

  db.prepare(
    "INSERT INTO dnd_dndedition (id, name, system, slug, core) VALUES (1, 'D&D 3.5 Core', 'DnD 3.5', 'core-35', 1)",
  ).run();
  const insertRulebook = db.prepare(
    `INSERT INTO dnd_rulebook
      (id, dnd_edition_id, name, abbr, description, year, official_url, slug, image, published)
      VALUES (?, 1, ?, ?, '', NULL, '', ?, NULL, NULL)`,
  );
  insertRulebook.run(4, "Player's Handbook", "PH", "players-handbook");
  insertRulebook.run(6, "Spell Compendium", "SC", "spell-compendium");
  insertRulebook.run(56, "Complete Adventurer", "CAd", "complete-adventurer");
  insertRulebook.run(86, "Complete Divine", "CD", "complete-divine");

  db.prepare(
    "INSERT INTO dnd_characterclass (id, name, slug, prestige, short_description, short_description_html) VALUES (1, 'Wizard', 'wizard', 0, '', '')",
  ).run();
  db.prepare(
    "INSERT INTO dnd_domain (id, name, slug) VALUES (1, 'Magic', 'magic')",
  ).run();
  db.prepare(
    "INSERT INTO dnd_spellschool (id, name, slug) VALUES (1, 'Evocation', 'evocation')",
  ).run();
  db.prepare(
    "INSERT INTO dnd_spellsubschool (id, name, slug) VALUES (1, 'Calling', 'calling')",
  ).run();
  db.prepare(
    "INSERT INTO dnd_spelldescriptor (id, name, slug) VALUES (1, 'Fire', 'fire')",
  ).run();

  insertSpell(db, {
    id: 1,
    name: "Acid Arrow",
    slug: "acid-arrow",
    rulebookId: 4,
  });
  insertSpell(db, {
    id: 2,
    name: "Burning Hands",
    slug: "burning-hands",
    rulebookId: 4,
  });
  insertSpell(db, {
    id: 100,
    name: "Fireball",
    slug: "fireball",
    rulebookId: 6,
  });
  insertSpell(db, {
    id: 101,
    name: "Magic Missile",
    slug: "magic-missile",
    rulebookId: 4,
  });
  insertSpell(db, {
    id: 887,
    name: "Unicorn Heart",
    slug: "unicorn-heart",
    rulebookId: 6,
  });
  insertSpell(db, {
    id: 2441,
    name: "Summon Monster I",
    slug: "summon-monster-i",
    rulebookId: 6,
    subSchoolId: 1,
  });
  insertSpell(db, {
    id: 3000,
    name: "Last Breath",
    slug: "last-breath",
    rulebookId: 6,
  });
  insertSpell(db, {
    id: 3001,
    name: "Last Breath",
    slug: "last-breath-cad",
    rulebookId: 56,
  });

  const descriptor = db.prepare(
    "INSERT INTO dnd_spell_descriptors (id, spell_id, spelldescriptor_id) VALUES (?, ?, 1)",
  );
  descriptor.run(1, 2);
  descriptor.run(2, 100);

  const classLevel = db.prepare(
    "INSERT INTO dnd_spellclasslevel (id, character_class_id, spell_id, level, extra) VALUES (?, 1, ?, ?, '')",
  );
  const classIndex = db.prepare(
    "INSERT INTO idx_spell_class_level (spell_id, class_id, level, rulebook_id, edition_id, extra) VALUES (?, 1, ?, ?, 1, '')",
  );
  [
    [1, 1, 3, 4],
    [2, 2, 3, 4],
    [3, 100, 3, 6],
    [4, 101, 1, 4],
    [5, 887, 3, 6],
    [6, 2441, 1, 6],
    [7, 3000, 4, 6],
    [8, 3001, 4, 56],
  ].forEach(([id, spellId, level, rulebookId]) => {
    classLevel.run(id, spellId, level);
    classIndex.run(spellId, level, rulebookId);
  });

  db.prepare(
    "INSERT INTO dnd_spelldomainlevel (id, domain_id, spell_id, level, extra) VALUES (1, 1, 101, 1, '')",
  ).run();
  db.prepare(
    "INSERT INTO idx_spell_domain_level (spell_id, domain_id, level, rulebook_id, edition_id, extra) VALUES (101, 1, 1, 4, 1, '')",
  ).run();

  db.close();
}

function seedAppDb() {
  const db = new Database(appDbPath);
  execMany(db, [
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
  ]);

  const insertSpellText = db.prepare(
    `INSERT INTO I18nSpellText
      (id, spellId, rulebookId, lang, variant, name, descriptionHtml, descriptionText, sourceKey)
      VALUES (?, ?, ?, 'zh', 'chm', ?, ?, ?, ?)`,
  );
  insertSpellText.run(
    "spell-1-zh",
    1,
    4,
    "强酸箭",
    "<p>强酸箭描述。</p>",
    "强酸箭描述。",
    "fixture:spell-1",
  );
  insertSpellText.run(
    "spell-887-zh",
    887,
    6,
    "独角兽之心",
    "<p>独角兽之心描述。</p>",
    "独角兽之心描述。",
    "fixture:spell-887",
  );
  insertSpellText.run(
    "spell-100-zh",
    100,
    6,
    "火球术",
    "<p>火球术描述。</p>",
    "火球术描述。",
    "fixture:spell-100",
  );

  const insertSummary = db.prepare(
    `INSERT INTO I18nSpellSummaryText
      (id, spellId, rulebookId, lang, variant, summaryText, sourceKey, sourceName, sourceKind, reviewStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted')`,
  );
  insertSummary.run(
    "summary-2441-en",
    2441,
    6,
    "en",
    "imarvin",
    "Calls extraplanar creature to fight for you.",
    "fixture:summary-2441-en",
    "fixture",
    "spell",
  );
  insertSummary.run(
    "summary-887-zh",
    887,
    6,
    "zh",
    "chm",
    "获得60尺速度,+4基于力量,敏捷,体质的检定；可使用一次次元门。",
    "fixture:summary-887-zh",
    "fixture",
    "spell",
  );

  db.prepare(
    "INSERT INTO I18nCharacterClassText (id, classId, lang, variant, name) VALUES ('class-1-zh', 1, 'zh', 'default', '法师')",
  ).run();
  db.prepare(
    "INSERT INTO I18nDomainText (id, domainId, lang, variant, name) VALUES ('domain-1-zh', 1, 'zh', 'default', '魔法领域')",
  ).run();
  db.prepare(
    "INSERT INTO I18nRulebookText (id, rulebookId, lang, variant, name) VALUES ('rulebook-6-zh', 6, 'zh', 'default', '法术大全')",
  ).run();
  db.prepare(
    "INSERT INTO I18nSpellSchoolText (id, schoolId, lang, variant, name) VALUES ('school-1-zh', 1, 'zh', 'default', '塑能')",
  ).run();
  db.prepare(
    "INSERT INTO I18nSpellSubschoolText (id, subschoolId, lang, variant, name) VALUES ('subschool-1-zh', 1, 'zh', 'default', '呼唤')",
  ).run();
  db.prepare(
    "INSERT INTO I18nDescriptorText (id, descriptorId, lang, variant, name) VALUES ('descriptor-1-zh', 1, 'zh', 'default', '火')",
  ).run();

  db.close();
}

seedRulesDb();
seedAppDb();

afterAll(async () => {
  const [{ rulesPrisma }, { appPrisma }] = await Promise.all([
    import("~/lib/rules-prisma-client"),
    import("~/lib/app-prisma-client"),
  ]);
  await Promise.all([rulesPrisma.$disconnect(), appPrisma.$disconnect()]);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});
