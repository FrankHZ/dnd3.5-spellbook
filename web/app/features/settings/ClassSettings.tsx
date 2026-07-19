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
import { useUserPrefs } from "~/state/user-prefs-state";

export default function ClassSettings() {
  const { state, setState } = useUserPrefs();
  const { t } = useTranslation("settings");
  const checkboxId = "settings-include-prestige";

  return (
    <Card className="app-utility-section">
      <CardHeader className="app-utility-section-header gap-1">
        <CardTitle>{t("classes.title")}</CardTitle>
      </CardHeader>
      <CardContent className="app-utility-section-content space-y-2">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={checkboxId}>
              {t("classes.include-prestige")}
            </FieldLabel>
            <CardDescription>
              {t("classes.include-prestige-description")}
            </CardDescription>
          </FieldContent>
          <Switch
            id={checkboxId}
            checked={state.includePrestige}
            onCheckedChange={(v) =>
              setState((s) => ({ ...s, includePrestige: Boolean(v) }))
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}
