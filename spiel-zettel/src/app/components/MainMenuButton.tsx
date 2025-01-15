"use client";

import { type MouseEvent, useCallback } from "react";

import { name } from "../helper/info";

import styles from "./MainMenu.module.css";

export interface MainMenuButtonProps {
  tabIndex: number;
  title: string;
  img?: string;
  onDelete?: () => void;
  onShare?: () => void;
  onClick: () => void;
}

export default function MainMenuButton({
  title,
  img,
  onDelete,
  onShare,
  onClick,
  tabIndex,
}: MainMenuButtonProps) {
  console.debug("Draw MainMenuButton", title);

  // Callbacks

  const handleOnDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!onDelete) return;
      onDelete();
    },
    [onDelete],
  );

  const handleOnShare = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!onShare) return;
      onShare();
    },
    [onShare],
  );

  return (
    <div
      className={styles.buttonContainer}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      {/* Text on top */}
      <div className={styles.buttonContainerTitle}>{title}</div>

      {/* Image filling the screen width */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={`${name} preview`}
          className={styles.buttonContainerImage}
        />
      )}

      {/* Delete and Share buttons side by side */}
      {onDelete !== undefined && onShare !== undefined && (
        <div className={styles.buttonActions}>
          <button className={styles.buttonAction} onClick={handleOnDelete}>
            Delete
          </button>
          <button className={styles.buttonAction} onClick={handleOnShare}>
            Share
          </button>
        </div>
      )}
    </div>
  );
}
