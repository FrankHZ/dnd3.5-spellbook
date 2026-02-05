-- v2.0 rules_clean.sqlite patch
-- Purpose: normalize/correct legacy text/encoding issues discovered during v2.0 import work.
-- Scope: data-only updates (no schema changes).
-- Target DB: rules_clean.sqlite (SQLite)

BEGIN IMMEDIATE TRANSACTION;

-- =========================
-- A) Spell name corrections
-- =========================
-- Notes:
-- - We only patch the "name" field to the canonical strings listed in v2.0 notes.
-- - IDs are preserved.
-- - We intentionally do NOT touch slug/description/etc. unless you later confirm they were also corrupted.

UPDATE dnd_spell SET name = 'Detect Aberration'            WHERE id = 4912;
UPDATE dnd_spell SET name = 'Desiccate'                    WHERE id = 3164;
UPDATE dnd_spell SET name = 'Hero''s Blade'                WHERE id = 4887;
UPDATE dnd_spell SET name = 'Ironguard, Lesser'            WHERE id = 3926;
UPDATE dnd_spell SET name = 'Protege'                      WHERE id = 429;
UPDATE dnd_spell SET name = 'Protege'                      WHERE id = 4664;
UPDATE dnd_spell SET name = 'Solipsism'                    WHERE id = 4190;
UPDATE dnd_spell SET name = 'Vecna''s Malevolent Whisper'  WHERE id = 815;

-- ==================================
-- B) Rulebook name corrections
-- ==================================
-- These were specifically noted as having encoding issues.
-- Keep the exact unicode characters (e.g., "û") as intended.

UPDATE dnd_rulebook SET name = 'Monster Compendium: Monsters of Faerûn' WHERE id = 21;
UPDATE dnd_rulebook SET name = 'Player''s Guide to Faerûn'              WHERE id = 22;

COMMIT;

-- =========================
-- C) Verification helpers
-- =========================
-- Run these after applying the patch to confirm the values.

-- Spells (post-patch)
SELECT id, name
FROM dnd_spell
WHERE id IN (4912, 3164, 4887, 3926, 429, 4664, 4190, 815)
ORDER BY id;

-- Rulebooks (post-patch)
SELECT id, name
FROM dnd_rulebook
WHERE id IN (21, 22)
ORDER BY id;

