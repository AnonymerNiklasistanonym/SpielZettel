import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { defaultLocale } from "../../i18n/i18n";

function getLanguageCode(locale: string) {
  return locale.split("-")[0];
}

export const LOCAL_STORAGE_ID_LOCALE = "storedLocale";

export default function useLocale() {
  const searchParams = useSearchParams();

  const [detectedLocale, setDetectedLocale] = useState<null | string>(null);

  const [storedLocale, setStoredLocale] = useState<null | string>(null);

  useEffect(() => {
    console.debug("USE EFFECT: [useLocale] Get detected locale");
    if (typeof window !== "undefined") {
      setDetectedLocale(getLanguageCode(window.navigator.language));
      return;
    }
  }, []);

  useEffect(() => {
    console.debug("USE EFFECT: [useLocale] Get stored locale");
    if (typeof window !== "undefined") {
      setStoredLocale(window.localStorage.getItem(LOCAL_STORAGE_ID_LOCALE));
    }
  }, []);

  const searchParamsLocale = useMemo(() => {
    console.debug("DETECTED CHANGE: [useLocale] Search Params");
    // The current URL parameter locale
    return searchParams?.get("locale");
  }, [searchParams]);

  const [locale, source] = useMemo(() => {
    let sourceString = "Default Locale";
    if (searchParamsLocale) {
      sourceString = "Search Params";
    } else if (storedLocale) {
      sourceString = "Local Storage";
    } else if (detectedLocale) {
      sourceString = "Detected Language";
    }
    return [
      searchParamsLocale || storedLocale || detectedLocale || defaultLocale,
      sourceString,
    ];
  }, [detectedLocale, searchParamsLocale, storedLocale]);

  return { locale, source };
}
