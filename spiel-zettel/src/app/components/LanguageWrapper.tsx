"use client";

import { useSearchParams } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import {
  Dispatch,
  SetStateAction,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  defaultLocale,
  defaultLocaleMessages,
  loadMessages,
} from "../../i18n/i18n";

export function useLocale() {
  const searchParams = useSearchParams(); // Get query params from URL

  // Memoize the locale value for better performance
  const locale = useMemo(() => {
    return searchParams?.get("locale") || defaultLocale; // Fallback to 'en' if locale is not found
  }, [searchParams]);

  return locale;
}

export interface LocaleUpdaterProps {
  setLocale: Dispatch<SetStateAction<string>>;
}

/** Component that can be wrapped into Suspense tag since it uses useSearchParams() */
export function LocaleUpdater({ setLocale }: LocaleUpdaterProps) {
  const locale = useLocale();

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  return <></>;
}

export default function LanguageWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, setMessages] = useState(defaultLocaleMessages);
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    console.debug("USE EFFECT: [LanguageWrapper] Locale changed", locale);

    document.documentElement.lang = locale;

    loadMessages(locale)
      .then((messages) => {
        setMessages(messages);
      })
      .catch(console.error);
  }, [locale]);

  return (
    <>
      <Suspense>
        <LocaleUpdater setLocale={setLocale} />
      </Suspense>
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </>
  );
}
