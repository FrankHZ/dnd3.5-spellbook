import { useTranslation } from "react-i18next";
import { useBootstrap } from "~/bootstrap/useBootstrap";
import {
  MultiSelectPicker,
  type PickerItem,
} from "~/components/MultiSelectPicker";
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
  const { nameWithEn } = useAppI18n();
  const { t } = useTranslation("spell-browse");

  const classes = boot.classes.data?.items ?? [];
  const domains = boot.domains.data?.items ?? [];

  const classItems: PickerItem[] = classes.map((c) => ({
    id: c.id,
    name: nameWithEn(c),
    group: c.prestige ? t("Prestige Classes") : t("Base Classes"),
  }));

  const domainItems: PickerItem[] = domains.map((d) => ({
    id: d.id,
    name: nameWithEn(d),
  }));

  return (
    <div className="space-y-3">
      <MultiSelectPicker
        title={t("Classes")}
        placeholder={t("Filter classes…")}
        items={classItems}
        selectedIds={classIds}
        onChange={onChangeClasses}
      />

      <MultiSelectPicker
        title={t("Domains")}
        placeholder={t("Filter domains…")}
        items={domainItems}
        selectedIds={domainIds}
        onChange={onChangeDomains}
      />
    </div>
  );
}
