import { useAppI18n } from "~/i18n/useAppI18n";
import { useMetaI18n } from "~/i18n/useMetaI18n";
import {
  getMetaDisplayName,
  getMetaDisplayNameWithEn,
  type MetaDict,
  type WithIdName,
} from "./content";

export function useMetaNames() {
  const { lang } = useAppI18n();
  const meta = useMetaI18n();

  const metaName = (dict: MetaDict, e: WithIdName | null | undefined) =>
    getMetaDisplayName(meta, dict, e, lang);

  const metaNameWithEn = (dict: MetaDict, e: WithIdName | null | undefined) =>
    getMetaDisplayNameWithEn(meta, dict, e, lang);

  return { metaName, metaNameWithEn };
}
