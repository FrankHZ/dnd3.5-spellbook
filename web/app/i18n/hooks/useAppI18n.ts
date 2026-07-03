import type { WithI18nName } from "~/i18n/display/name";
import {
  getDisplayName,
  getDisplayNameWithEn,
} from "~/i18n/display/name";
import { DEFAULT_LANG } from "~/i18n/config";
import { useUserPrefs } from "~/state/user-prefs-state";

export function useAppI18n() {
  const { state } = useUserPrefs();

  const lang = (state.uiPrefs.lang ?? DEFAULT_LANG) as "en" | "zh";
  const variant = lang === "zh" ? state.uiPrefs.zhVariant : undefined;

  const queryKey = {
    lang,
    variant: variant ?? "",
  };

  const name = <T extends WithI18nName>(s: T) => getDisplayName(s, lang);

  const nameWithEn = <T extends WithI18nName>(s: T) =>
    getDisplayNameWithEn(s, lang);

  const spellName = <T extends WithI18nName>(s: T) =>
    lang === "zh" && state.displayPrefs.zhDisplay.spellNamesWithEnglish
      ? getDisplayNameWithEn(s, lang)
      : getDisplayName(s, lang);

  return {
    lang,
    variant,
    queryKey,
    name,
    nameWithEn,
    spellName,
  };
}
