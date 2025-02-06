"use client";

import { NextIntlClientProvider } from "next-intl";
import type { PropsWithChildren } from "react";
import { Suspense, useEffect, useState } from "react";

import {
  defaultLocale,
  defaultLocaleMessages,
  loadMessages,
} from "../../../i18n/i18n";
import { debugLogDraw, debugLogUseEffectChanged } from "../../helper/debugLogs";

import LocaleUpdater from "./LocaleUpdater";

export const COMPONENT_NAME = "LanguageWrapper";

export default function LanguageWrapper({ children }: PropsWithChildren) {
  debugLogDraw(COMPONENT_NAME);

  // States

  const [messages, setMessages] = useState(defaultLocaleMessages);
  const [locale, setLocale] = useState(defaultLocale);

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["locale", locale]);

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
