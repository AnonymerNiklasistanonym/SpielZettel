import { useRouter } from "next/navigation";
import type { TranslationValues } from "next-intl";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

export const COMPONENT_NAME = "useTranslationWrapper";

export default function useTranslationWrapper() {
  // Hooks

  const t = useTranslations();
  const router = useRouter();

  // Callbacks

  const switchLanguage = useCallback(
    (newLocale: string) => {
      // Update the URL query to switch the locale
      router.push(`?locale=${newLocale}`, undefined);
    },
    [router],
  );

  const translate = useCallback(
    (id: string, values?: TranslationValues) => {
      return t(id, values);
    },
    [t],
  );

  return { switchLanguage, translate };
}
