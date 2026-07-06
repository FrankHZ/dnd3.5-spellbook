import type { SpellFilterVocabularyResponse } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import {
  buildMechanicFilterGroupStates,
  countMechanicFilterGroupStates,
} from "./mechanic-filter-model";

const mechanics = {
  castingTimes: {
    queryParam: "castingTimeKeys",
    mode: "any",
    buckets: [
      { key: "minute", label: "Minute", sortOrder: 2 },
      { key: "standard_action", label: "Standard action", sortOrder: 1 },
    ],
  },
  ranges: {
    queryParam: "rangeKeys",
    mode: "any",
    buckets: [{ key: "close", label: "Close", sortOrder: 1 }],
  },
  durations: {
    queryParam: "durationKeys",
    mode: "any",
    buckets: [{ key: "timed", label: "Timed", sortOrder: 1 }],
  },
  savingThrows: {
    queryParam: "savingThrowKeys",
    mode: "any",
    buckets: [{ key: "none", label: "None", sortOrder: 1 }],
  },
  spellResistances: {
    queryParam: "spellResistanceKeys",
    mode: "any",
    buckets: [{ key: "yes", label: "Yes", sortOrder: 1 }],
  },
} satisfies SpellFilterVocabularyResponse["mechanics"];

describe("buildMechanicFilterGroupStates", () => {
  it("keeps server vocabulary grouped while normalizing selected keys", () => {
    const groups = buildMechanicFilterGroupStates(mechanics, {
      castingTimeKeys: ["minute", "standard_action", "bad" as any],
      rangeKeys: ["close"],
      durationKeys: [],
      savingThrowKeys: [],
      spellResistanceKeys: ["yes"],
    });

    expect(groups.map((group) => group.valueKey)).toEqual([
      "castingTimeKeys",
      "rangeKeys",
      "durationKeys",
      "savingThrowKeys",
      "spellResistanceKeys",
    ]);
    expect(groups[0].buckets.map((bucket) => bucket.key)).toEqual([
      "standard_action",
      "minute",
    ]);
    expect(groups[0].selectedKeys).toEqual(["standard_action", "minute"]);
    expect(countMechanicFilterGroupStates(groups)).toBe(4);
  });
});
