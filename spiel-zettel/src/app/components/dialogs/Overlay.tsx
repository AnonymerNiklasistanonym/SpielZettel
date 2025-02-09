"use client";

import Image from "next/image";
import type { ChangeEvent, Dispatch, MouseEvent, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";

import {
  debugLogDraw,
  debugLogUseEffectChanged,
  debugLogUseEffectRegister,
  debugLogUseEffectRegisterChange,
  debugLogUseEffectUnregister,
} from "../../helper/debugLogs";

import styles from "./Overlay.module.css";

export interface OverlayElement {
  id: string;
  iconUrl?: string;
  type: string;
}

export interface OverlayButton extends OverlayElement {
  type: "button";
  text: string;
  onClick: () => void;
}

export interface OverlaySelectOption {
  text: string;
  value: string;
}

export interface OverlaySelect extends OverlayElement {
  type: "select";
  currentValue?: string;
  options: OverlaySelectOption[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

export type OverlayElements = OverlayButton | OverlaySelect;

export interface OverlayProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  elements: OverlayElements[];
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
    debugLogUseEffectRegister(COMPONENT_NAME, "keydown");

    const keyDownEvent = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        debugLogUseEffectRegisterChange(COMPONENT_NAME, "Key pressed", ev.key);
        // Close overlay using the ESC key
        setVisible(false);
      }
    };
    document.addEventListener("keydown", keyDownEvent);
    return () => {
      debugLogUseEffectUnregister(COMPONENT_NAME, "keydown");
      document.removeEventListener("keydown", keyDownEvent);
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
        {elements.map((element) =>
          element.type === "button" ? (
            <button
              key={element.id}
              className={styles.button}
              onClick={element.onClick}
            >
              {element.iconUrl && (
                <Image
                  src={element.iconUrl}
                  alt={element.text}
                  width={24}
                  height={24}
                />
              )}
              <p>{element.text}</p>
            </button>
          ) : (
            <select
              key={element.id}
              value={element.currentValue}
              onChange={element.onChange}
              className={styles.button}
            >
              {element.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </select>
          ),
        )}
      </div>
    </dialog>
  );
}
