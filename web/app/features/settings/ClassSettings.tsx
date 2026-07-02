import { useTranslation } from "react-i18next";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useUserPrefs } from "~/state/user-prefs-state";
import { Field } from "~/components/ui/field";
import { Label } from "~/components/ui/label";

export default function ClassSettings() {
  const { state, setState } = useUserPrefs();
  const { t } = useTranslation("settings");
  const checkboxId = "settings-include-prestige";

  return (
    <Card className="gap-0">
      <CardHeader className="gap-1 py-3">
        <CardTitle>{t("classes.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <Field orientation="horizontal">
          <Checkbox
            id={checkboxId}
            checked={state.includePrestige}
            onCheckedChange={(v) =>
              setState((s) => ({ ...s, includePrestige: Boolean(v) }))
            }
          />
          <Label htmlFor={checkboxId}>
            {t("classes.include-prestige")}
          </Label>
        </Field>
      </CardContent>
    </Card>
  );
}
