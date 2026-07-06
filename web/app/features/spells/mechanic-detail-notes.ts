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
  return {
    duration: [
      mechanics?.duration?.dismissible ? "dismissible" : null,
      mechanics?.duration?.discharge ? "discharge" : null,
    ].filter((key): key is MechanicDetailNoteKey => key !== null),
    savingThrow: [
      mechanics?.savingThrow?.partial ? "partial" : null,
      mechanics?.savingThrow?.negates ? "negates" : null,
      mechanics?.savingThrow?.harmless ? "harmless" : null,
      mechanics?.savingThrow?.object ? "object" : null,
    ].filter((key): key is MechanicDetailNoteKey => key !== null),
    spellResistance: [
      mechanics?.spellResistance?.harmless ? "harmless" : null,
      mechanics?.spellResistance?.object ? "object" : null,
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
