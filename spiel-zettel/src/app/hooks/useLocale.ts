import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { defaultLocale } from "../../i18n/i18n";
import {
  debugLogUseEffectInitialize,
  debugLogUseMemo,
} from "../helper/debugLogs";

export interface LocaleDebugInfo {
  localeSearchParams?: string | null;
  localeLocalStorage?: string | null;
  localeNavigator?: string | null;
  defaultLocale: string;
}

function getLanguageCode(locale: string) {
  return locale.split("-")[0];
}

export const LOCAL_STORAGE_ID_LOCALE = "storedLocale";

export const COMPONENT_NAME = "useLocale";

export default function useLocale() {
  // States

  const [detectedLocale, setDetectedLocale] = useState<null | string>(null);
  const [storedLocale, setStoredLocale] = useState<null | string>(null);

  // Hooks

  const searchParams = useSearchParams();

  // Values

  const searchParamsLocale = useMemo(() => {
    debugLogUseMemo(COMPONENT_NAME, "searchParamsLocale", [
      "searchParams",
      searchParams.entries().toArray(),
    ]);
    // The current URL parameter locale
    return searchParams?.get("locale");
  }, [searchParams]);

  const locale = useMemo(() => {
    debugLogUseMemo(
      COMPONENT_NAME,
      "locale",
      ["searchParamsLocale", searchParamsLocale],
      ["storedLocale", storedLocale],
      ["detectedLocale", detectedLocale],
    );
    return (
      searchParamsLocale || storedLocale || detectedLocale || defaultLocale
    );
  }, [detectedLocale, searchParamsLocale, storedLocale]);

  const localeDebugInfo = useMemo<LocaleDebugInfo>(() => {
    debugLogUseMemo(
      COMPONENT_NAME,
      "localeDebugInfo",
      ["detectedLocale", detectedLocale],
      ["searchParamsLocale", searchParamsLocale],
      ["storedLocale", storedLocale],
    );
    return {
      localeLocalStorage: storedLocale,
      localeNavigator: detectedLocale,
      localeSearchParams: searchParamsLocale,
      defaultLocale,
    };
  }, [detectedLocale, searchParamsLocale, storedLocale]);

  // Event Listeners

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

  return { locale, localeDebugInfo };
}
