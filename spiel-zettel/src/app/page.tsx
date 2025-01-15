import Main from "./components/Main";

import "./reset.css";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <Main />
    </div>
  );
}
