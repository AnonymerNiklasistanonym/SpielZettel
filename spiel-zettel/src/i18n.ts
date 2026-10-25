import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LOCALES = ["en", "de"] as const;
export const DEFAULT_LOCALE = "en";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    backend: {
      loadPath: "/locales/{{lng}}.json", // served from public/locales/
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  })
  .catch((err) => {
    console.error("i18n initialization failed:", err);
  });

export default i18n;
