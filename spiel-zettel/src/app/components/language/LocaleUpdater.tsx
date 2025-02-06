"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import { debugLogUseEffectChanged } from "@/app/helper/debugLogs";

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
  console.debug("DRAW LocaleUpdater");

  const { locale, localeDebugInfo } = useLocale();

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
