import type { SpellCasting } from "@dnd/contracts";
import { useTranslation } from "react-i18next";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value && value.trim() ? value : "—"}</div>
    </div>
  );
}

export function MechanicsSection({ casting }: { casting: SpellCasting }) {
  const { t } = useTranslation("spell-mechanics");
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Casting Time")} value={casting.castingTime} />
        <Field label={t("Range")} value={casting.range} />

        <Field label={t("Target")} value={casting.target} />
        <Field label={t("Effect")} value={casting.effect} />

        <Field label={t("Area")} value={casting.area} />
        <Field label={t("Duration")} value={casting.duration} />

        <Field label={t("Saving Throw")} value={casting.savingThrow} />
        <Field label={t("Spell Resistance")} value={casting.spellResistance} />
      </div>
    </div>
  );
}
