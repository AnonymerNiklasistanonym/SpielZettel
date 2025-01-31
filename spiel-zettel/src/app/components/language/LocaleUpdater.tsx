"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

import useLocale from "../../hooks/useLocale";

/** Component that can be wrapped into Suspense tag since it uses useSearchParams() */
export default function LocaleUpdater({
  setLocale,
}: {
  setLocale: Dispatch<SetStateAction<string>>;
}) {
  const { locale } = useLocale();

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  return <></>;
}
