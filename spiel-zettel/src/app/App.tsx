import { Outlet } from "react-router";

import "../ui-library/reset.css";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "../ui-library/variables.css";
import "react-toastify/dist/ReactToastify.css";
import "../ui-library/toasts.css";

import styles from "./App.module.css";

import { useDocumentLang } from "./hooks/useDocumentLang.js";
import { useLocale } from "./hooks/useLocale.js";

export function App() {
  const { locale } = useLocale();
  useDocumentLang(locale);

  return (
    <div className={styles.app}>
      <Outlet />
    </div>
  );
}
