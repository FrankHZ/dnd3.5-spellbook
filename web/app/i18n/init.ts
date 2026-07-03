import i18n from "i18next";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANG, I18N_NAMESPACES } from "./config";
import { getI18nFromStorage } from "./storage";

i18n
  .use(initReactI18next)
  .use(Backend)
  .init({
    keySeparator: ">",
    nsSeparator: "::",
    lng: getI18nFromStorage().lang,
    fallbackLng: DEFAULT_LANG,
    ns: I18N_NAMESPACES,
    defaultNS: "translation",
    debug: import.meta.env.DEV,
    interpolation: { escapeValue: false },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
