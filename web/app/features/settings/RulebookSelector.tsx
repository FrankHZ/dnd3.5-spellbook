import type { Edition, Rulebook } from "@dnd/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { Checkbox } from "~/components/ui/checkbox";
import { Separator } from "~/components/ui/separator";
import { useMetaNames } from "~/i18n/useMetaNames";
import { usePersistedState } from "~/state/persisted-state";

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
  const { state, setState } = usePersistedState();
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
    <div className="rounded-md border p-3 space-y-3">
      <div className="font-medium">{t("Rulebooks")}</div>
      <div className="text-xs text-muted-foreground">
        {t("Leave empty to rely on backend default edition rulebooks.")}
      </div>

      {groups.map((g) => {
        const st = getEditionCheckState(g, selectedRulebookSet);

        return (
          <div key={g.edition.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                {/* Edition checkbox: checked if all; indeterminate if some */}
                <Checkbox
                  checked={st.all ? true : st.some ? "indeterminate" : false}
                  onCheckedChange={(v) =>
                    toggleEdition(g.edition.id, Boolean(v))
                  }
                />
                <span className="font-medium">
                  {g.edition.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({g.edition.system}
                    {g.edition.core ? ", core" : ""})
                  </span>
                </span>
              </label>

              <div className="text-xs text-muted-foreground">
                {st.count}/{st.total} {t("selected")}
              </div>
            </div>

            <Separator />

            <div className="grid gap-2 sm:grid-cols-2">
              {g.rulebooks.map((rb) => {
                const checked = selectedRulebookSet.has(rb.id);
                return (
                  <label
                    key={rb.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleRulebook(rb.id, Boolean(v))}
                    />
                    <span className="font-mono text-xs">{rb.abbr}</span>
                    <span className="truncate">
                      {metaName("rulebooks", rb)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
