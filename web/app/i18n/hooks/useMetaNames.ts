import { useAppI18n } from "./useAppI18n";
import { useMetaI18n } from "./useMetaI18n";
import {
  getMetaDisplayName,
  getMetaDisplayNameWithEn,
  type MetaDict,
  type WithIdName,
} from "~/i18n/display/meta";

export function useMetaNames() {
  const { lang } = useAppI18n();
  const meta = useMetaI18n();

  const metaName = (dict: MetaDict, e: WithIdName | null | undefined) =>
    getMetaDisplayName(meta, dict, e, lang);

  const metaNameWithEn = (dict: MetaDict, e: WithIdName | null | undefined) =>
    getMetaDisplayNameWithEn(meta, dict, e, lang);

  return { metaName, metaNameWithEn };
}
