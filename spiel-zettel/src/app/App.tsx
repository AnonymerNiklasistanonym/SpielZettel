import { useEffect } from "react";

import { debugLogUseEffectChanged } from "./helper/debugLogs.js";
import useLocale from "./hooks/useLocale.js";
import Page from "./Page.js";

export const COMPONENT_NAME = "App";

export default function App() {
  const { locale } = useLocale();

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["locale", locale]);
    document.documentElement.lang = locale;
  }, [locale]);

  return <Page />;
}
