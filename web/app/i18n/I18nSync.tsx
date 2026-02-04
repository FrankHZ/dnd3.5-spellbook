import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedState } from "~/state/persisted-state";

export function I18nSync() {
  const { state } = usePersistedState();
  const { i18n } = useTranslation();

  const lang = state.uiPrefs.lang ?? "en";

  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [i18n, lang]);

  return null;
}
