-- Derived mapping: spell ↔ class ↔ level with scope columns
CREATE TABLE IF NOT EXISTS idx_spell_class_level (
  spell_id   INTEGER NOT NULL,
  class_id   INTEGER NOT NULL,
  level      INTEGER NOT NULL,
  rulebook_id INTEGER NOT NULL,
  edition_id INTEGER NOT NULL,
  extra      TEXT NOT NULL DEFAULT '',

  -- Deterministic uniqueness per legacy rows
  PRIMARY KEY (spell_id, class_id, level, rulebook_id, extra)
) WITHOUT ROWID;

-- Query accelerators
CREATE INDEX IF NOT EXISTS idx_scl_rulebook_class_level
  ON idx_spell_class_level (rulebook_id, class_id, level);

CREATE INDEX IF NOT EXISTS idx_scl_edition_class_level
  ON idx_spell_class_level (edition_id, class_id, level);

CREATE INDEX IF NOT EXISTS idx_scl_class_rulebook
  ON idx_spell_class_level (class_id, rulebook_id);

CREATE INDEX IF NOT EXISTS idx_scl_spell
  ON idx_spell_class_level (spell_id);
