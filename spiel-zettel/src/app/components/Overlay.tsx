"use client";

import type { ChangeEvent, Dispatch, MouseEvent, SetStateAction } from "react";
import { useCallback, useEffect } from "react";

import styles from "./Overlay.module.css";

export interface OverlayElement {
  id: string;
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

export default function Overlay({
  visible,
  setVisible,
  elements,
}: OverlayProps) {
  console.debug("DRAW Overlay");

  // Event Listeners

  useEffect(() => {
    const keyDownEvent = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        // Toggle visibility of the overlay using the ESC key
        setVisible((prev) => !prev);
      }
    };
    document.addEventListener("keydown", keyDownEvent);
    return () => {
      document.removeEventListener("keydown", keyDownEvent);
    };
  }, [setVisible]);

  // Callbacks

  const closeOverlay = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setVisible(false);
    },
    [setVisible],
  );

  const closeOverlayIfNotChild = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (e.target === e.currentTarget) {
        setVisible(false);
      }
    },
    [setVisible],
  );

  return (
    visible && (
      <div className={styles.container} onClick={closeOverlay}>
        <div className={styles.buttonList} onClick={closeOverlayIfNotChild}>
          {elements.map((element) =>
            element.type === "button" ? (
              <button
                key={element.id}
                className={styles.button}
                onClick={element.onClick}
              >
                {element.text}
              </button>
            ) : (
              <select
                key={element.id}
                value={element.currentValue}
                onChange={element.onChange}
                className={styles.buttonSelect}
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
      </div>
    )
  );
}
