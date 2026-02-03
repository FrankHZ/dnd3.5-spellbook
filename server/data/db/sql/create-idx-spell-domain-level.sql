-- Derived mapping: spell ↔ domain ↔ level with scope columns
CREATE TABLE IF NOT EXISTS idx_spell_domain_level (
  spell_id   INTEGER NOT NULL,
  domain_id  INTEGER NOT NULL,
  level      INTEGER NOT NULL,
  rulebook_id INTEGER NOT NULL,
  edition_id INTEGER NOT NULL,
  extra      TEXT NOT NULL DEFAULT '',

  PRIMARY KEY (spell_id, domain_id, level, rulebook_id, extra)
) WITHOUT ROWID;

-- Query accelerators
CREATE INDEX IF NOT EXISTS idx_sdl_rulebook_domain_level
  ON idx_spell_domain_level (rulebook_id, domain_id, level);

CREATE INDEX IF NOT EXISTS idx_sdl_edition_domain_level
  ON idx_spell_domain_level (edition_id, domain_id, level);

CREATE INDEX IF NOT EXISTS idx_sdl_domain_rulebook
  ON idx_spell_domain_level (domain_id, rulebook_id);

CREATE INDEX IF NOT EXISTS idx_sdl_spell
  ON idx_spell_domain_level (spell_id);
