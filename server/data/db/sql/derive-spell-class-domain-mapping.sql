BEGIN;

DELETE FROM idx_spell_class_level;
INSERT INTO idx_spell_class_level (spell_id, class_id, level, rulebook_id, edition_id, extra)
SELECT scl.spell_id, scl.character_class_id, scl.level, s.rulebook_id, rb.dnd_edition_id, COALESCE(scl.extra,'')
FROM dnd_spellclasslevel scl
JOIN dnd_spell s ON s.id = scl.spell_id
JOIN dnd_rulebook rb ON rb.id = s.rulebook_id;

DELETE FROM idx_spell_domain_level;
INSERT INTO idx_spell_domain_level (spell_id, domain_id, level, rulebook_id, edition_id, extra)
SELECT sdl.spell_id, sdl.domain_id, sdl.level, s.rulebook_id, rb.dnd_edition_id, COALESCE(sdl.extra,'')
FROM dnd_spelldomainlevel sdl
JOIN dnd_spell s ON s.id = sdl.spell_id
JOIN dnd_rulebook rb ON rb.id = s.rulebook_id;

COMMIT;
