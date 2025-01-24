"use client";

import Image from "next/image";

import styles from "./SideMenu.module.css";

export interface SideMenuButton {
  alt: string;
  iconUrl: string;
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
        {buttons.map(({ onClick, iconUrl, alt: text }) => (
          <button key={iconUrl} className={styles.button} onClick={onClick}>
            <Image src={iconUrl} alt={text} width={24} height={24} />
          </button>
        ))}
      </div>
    )
  );
}
