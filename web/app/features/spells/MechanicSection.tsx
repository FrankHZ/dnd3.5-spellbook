import type { SpellCasting } from "@dnd/contracts";
import { useTranslation } from "react-i18next";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-1.5 last:border-b-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm leading-5 text-foreground/85">
        {value && value.trim() ? value : "—"}
      </dd>
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
      <dl className="rounded-sm border bg-muted/15 px-2">
        <Field
          label={t("mechanics.casting-time")}
          value={casting.castingTime}
        />
        <Field label={t("mechanics.range")} value={casting.range} />

        <Field label={t("mechanics.target")} value={casting.target} />
        <Field label={t("mechanics.effect")} value={casting.effect} />

        <Field label={t("mechanics.area")} value={casting.area} />
        <Field label={t("mechanics.duration")} value={casting.duration} />

        <Field
          label={t("mechanics.saving-throw")}
          value={casting.savingThrow}
        />
        <Field
          label={t("mechanics.spell-resistance")}
          value={casting.spellResistance}
        />
      </dl>
    </section>
  );
}
