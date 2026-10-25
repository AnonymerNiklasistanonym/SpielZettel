import styles from "./SideMenu.module.css";

import { debugLogDraw } from "../../helper/debugLogs.js";

export interface SideMenuButtonProps {
  alt: string;
  iconUrl: string;
  badge?: string | number;
  onClick: () => void;
}

export default function SideMenuButton({
  onClick,
  iconUrl,
  alt,
  badge,
}: SideMenuButtonProps) {
  debugLogDraw("SideMenuButton", alt);
  return (
    <button className={styles.button} onClick={onClick}>
      <img src={iconUrl} alt={alt} width={24} height={24} />
      {badge && <span className={styles.badge}>{badge}</span>}
    </button>
  );
}
