import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../../i18n.js";

type Locale = (typeof SUPPORTED_LOCALES)[number];

export function useLocale() {
  const { i18n } = useTranslation();

  // i18n.resolvedLanguage is guaranteed to be a supported locale
  // (falls back to DEFAULT_LOCALE), whereas i18n.language can be
  // something like "de-DE" or "en-US"
  const getCurrentLocale = useCallback(
    () => (i18n.resolvedLanguage ?? DEFAULT_LOCALE) as Locale,
    [i18n],
  );

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === getCurrentLocale()) return;
      // persists via detection.caches in localStorage
      await i18n.changeLanguage(next);
    },
    [i18n, getCurrentLocale],
  );

  return {
    locale: getCurrentLocale(),
    setLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
