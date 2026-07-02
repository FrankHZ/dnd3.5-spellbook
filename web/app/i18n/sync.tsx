import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserPrefs } from "~/state/user-prefs-state";

import { DEFAULT_LANG } from "./config";

export function I18nSync() {
  const { state } = useUserPrefs();
  const { i18n } = useTranslation();

  const lang = state.uiPrefs.lang ?? DEFAULT_LANG;

  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [i18n, lang]);

  return null;
}
