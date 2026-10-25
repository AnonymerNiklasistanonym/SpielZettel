import styles from "./SideMenu.module.css";

import { debugLogDraw } from "../../helper/debugLogs.js";
import SideMenuButton from "./SideMenuButton.js";

import type { SideMenuButtonProps } from "./SideMenuButton.js";

export type SideMenuPositions = "top-left" | "top-right";

export interface SideMenuProps {
  visible: boolean;
  buttons: SideMenuButtonProps[];
  position: SideMenuPositions;
}

export default function SideMenu({
  visible,
  buttons,
  position,
}: SideMenuProps) {
  debugLogDraw("SideMenu");
  return (
    visible && (
      <div
        className={`${styles.container} ${
          position === "top-right" ? styles.topRight : styles.topLeft
        }`}
      >
        {buttons.map((props) => (
          <SideMenuButton key={props.alt} {...props} />
        ))}
      </div>
    )
  );
}
