import type { Edition, Rulebook } from "@dnd/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Separator } from "~/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getRulebookDisplay } from "~/i18n/display/rulebook";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";
import { useMetaI18n } from "~/i18n/hooks/useMetaI18n";
import { useUserPrefs } from "~/state/user-prefs-state";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";

type EditionGroup = {
  edition: Edition;
  rulebooks: Rulebook[];
};

export type RulebookSettingsCategory =
  "core" | "supplements" | "magazines" | "other";

export type RulebookCategoryGroup = {
  key: RulebookSettingsCategory;
  editionGroups: EditionGroup[];
};

export type RulebookSettingsGroup = {
  key: string;
  category: RulebookSettingsCategory;
  edition?: Edition;
  rulebooks: Rulebook[];
};

const RULEBOOK_CATEGORY_ORDER: RulebookSettingsCategory[] = [
  "core",
  "supplements",
  "magazines",
  "other",
];

export function isMagazineRulebook(rulebook: Rulebook) {
  return (
    /^drg\d+$/i.test(rulebook.abbr) ||
    /^dragon-magazine-\d+$/i.test(rulebook.slug) ||
    /^dragon magazine #?\d+/i.test(rulebook.name)
  );
}

export function getRulebookSettingsCategory(
  rulebook: Rulebook,
): RulebookSettingsCategory {
  if (rulebook.edition.core) return "core";
  if (isMagazineRulebook(rulebook)) return "magazines";
  if (rulebook.edition.slug === "supplementals-35") return "supplements";
  return "other";
}

function sortEditionGroups(groups: EditionGroup[]) {
  return groups.sort(
    (a, b) =>
      Number(b.edition.core) - Number(a.edition.core) ||
      a.edition.system.localeCompare(b.edition.system) ||
      a.edition.name.localeCompare(b.edition.name) ||
      a.edition.id - b.edition.id,
  );
}

export function groupRulebooksByCategory(
  rulebooks: Rulebook[],
  displayLabel: (rulebook: Rulebook) => string,
): RulebookCategoryGroup[] {
  const categoryMap = new Map<
    RulebookSettingsCategory,
    Map<number, EditionGroup>
  >();

  for (const rb of rulebooks) {
    const category = getRulebookSettingsCategory(rb);
    const editionMap =
      categoryMap.get(category) ?? new Map<number, EditionGroup>();
    categoryMap.set(category, editionMap);

    const ed = rb.edition;
    const existing = editionMap.get(ed.id);
    if (existing) {
      existing.rulebooks.push(rb);
    } else {
      editionMap.set(ed.id, { edition: ed, rulebooks: [rb] });
    }
  }

  return RULEBOOK_CATEGORY_ORDER.flatMap((category) => {
    const editionMap = categoryMap.get(category);
    if (!editionMap) return [];

    const editionGroups = sortEditionGroups(Array.from(editionMap.values()));
    for (const group of editionGroups) {
      group.rulebooks.sort(
        (x, y) =>
          displayLabel(x).localeCompare(displayLabel(y)) ||
          x.abbr.localeCompare(y.abbr) ||
          x.id - y.id,
      );
    }

    return [{ key: category, editionGroups }];
  });
}

