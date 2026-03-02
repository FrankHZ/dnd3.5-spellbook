import type { SpellCasting } from "@dnd/contracts";
import { useTranslation } from "react-i18next";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-5">
        {value && value.trim() ? value : "—"}
      </div>
    </div>
  );
}

export function MechanicsSection({ casting }: { casting: SpellCasting }) {
  const { t } = useTranslation("spell-detail");

  return (
    <section className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("Mechanics")}
      </div>
      <div className="grid gap-2.5">
        <Field label={t("Casting Time")} value={casting.castingTime} />
        <Field label={t("Range")} value={casting.range} />

        <Field label={t("Target")} value={casting.target} />
        <Field label={t("Effect")} value={casting.effect} />

        <Field label={t("Area")} value={casting.area} />
        <Field label={t("Duration")} value={casting.duration} />

        <Field label={t("Saving Throw")} value={casting.savingThrow} />
        <Field label={t("Spell Resistance")} value={casting.spellResistance} />
      </div>
    </section>
  );
}
