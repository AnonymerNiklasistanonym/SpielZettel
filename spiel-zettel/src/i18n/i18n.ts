export const defaultLocale = "en";
export const supportedLocales = [defaultLocale, "de"];
import { deepMerge } from "../app/helper/deepMerge";

import defaultMessages from "./en.json";

export const defaultLocaleMessages = defaultMessages;

export const loadMessages = async (
  locale = defaultLocale,
): Promise<typeof defaultMessages> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const messages = await import(`./${locale}.json`);
    // Always add the default locale messages as fallback
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return deepMerge(defaultLocaleMessages, messages.default);
  } catch (error) {
    console.error(
      Error(
        `Could not load messages for locale: ${locale}, falling back to ${defaultLocale}.`,
        { cause: error },
      ),
    );
    return defaultLocaleMessages;
  }
};