export function groupRulebooksForSettings(
  rulebooks: Rulebook[],
  displayLabel: (rulebook: Rulebook) => string,
): RulebookSettingsGroup[] {
  return groupRulebooksByCategory(
    rulebooks,
    displayLabel,
  ).flatMap<RulebookSettingsGroup>((group) => {
    if (group.key === "magazines") {
      return [
        {
          key: "magazines",
          category: group.key,
          rulebooks: group.editionGroups.flatMap(
            (editionGroup) => editionGroup.rulebooks,
          ),
        },
      ];
    }

    return group.editionGroups.map((editionGroup) => ({
      key: `${group.key}-${editionGroup.edition.id}`,
      category: group.key,
      edition: editionGroup.edition,
      rulebooks: editionGroup.rulebooks,
    }));
  });
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

function getSettingsRulebookDisplay(rulebook: Rulebook, localizedName: string) {
  const abbr = rulebook.displayAbbr ?? rulebook.abbr ?? localizedName;
  return {
    abbr,
    name: localizedName,
  };
}

function getRulebookCategoryLabel(
  category: RulebookSettingsCategory,
  t: (key: string, options?: { ns: "settings" }) => string,
) {
  switch (category) {
    case "core":
      return t("rulebooks.groups.core", { ns: "settings" });
    case "supplements":
      return t("rulebooks.groups.supplements", { ns: "settings" });
    case "magazines":
      return t("rulebooks.groups.magazines", { ns: "settings" });
    case "other":
      return t("rulebooks.groups.other", { ns: "settings" });
  }
}

export default function RulebookSelector() {
  const { t } = useTranslation("settings");
  const { lang } = useAppI18n();
  const meta = useMetaI18n();
  const { state, setState } = useUserPrefs();
  const boot = useBootstrap(state.includePrestige);

  const rulebooks = boot.rulebooks.data?.items ?? [];
  const rulebookIds = state.selectedRulebookIds;

  const selectedRulebookSet = useMemo(
    () => new Set(rulebookIds),
    [rulebookIds],
  );

  const groups = useMemo(
    () =>
      groupRulebooksForSettings(rulebooks, (rulebook) => {
        const localized = getRulebookDisplay(meta, rulebook, lang);
        return getSettingsRulebookDisplay(rulebook, localized.name).abbr;
      }),
    [lang, meta, rulebooks],
  );

  function toggleGroup(groupKey: string, checked: boolean) {
    setState((s) => {
      const next = new Set(s.selectedRulebookIds);
      const group = groups.find((g) => g.key === groupKey);
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
        <CardDescription>{t("rulebooks.default-hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {groups.map((group) => {
          const st = getEditionCheckState(group, selectedRulebookSet);
          const groupCheckboxId = `settings-rulebook-group-${group.key}`;
          const groupTitle =
            group.category === "magazines"
              ? getRulebookCategoryLabel(group.category, t)
              : (group.edition?.name ??
                getRulebookCategoryLabel(group.category, t));
          const groupSubtitle = group.edition
            ? `${group.edition.system}${group.edition.core ? `, ${t("rulebooks.core")}` : ""}`
            : undefined;

          return (
            <div
              key={group.key}
              className="space-y-3 rounded-md border bg-muted/10 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <Field orientation="horizontal">
                  <Checkbox
                    id={groupCheckboxId}
                    checked={st.all ? true : st.some ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleGroup(group.key, Boolean(v))}
                  />
                  <FieldLabel
                    htmlFor={groupCheckboxId}
                    className="select-text text-sm font-medium text-foreground"
                  >
                    {groupTitle}
                    {groupSubtitle ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({groupSubtitle})
                      </span>
                    ) : null}
                  </FieldLabel>
                </Field>
                <Badge variant="outline" className="shrink-0">
                  {st.count}/{st.total}
                </Badge>
              </div>

              <Separator />
              <FieldGroup className="grid gap-2 sm:grid-cols-2">
                {group.rulebooks.map((rb) => {
                  const checked = selectedRulebookSet.has(rb.id);
                  const localized = getRulebookDisplay(meta, rb, lang);
                  const display = getSettingsRulebookDisplay(
                    rb,
                    localized.name,
                  );
                  const rulebookCheckboxId = `settings-rulebook-${group.key}-${rb.id}`;
                  return (
                    <Field
                      key={rb.id}
                      orientation="horizontal"
                      className="min-w-0"
                    >
                      <Checkbox
                        id={rulebookCheckboxId}
                        checked={checked}
                        onCheckedChange={(v) =>
                          toggleRulebook(rb.id, Boolean(v))
                        }
                      />
                      <FieldLabel
                        htmlFor={rulebookCheckboxId}
                        className="min-w-0 flex-1 select-text"
                      >
                        <span className="shrink-0 text-xs font-medium">
                          {display.abbr}
                        </span>
                        {display.name !== display.abbr && (
                          <span className="min-w-0 truncate">
                            {display.name}
                          </span>
                        )}
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
