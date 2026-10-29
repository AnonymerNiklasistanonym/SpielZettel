"use client";

import styles from "./Overlay.module.css";

import { debugLogDraw } from "../../helper/debugLogs.js";

import type { ChangeEvent } from "react";

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

export type OverlayElementProps = OverlayButton | OverlaySelect;

export const COMPONENT_NAME = "OverlayElement";

export default function OverlayElement(props: OverlayElementProps) {
  debugLogDraw(COMPONENT_NAME);

  return props.type === "button" ? (
    <button className={styles.button} onClick={props.onClick}>
      {props.iconUrl && (
        <img src={props.iconUrl} alt={props.text} width={24} height={24} />
      )}
      <p>{props.text}</p>
    </button>
  ) : (
    <select
      value={props.currentValue}
      onChange={props.onChange}
      className={styles.button}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  );
}
