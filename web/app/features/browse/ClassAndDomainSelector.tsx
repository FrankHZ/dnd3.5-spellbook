import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import {
  MultiSelectPicker,
  type PickerItem,
} from "~/components/MultiSelectPicker";
import { useDisplayPrefs } from "~/features/display/useDisplayPrefs";
import { useAppI18n } from "~/i18n/hooks/useAppI18n";

export function ClassAndDomainSelector({
  classIds,
  domainIds,
  onChangeClasses,
  onChangeDomains,
}: {
  classIds: number[];
  domainIds: number[];
  onChangeClasses: (next: number[]) => void;
  onChangeDomains: (next: number[]) => void;
}) {
  const boot = useBootstrap();
  const { lang, name, nameWithEn } = useAppI18n();
  const displayPrefs = useDisplayPrefs();
  const displayName =
    lang === "zh" && displayPrefs.zhDisplay.classDomainLabelsWithEnglish
      ? nameWithEn
      : name;
  const { t } = useTranslation("spell-browse");

  const classes = boot.classes.data?.items ?? [];
  const domains = boot.domains.data?.items ?? [];

  const classItems: PickerItem[] = classes.map((c) => ({
    id: c.id,
    name: displayName(c),
    group: c.prestige ? t("classes.prestige") : t("classes.base"),
  }));

  const domainItems: PickerItem[] = domains.map((d) => ({
    id: d.id,
    name: displayName(d),
  }));

  return (
    <div className="space-y-3">
      <MultiSelectPicker
        title={t("filters.classes")}
        placeholder={t("filters.classes-placeholder")}
        items={classItems}
        selectedIds={classIds}
        onChange={onChangeClasses}
      />

      <MultiSelectPicker
        title={t("filters.domains")}
        placeholder={t("filters.domains-placeholder")}
        items={domainItems}
        selectedIds={domainIds}
        onChange={onChangeDomains}
      />
    </div>
  );
}
