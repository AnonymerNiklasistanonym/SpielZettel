import { debugLogDraw } from "../../helper/debugLogs";

import type { SideMenuButtonProps } from "./SideMenuButton";
import SideMenuButton from "./SideMenuButton";

import styles from "./SideMenu.module.css";

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
