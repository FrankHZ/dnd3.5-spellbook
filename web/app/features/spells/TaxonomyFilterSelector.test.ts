import { describe, expect, it } from "vitest";
import type { Rulebook, SpellFilterVocabularyItem } from "@dnd/contracts";

import {
  isManeuverTaxonomyItem,
  isTomeOfBattleRulebook,
  selectedRulebooksIncludeTomeOfBattle,
} from "./TaxonomyFilterSelector";

const edition = {
  id: 5,
  name: "D&D 3.5",
  system: "dnd",
  slug: "supplementals-35",
  core: false,
};

function rulebook(overrides: Partial<Rulebook>): Rulebook {
  return {
    id: 1,
    abbr: "PH",
    name: "Player's Handbook",
    slug: "players-handbook",
    edition,
    ...overrides,
  };
}

describe("taxonomy filter visibility helpers", () => {
  it("detects Tome of Battle rulebooks by stable source identity", () => {
    expect(
      isTomeOfBattleRulebook(
        rulebook({
          id: 88,
          abbr: "ToB",
          name: "Tome of Battle: The Book of Nine Swords",
          slug: "tome-of-battle-the-book-of-nine-swords",
        }),
      ),
    ).toBe(true);
    expect(isTomeOfBattleRulebook(rulebook({}))).toBe(false);
  });

  it("requires an explicit selected Tome of Battle rulebook", () => {
    const rulebooks = [
      rulebook({ id: 4 }),
      rulebook({
        id: 88,
        abbr: "ToB",
        name: "Tome of Battle: The Book of Nine Swords",
        slug: "tome-of-battle-the-book-of-nine-swords",
      }),
    ];

    expect(selectedRulebooksIncludeTomeOfBattle(rulebooks, [])).toBe(false);
    expect(selectedRulebooksIncludeTomeOfBattle(rulebooks, [4])).toBe(false);
    expect(selectedRulebooksIncludeTomeOfBattle(rulebooks, [4, 88])).toBe(true);
  });

  it("identifies maneuver taxonomy separately from spell taxonomy", () => {
    const spellSchool: SpellFilterVocabularyItem = {
      id: 1,
      key: "abjuration",
      name: "Abjuration",
      sourceKind: "spell",
      category: "spell_school",
    };
    const maneuverDiscipline: SpellFilterVocabularyItem = {
      id: 20,
      key: "diamond-mind",
      name: "Diamond Mind",
      sourceKind: "maneuver",
      category: "maneuver_discipline",
    };

    expect(isManeuverTaxonomyItem(spellSchool)).toBe(false);
    expect(isManeuverTaxonomyItem(maneuverDiscipline)).toBe(true);
  });
});
