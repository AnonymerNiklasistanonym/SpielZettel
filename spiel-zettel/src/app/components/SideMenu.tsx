"use client";

import Image from "next/image";

import styles from "./SideMenu.module.css";

export interface SideMenuButton {
  alt: string;
  iconUrl: string;
  badge?: string | number;
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
          position === "right" ? styles.topRight : styles.topLeft
        }`}
      >
        {buttons.map(({ onClick, iconUrl, alt, badge }) => (
          <button key={iconUrl} className={styles.button} onClick={onClick}>
            <Image src={iconUrl} alt={alt} width={24} height={24} />
            {badge && <span className={styles.badge}>{badge}</span>}
          </button>
        ))}
      </div>
    )
  );
}
