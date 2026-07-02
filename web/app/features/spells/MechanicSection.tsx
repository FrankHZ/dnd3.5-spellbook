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
        {t("sections.mechanics")}
      </div>
      <div className="grid gap-2.5">
        <Field label={t("mechanics.casting-time")} value={casting.castingTime} />
        <Field label={t("mechanics.range")} value={casting.range} />

        <Field label={t("mechanics.target")} value={casting.target} />
        <Field label={t("mechanics.effect")} value={casting.effect} />

        <Field label={t("mechanics.area")} value={casting.area} />
        <Field label={t("mechanics.duration")} value={casting.duration} />

        <Field label={t("mechanics.saving-throw")} value={casting.savingThrow} />
        <Field label={t("mechanics.spell-resistance")} value={casting.spellResistance} />
      </div>
    </section>
  );
}
