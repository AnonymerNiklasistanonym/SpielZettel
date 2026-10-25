import "./reset.css";
import "./globals.css";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";

import styles from "./page.module.css";

import Main from "./components/Main.js";

/*
export const metadata: Metadata = {
  title: name,
  description: "Use your favorite game papers on the go",
  // Reference files from the 'public' directory
  icons: [
    { rel: "icon", url: "./favicon.svg" },
    { rel: "shortcut icon", url: "./favicon.ico" },
  ],
  manifest: "./manifest.json",
};
*/

export default function Home() {
  return (
    <div className={styles.page}>
      <Main />
    </div>
  );
}
