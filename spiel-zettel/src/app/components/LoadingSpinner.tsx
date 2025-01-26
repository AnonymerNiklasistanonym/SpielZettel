import React, { useMemo } from "react";

import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
  messages: string[];
}

export default function LoadingSpinner({ messages }: LoadingSpinnerProps) {
  const show = useMemo(() => messages.length > 0, [messages.length]);

  return (
    <div className={`${styles.container} ${show ? styles.show : styles.hide}`}>
      <div className={styles.spinner}></div>
    </div>
  );
}
