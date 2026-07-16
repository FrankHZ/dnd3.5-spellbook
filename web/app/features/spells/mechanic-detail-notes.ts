import type {
  SpellMechanicDetailMetadata,
  SpellCasting,
} from "@dnd/contracts";

export type MechanicDetailNoteKey =
  | "dismissible"
  | "discharge"
  | "partial"
  | "negates"
  | "harmless"
  | "object";

export type MechanicDetailNotes = {
  duration: MechanicDetailNoteKey[];
  savingThrow: MechanicDetailNoteKey[];
  spellResistance: MechanicDetailNoteKey[];
};

export function getMechanicDetailNotes(
  mechanics: SpellMechanicDetailMetadata | undefined,
): MechanicDetailNotes {
  const duration =
    mechanics?.duration?.displayCoverage === "complete"
      ? undefined
      : mechanics?.duration;
  const savingThrow =
    mechanics?.savingThrow?.displayCoverage === "complete"
      ? undefined
      : mechanics?.savingThrow;
  const spellResistance =
    mechanics?.spellResistance?.displayCoverage === "complete"
      ? undefined
      : mechanics?.spellResistance;

  return {
    duration: [
      duration?.dismissible ? "dismissible" : null,
      duration?.discharge ? "discharge" : null,
    ].filter((key): key is MechanicDetailNoteKey => key !== null),
    savingThrow: [
      savingThrow?.partial ? "partial" : null,
      savingThrow?.negates ? "negates" : null,
      savingThrow?.harmless ? "harmless" : null,
      savingThrow?.object ? "object" : null,
    ].filter((key): key is MechanicDetailNoteKey => key !== null),
    spellResistance: [
      spellResistance?.harmless ? "harmless" : null,
      spellResistance?.object ? "object" : null,
    ].filter((key): key is MechanicDetailNoteKey => key !== null),
  };
}

export function hasMechanicDetailNotes(casting: SpellCasting) {
  const notes = getMechanicDetailNotes(casting.mechanics);
  return (
    notes.duration.length > 0 ||
    notes.savingThrow.length > 0 ||
    notes.spellResistance.length > 0
  );
}
