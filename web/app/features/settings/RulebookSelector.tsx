import type { Edition, Rulebook } from "@dnd/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { Checkbox } from "~/components/ui/checkbox";
import { Separator } from "~/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useMetaNames } from "~/i18n/hooks/useMetaNames";
import { useUserPrefs } from "~/state/user-prefs-state";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";

type EditionGroup = {
  edition: Edition;
  rulebooks: Rulebook[];
};

function groupRulebooksByEdition(rulebooks: Rulebook[]): EditionGroup[] {
  const map = new Map<number, EditionGroup>();

  for (const rb of rulebooks) {
    const ed = rb.edition;
    const existing = map.get(ed.id);
    if (existing) {
      existing.rulebooks.push(rb);
    } else {
      map.set(ed.id, { edition: ed, rulebooks: [rb] });
    }
  }

  // stable order: core editions first, then by system+name
  const groups = Array.from(map.values());
  // optionally sort rulebooks within group
  for (const g of groups) {
    g.rulebooks.sort((x, y) => x.abbr.localeCompare(y.abbr));
  }
  return groups;
}

function getEditionCheckState(
  group: { rulebooks: Rulebook[] },
  selected: Set<number>,
) {
  const total = group.rulebooks.length;
  let count = 0;
  for (const rb of group.rulebooks) if (selected.has(rb.id)) count++;

  return {
    total,
    count,
    all: count === total && total > 0,
    none: count === 0,
    some: count > 0 && count < total,
  };
}

export default function RulebookSelector() {
  const { t } = useTranslation("settings");
  const { metaName } = useMetaNames();
  const { state, setState } = useUserPrefs();
  const boot = useBootstrap(state.includePrestige);

  const rulebooks = boot.rulebooks.data?.items ?? [];
  const rulebookIds = state.selectedRulebookIds;

  const selectedRulebookSet = useMemo(
    () => new Set(rulebookIds),
    [rulebookIds],
  );

  const groups = useMemo(() => groupRulebooksByEdition(rulebooks), [rulebooks]);

  function toggleEdition(editionId: number, checked: boolean) {
    setState((s) => {
      const next = new Set(s.selectedRulebookIds);
      const group = groups.find((g) => g.edition.id === editionId);
      if (!group) return s;

      for (const rb of group.rulebooks) {
        if (checked) next.add(rb.id);
        else next.delete(rb.id);
      }
      return { ...s, selectedRulebookIds: Array.from(next) };
    });
  }

  function toggleRulebook(id: number, checked: boolean) {
    setState((s) => {
      const next = new Set(s.selectedRulebookIds);
      if (checked) next.add(id);
      else next.delete(id);
      return { ...s, selectedRulebookIds: Array.from(next) };
    });
  }

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle>{t("rulebooks.title")}</CardTitle>
        <CardDescription>
          {t("rulebooks.default-hint")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {groups.map((g) => {
          const st = getEditionCheckState(g, selectedRulebookSet);
          const editionCheckboxId = `settings-edition-${g.edition.id}`;

          return (
            <div
              key={g.edition.id}
              className="space-y-3 rounded-md border bg-muted/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <Field orientation="horizontal">
                  <Checkbox
                    id={editionCheckboxId}
                    checked={st.all ? true : st.some ? "indeterminate" : false}
                    onCheckedChange={(v) =>
                      toggleEdition(g.edition.id, Boolean(v))
                    }
                  />
                  <FieldLabel
                    htmlFor={editionCheckboxId}
                    className="select-text"
                  >
                    {g.edition.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({g.edition.system}
                      {g.edition.core ? ", core" : ""})
                    </span>
                  </FieldLabel>
                </Field>
                <div className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {st.count}/{st.total} {t("rulebooks.selected")}
                </div>
              </div>
              <Separator />
              <FieldGroup className="grid gap-2 sm:grid-cols-2">
                {g.rulebooks.map((rb) => {
                  const checked = selectedRulebookSet.has(rb.id);
                  const rulebookCheckboxId = `settings-rulebook-${g.edition.id}-${rb.id}`;
                  return (
                    <Field key={rb.id} orientation="horizontal">
                      <Checkbox
                        id={rulebookCheckboxId}
                        checked={checked}
                        onCheckedChange={(v) =>
                          toggleRulebook(rb.id, Boolean(v))
                        }
                      />
                      <FieldLabel
                        htmlFor={rulebookCheckboxId}
                        className="select-text"
                      >
                        <span className="font-mono text-xs">{rb.abbr}</span>
                        <span className="truncate">
                          {metaName("rulebooks", rb)}
                        </span>
                      </FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
