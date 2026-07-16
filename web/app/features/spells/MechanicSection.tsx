import type { SpellCasting } from "@dnd/contracts";
import { useTranslation } from "react-i18next";

import {
  getSpellMechanicDisplayValue,
  type SpellMechanicField,
} from "~/i18n/display/spell-mechanics";

import {
  getMechanicDetailNotes,
  type MechanicDetailNoteKey,
} from "./mechanic-detail-notes";

function Field({
  label,
  value,
  notes = [],
  noteLabel,
  translateNote,
}: {
  label: string;
  value?: string | null;
  notes?: MechanicDetailNoteKey[];
  noteLabel?: string;
  translateNote?: (key: MechanicDetailNoteKey) => string;
}) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-2 border-b border-border/70 py-1.5 last:border-b-0">
      <dt className="text-xs font-medium leading-5 text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm leading-5 text-foreground/85">
        <span>{value && value.trim() ? value : "—"}</span>
        {notes.length > 0 && noteLabel && translateNote && (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {noteLabel}: {notes.map(translateNote).join(", ")}
          </span>
        )}
      </dd>
    </div>
  );
}

export function MechanicsSection({ casting }: { casting: SpellCasting }) {
  const { t, i18n } = useTranslation([
    "spell-detail",
    "spell-mechanic-vocabulary",
  ]);
  const notes = getMechanicDetailNotes(casting.mechanics);
  const noteLabel = t("mechanics.notes.label");
  const translateNote = (key: MechanicDetailNoteKey) =>
    t(`mechanics.notes.${key}`);
  const displayValue = (
    field: SpellMechanicField,
    raw: string | null | undefined,
  ) =>
    getSpellMechanicDisplayValue({
      field,
      raw,
      facet: casting.mechanics?.[field],
      language: i18n.resolvedLanguage ?? i18n.language,
      t: (key, options) => t(key, options),
    });

  return (
    <section className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("sections.mechanics")}
      </div>
      <dl className="rounded-sm border bg-muted/15 px-2">
        <Field
          label={t("mechanics.casting-time")}
          value={displayValue("castingTime", casting.castingTime)}
        />
        <Field
          label={t("mechanics.range")}
          value={displayValue("range", casting.range)}
        />

        <Field
          label={t("mechanics.target")}
          value={displayValue("target", casting.target)}
        />
        <Field
          label={t("mechanics.effect")}
          value={displayValue("effect", casting.effect)}
        />

        <Field
          label={t("mechanics.area")}
          value={displayValue("area", casting.area)}
        />
        <Field
          label={t("mechanics.duration")}
          value={displayValue("duration", casting.duration)}
          notes={notes.duration}
          noteLabel={noteLabel}
          translateNote={translateNote}
        />

        <Field
          label={t("mechanics.saving-throw")}
          value={displayValue("savingThrow", casting.savingThrow)}
          notes={notes.savingThrow}
          noteLabel={noteLabel}
          translateNote={translateNote}
        />
        <Field
          label={t("mechanics.spell-resistance")}
          value={displayValue("spellResistance", casting.spellResistance)}
          notes={notes.spellResistance}
          noteLabel={noteLabel}
          translateNote={translateNote}
        />
      </dl>
    </section>
  );
}
