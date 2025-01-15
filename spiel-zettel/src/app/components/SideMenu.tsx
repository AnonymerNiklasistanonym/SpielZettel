"use client";

import styles from "./SideMenu.module.css";

export interface SideMenuButton {
  text: string;
  onClick: () => void;
}

export interface SideMenuProps {
  visible: boolean;
  buttons: SideMenuButton[];
  position: "left" | "right";
}

export default function SideMenu({
  visible,
  buttons,
  position,
}: SideMenuProps) {
  return (
    visible && (
      <div
        className={`${styles.container} ${
          position === "right"
            ? styles.containerTopRight
            : styles.containerTopLeft
        }`}
      >
        {buttons.map(({ onClick, text }) => (
          <button key={text} className={styles.button} onClick={onClick}>
            {text}
          </button>
        ))}
      </div>
    )
  );
}
