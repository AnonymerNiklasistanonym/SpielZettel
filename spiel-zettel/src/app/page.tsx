import styles from "./page.module.css";
import Main from "./components/Main";

import "./reset.css";


export default function Home() {

  return (
    <div className={styles.page}>
      <Main/>
    </div>
  );
}
