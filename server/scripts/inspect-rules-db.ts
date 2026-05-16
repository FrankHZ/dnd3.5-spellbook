import "dotenv/config";
import Database from "better-sqlite3";
import path from "node:path";

type SqliteTable = {
  name: string;
  type: "table" | "view";
  sql: string | null;
};

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: 0 | 1;
  dflt_value: string | null;
  pk: number;
};

type IndexInfo = {
  name: string;
  unique: 0 | 1;
  origin: string;
  partial: 0 | 1;
};

type IndexColumnInfo = {
  seqno: number;
  cid: number;
  name: string;
};

function usage() {
  console.log(`Usage:
  npm run -w server tool:inspect-rules
  npm run -w server tool:inspect-rules -- tables [filter]
  npm run -w server tool:inspect-rules -- schema <table>
  npm run -w server tool:inspect-rules -- sample <table> [limit]
  npm run -w server tool:inspect-rules -- counts
  npm run -w server tool:inspect-rules -- spell <id|slug|name>
`);
}

function rulesDbPath() {
  const raw = process.env.RULES_DATABASE_URL;
  if (!raw) throw new Error("RULES_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return path.resolve(raw.slice("file:".length));
}

function openDb() {
  return new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
}

function allTables(db: Database.Database): SqliteTable[] {
  return db
    .prepare(
      `
        SELECT name, type, sql
        FROM sqlite_master
        WHERE type IN ('table', 'view')
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `,
    )
    .all() as SqliteTable[];
}

function assertKnownTable(db: Database.Database, table: string) {
  const known = new Set(allTables(db).map((t) => t.name));
  if (!known.has(table)) {
    throw new Error(`Unknown table or view: ${table}`);
  }
}

function qident(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function printTableList(db: Database.Database, filter?: string) {
  const needle = filter?.toLowerCase();
  const tables = allTables(db).filter(
    (table) => !needle || table.name.toLowerCase().includes(needle),
  );
  for (const table of tables) console.log(`${table.type}\t${table.name}`);
  console.log(`\n${tables.length} shown / ${allTables(db).length} total`);
}

function printSchema(db: Database.Database, table: string) {
  assertKnownTable(db, table);
  const row = allTables(db).find((t) => t.name === table);
  console.log(`# ${table}`);
  if (row?.sql) console.log(`\n${row.sql};`);

  const columns = db
    .prepare(`PRAGMA table_info(${qident(table)})`)
    .all() as ColumnInfo[];

  console.log("\ncolumns:");
  for (const c of columns) {
    console.log(
      [
        c.name,
        c.type || "(none)",
        c.notnull ? "not null" : "nullable",
        c.pk ? `pk:${c.pk}` : "",
        c.dflt_value != null ? `default:${c.dflt_value}` : "",
      ]
        .filter(Boolean)
        .join("\t"),
    );
  }

  const indexes = db
    .prepare(`PRAGMA index_list(${qident(table)})`)
    .all() as IndexInfo[];

  console.log("\nindexes:");
  if (indexes.length === 0) console.log("(none)");
  for (const idx of indexes) {
    const cols = db
      .prepare(`PRAGMA index_info(${qident(idx.name)})`)
      .all() as IndexColumnInfo[];
    const colNames = cols.map((c) => c.name).join(", ");
    console.log(
      `${idx.name}\t${idx.unique ? "unique" : "non-unique"}\t${colNames}`,
    );
  }
}

function printSample(db: Database.Database, table: string, rawLimit?: string) {
  assertKnownTable(db, table);
  const limit = Math.min(Math.max(Number(rawLimit ?? 5) || 5, 1), 50);
  const rows = db
    .prepare(`SELECT * FROM ${qident(table)} LIMIT ?`)
    .all(limit) as Record<string, unknown>[];
  console.log(JSON.stringify(rows, null, 2));
}

function printCounts(db: Database.Database) {
  const tableNames = [
    "dnd_spell",
    "dnd_spellclasslevel",
    "dnd_spelldomainlevel",
    "dnd_spell_descriptors",
    "idx_spell_class_level",
    "idx_spell_domain_level",
    "dnd_rulebook",
    "dnd_characterclass",
    "dnd_domain",
    "dnd_spellschool",
    "dnd_spellsubschool",
    "dnd_spelldescriptor",
  ];

  for (const table of tableNames) {
    assertKnownTable(db, table);
    const row = db
      .prepare(`SELECT COUNT(*) AS count FROM ${qident(table)}`)
      .get() as { count: number };
    console.log(`${table}\t${row.count}`);
  }
}

function printSpell(db: Database.Database, query: string) {
  const byId = Number.isInteger(Number(query));
  const spell = db
    .prepare(
      `
        SELECT s.*, rb.abbr AS rulebook_abbr, rb.name AS rulebook_name,
               school.name AS school_name, subschool.name AS subschool_name
        FROM dnd_spell s
        JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
        JOIN dnd_spellschool school ON school.id = s.school_id
        LEFT JOIN dnd_spellsubschool subschool ON subschool.id = s.sub_school_id
        WHERE ${byId ? "s.id = ?" : "LOWER(s.slug) = LOWER(?) OR LOWER(s.name) = LOWER(?)"}
        ORDER BY s.name, s.id
        LIMIT 10
      `,
    )
    .all(...(byId ? [Number(query)] : [query, query])) as Record<
    string,
    unknown
  >[];

  if (spell.length === 0) {
    console.log(`No spell found for: ${query}`);
    return;
  }

  for (const row of spell) {
    const id = row.id as number;
    const classLevels = db
      .prepare(
        `
          SELECT c.name AS className, scl.level, scl.extra
          FROM dnd_spellclasslevel scl
          JOIN dnd_characterclass c ON c.id = scl.character_class_id
          WHERE scl.spell_id = ?
          ORDER BY scl.level, c.name
        `,
      )
      .all(id);
    const domainLevels = db
      .prepare(
        `
          SELECT d.name AS domainName, sdl.level, sdl.extra
          FROM dnd_spelldomainlevel sdl
          JOIN dnd_domain d ON d.id = sdl.domain_id
          WHERE sdl.spell_id = ?
          ORDER BY sdl.level, d.name
        `,
      )
      .all(id);
    const descriptors = db
      .prepare(
        `
          SELECT d.name
          FROM dnd_spell_descriptors sd
          JOIN dnd_spelldescriptor d ON d.id = sd.spelldescriptor_id
          WHERE sd.spell_id = ?
          ORDER BY d.name
        `,
      )
      .all(id);

    console.log(
      JSON.stringify(
        {
          spell: row,
          classLevels,
          domainLevels,
          descriptors,
        },
        null,
        2,
      ),
    );
  }
}

function main() {
  const [cmd = "tables", arg1, arg2] = process.argv.slice(2);
  const db = openDb();

  try {
    if (cmd === "tables") return printTableList(db, arg1);
    if (cmd === "schema" && arg1) return printSchema(db, arg1);
    if (cmd === "sample" && arg1) return printSample(db, arg1, arg2);
    if (cmd === "counts") return printCounts(db);
    if (cmd === "spell" && arg1) return printSpell(db, arg1);
    usage();
    if (cmd !== "help" && cmd !== "--help" && cmd !== "-h")
      process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
