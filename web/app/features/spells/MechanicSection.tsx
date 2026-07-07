import type { SpellCasting } from "@dnd/contracts";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("spell-detail");
  const notes = getMechanicDetailNotes(casting.mechanics);
  const noteLabel = t("mechanics.notes.label");
  const translateNote = (key: MechanicDetailNoteKey) =>
    t(`mechanics.notes.${key}`);

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
        <Field
          label={t("mechanics.duration")}
          value={casting.duration}
          notes={notes.duration}
          noteLabel={noteLabel}
          translateNote={translateNote}
        />

        <Field
          label={t("mechanics.saving-throw")}
          value={casting.savingThrow}
          notes={notes.savingThrow}
          noteLabel={noteLabel}
          translateNote={translateNote}
        />
        <Field
          label={t("mechanics.spell-resistance")}
          value={casting.spellResistance}
          notes={notes.spellResistance}
          noteLabel={noteLabel}
          translateNote={translateNote}
        />
      </dl>
    </section>
  );
}
