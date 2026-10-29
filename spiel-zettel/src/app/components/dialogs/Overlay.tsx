"use client";

import { useCallback, useEffect, useRef } from "react";

import styles from "./Overlay.module.css";

import {
  debugLogDraw,
  debugLogUseEffectChanged,
  debugLogUseEffectRegisterChange,
} from "../../helper/debugLogs.js";
import OverlayElement from "./OverlayElement.js";

import type { OverlayElementProps } from "./OverlayElement.js";
import type { Dispatch, MouseEvent, SetStateAction } from "react";

export interface OverlayProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  elements: OverlayElementProps[];
}

export const COMPONENT_NAME = "Overlay";

export default function Overlay({
  visible,
  setVisible,
  elements,
}: OverlayProps) {
  debugLogDraw(COMPONENT_NAME);

  // States

  const dialogRef = useRef<null | HTMLDialogElement>(null);
  const closeDialog = useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  // Callbacks

  const closeOverlayIfNotChild = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (e.target === e.currentTarget) {
        setVisible(false);
      }
    },
    [setVisible],
  );

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["visible", visible]);
    if (dialogRef.current) {
      if (visible && !dialogRef.current.open) {
        dialogRef.current.showModal();
      } else if (!visible) {
        dialogRef.current.close();
      }
    }
  }, [visible]);

  useEffect(() => {
    const controller = new AbortController();

    document.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key === "Escape") {
          debugLogUseEffectRegisterChange(
            COMPONENT_NAME,
            "Key pressed",
            ev.key,
          );
          // Close overlay using the ESC key
          setVisible(false);
        }
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, [setVisible]);

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClick={closeOverlayIfNotChild}
      onClose={closeDialog}
      tabIndex={-1}
    >
      <div className={styles.buttonList}>
        {elements.map((element) => (
          <OverlayElement key={element.id} {...element} />
        ))}
      </div>
    </dialog>
  );
}
