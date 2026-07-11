import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldContent, FieldLabel } from "~/components/ui/field";
import { Switch } from "~/components/ui/switch";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";

export default function DisplaySettings() {
  const {
    spellListDensity,
    zhDisplay,
    setSpellListDensity,
    setZhSpellNamesWithEnglish,
    setZhClassDomainLabelsWithEnglish,
    setZhFilterFacetLabelsWithEnglish,
  } = useDisplayPrefs();
  const { t } = useTranslation("settings");
  const compactId = "settings-display-compact";
  const spellNameEnglishId = "settings-display-zh-spell-names";
  const classDomainEnglishId = "settings-display-zh-class-domain";
  const filterFacetEnglishId = "settings-display-zh-filter-facets";

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle>{t("display.title")}</CardTitle>
        <CardDescription>{t("display.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={compactId}>
              {t("display.compact.title")}
            </FieldLabel>
            <CardDescription>
              {t("display.compact.description")}
            </CardDescription>
          </FieldContent>
          <Switch
            id={compactId}
            checked={spellListDensity === "compact"}
            onCheckedChange={(checked) =>
              setSpellListDensity(checked ? "compact" : "comfortable")
            }
          />
        </Field>

        <div className="space-y-3 rounded-md border bg-background px-4 py-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">{t("display.zh.title")}</h3>
            <CardDescription>{t("display.zh.description")}</CardDescription>
          </div>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={spellNameEnglishId}>
                {t("display.zh.spell-names.title")}
              </FieldLabel>
              <CardDescription>
                {t("display.zh.spell-names.description")}
              </CardDescription>
            </FieldContent>
            <Switch
              id={spellNameEnglishId}
              checked={zhDisplay.spellNamesWithEnglish}
              onCheckedChange={setZhSpellNamesWithEnglish}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={classDomainEnglishId}>
                {t("display.zh.class-domain.title")}
              </FieldLabel>
              <CardDescription>
                {t("display.zh.class-domain.description")}
              </CardDescription>
            </FieldContent>
            <Switch
              id={classDomainEnglishId}
              checked={zhDisplay.classDomainLabelsWithEnglish}
              onCheckedChange={setZhClassDomainLabelsWithEnglish}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={filterFacetEnglishId}>
                {t("display.zh.filter-facets.title")}
              </FieldLabel>
              <CardDescription>
                {t("display.zh.filter-facets.description")}
              </CardDescription>
            </FieldContent>
            <Switch
              id={filterFacetEnglishId}
              checked={zhDisplay.filterFacetLabelsWithEnglish}
              onCheckedChange={setZhFilterFacetLabelsWithEnglish}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
