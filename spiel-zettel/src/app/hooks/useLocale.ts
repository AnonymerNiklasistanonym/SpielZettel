import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { defaultLocale } from "../../i18n/i18n";
import {
  debugLogHook,
  debugLogUseEffectInitialize,
  debugLogUseMemo,
} from "../helper/debugLogs";

export interface LocaleDebugInfo {
  localeSearchParams?: string | null;
  localeLocalStorage?: string | null;
  localeNavigator?: string | null;
}

function getLanguageCode(locale: string) {
  return locale.split("-")[0];
}

export const LOCAL_STORAGE_ID_LOCALE = "storedLocale";

export const COMPONENT_NAME = "useLocale";

export default function useLocale() {
  debugLogHook(COMPONENT_NAME);

  const searchParams = useSearchParams();

  const [detectedLocale, setDetectedLocale] = useState<null | string>(null);

  const [storedLocale, setStoredLocale] = useState<null | string>(null);

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "Get detected locale");
    if (typeof window !== "undefined") {
      setDetectedLocale(getLanguageCode(window.navigator.language));
      return;
    }
  }, []);

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "Get stored locale");
    if (typeof window !== "undefined") {
      setStoredLocale(window.localStorage.getItem(LOCAL_STORAGE_ID_LOCALE));
    }
  }, []);

  const searchParamsLocale = useMemo(() => {
    debugLogUseMemo(COMPONENT_NAME, "searchParamsLocale", [
      "searchParams",
      searchParams.values(),
    ]);
    // The current URL parameter locale
    return searchParams?.get("locale");
  }, [searchParams]);

  const locale = useMemo(
    () => searchParamsLocale || storedLocale || detectedLocale || defaultLocale,
    [detectedLocale, searchParamsLocale, storedLocale],
  );

  const localeDebugInfo = useMemo<LocaleDebugInfo>(
    () => ({
      localeLocalStorage: storedLocale,
      localeNavigator: detectedLocale,
      localeSearchParams: searchParamsLocale,
    }),
    [detectedLocale, searchParamsLocale, storedLocale],
  );

  return { locale, localeDebugInfo };
}
