import { useEffect } from "react";

/**
 * Update document language depending on the given locale
 */
export function useDocumentLang(lang: string) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}
