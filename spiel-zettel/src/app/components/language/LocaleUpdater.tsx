"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import { debugLogDraw, debugLogUseEffectChanged } from "../../helper/debugLogs";
import type { LocaleDebugInfo } from "../../hooks/useLocale";
import useLocale from "../../hooks/useLocale";

export interface LocaleUpdaterProps {
  setLocale?: Dispatch<SetStateAction<string>>;
  setLocaleDebugInfo?: Dispatch<SetStateAction<LocaleDebugInfo>>;
}

export const COMPONENT_NAME = "LocaleUpdater";

/** Component that can be wrapped into Suspense tag since it uses useSearchParams() */
export default function LocaleUpdater({
  setLocale,
  setLocaleDebugInfo,
}: LocaleUpdaterProps) {
  debugLogDraw(COMPONENT_NAME);

  // Hooks

  const { locale, localeDebugInfo } = useLocale();

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["locale", locale],
      ["setLocale", setLocale],
    );
    if (setLocale) {
      setLocale(locale);
    }
  }, [locale, setLocale]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["localeDebugInfo", localeDebugInfo],
      ["setLocaleDebugInfo", setLocaleDebugInfo],
    );
    if (setLocaleDebugInfo) {
      setLocaleDebugInfo(localeDebugInfo);
    }
  }, [localeDebugInfo, setLocaleDebugInfo]);
  return <></>;
}
