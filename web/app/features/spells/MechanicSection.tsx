import type { SpellCasting } from "@dnd/contracts";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value && value.trim() ? value : "—"}</div>
    </div>
  );
}

export function MechanicsSection({ casting }: { casting: SpellCasting }) {
  return (
    <div className="space-y-2">
      <div className="font-medium">Mechanics</div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Casting Time" value={casting.castingTime} />
        <Field label="Range" value={casting.range} />

        <Field label="Target" value={casting.target} />
        <Field label="Effect" value={casting.effect} />

        <Field label="Area" value={casting.area} />
        <Field label="Duration" value={casting.duration} />

        <Field label="Saving Throw" value={casting.savingThrow} />
        <Field label="Spell Resistance" value={casting.spellResistance} />
      </div>
    </div>
  );
}
