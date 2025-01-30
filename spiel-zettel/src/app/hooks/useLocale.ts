import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { defaultLocale } from "../../i18n/i18n";

export default function useLocale() {
  const searchParams = useSearchParams(); // Get query params from URL

  // Memoize the locale value for better performance
  const locale = useMemo(() => {
    return searchParams?.get("locale") || defaultLocale; // Fallback to 'en' if locale is not found
  }, [searchParams]);

  return locale;
}
