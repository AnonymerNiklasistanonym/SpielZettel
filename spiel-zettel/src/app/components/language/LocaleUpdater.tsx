"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import type { LocaleDebugInfo } from "../../hooks/useLocale";
import useLocale from "../../hooks/useLocale";

/** Component that can be wrapped into Suspense tag since it uses useSearchParams() */
export default function LocaleUpdater({
  setLocale,
  setLocaleDebugInfo,
}: {
  setLocale?: Dispatch<SetStateAction<string>>;
  setLocaleDebugInfo?: Dispatch<SetStateAction<LocaleDebugInfo>>;
}) {
  const { locale, localeDebugInfo } = useLocale();

  useEffect(() => {
    if (setLocale) {
      setLocale(locale);
    }
  }, [locale, setLocale]);

  useEffect(() => {
    if (setLocaleDebugInfo) {
      setLocaleDebugInfo(localeDebugInfo);
    }
  }, [localeDebugInfo, setLocaleDebugInfo]);
  return <></>;
}
