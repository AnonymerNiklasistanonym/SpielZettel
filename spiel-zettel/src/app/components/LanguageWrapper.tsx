"use client";

import { NextIntlClientProvider } from "next-intl";
import type { PropsWithChildren } from "react";
import { Suspense, useEffect, useState } from "react";

import {
  defaultLocale,
  defaultLocaleMessages,
  loadMessages,
} from "../../i18n/i18n";

import LocaleUpdater from "./LocaleUpdater";

export default function LanguageWrapper({ children }: PropsWithChildren) {
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
