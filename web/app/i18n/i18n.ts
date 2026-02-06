import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

i18n
  .use(initReactI18next)
  .use(Backend)
  .init({
    lng: "en",
    fallbackLng: "en",
    ns: [
      "translation",
      "topbar",
      "pager",
      "collections",
      "settings",
      "spell-browse",
      "spell-search",
      "spell-detail",
    ],
    // default namespace to use if not specified in t function
    defaultNS: "translation",
    debug: true,
    interpolation: { escapeValue: false },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
