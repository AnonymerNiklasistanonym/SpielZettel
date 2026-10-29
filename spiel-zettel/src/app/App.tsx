import { useEffect } from "react";

import "./reset.css";
import "./globals.css";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";

import styles from "./App.module.css";

import Main from "./components/Main.jsx";
import useLocale from "./hooks/useLocale.js";

export default function App() {
  const { locale } = useLocale();

  // Update document language depending on the current locale
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className={styles.page}>
      <Main />
    </div>
  );
}
