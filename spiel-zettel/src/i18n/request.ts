import { getRequestConfig } from "next-intl/server";

import { defaultLocale, loadMessages } from "./i18n";

export default getRequestConfig(async () => {
  // TODO Update locale (must be static server compatible)
  return {
    locale: defaultLocale,
    messages: await loadMessages(defaultLocale),
  };
});
