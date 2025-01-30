"use client";

import Image from "next/image";
import { type MouseEvent, useCallback } from "react";

import { name } from "../helper/info";

import styles from "./MainMenu.module.css";

export interface MainMenuButtonProps {
  cancel?: boolean;
  iconUrl?: string;
  ignoreIconColor?: boolean;
  img?: string;
  onClick: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  tabIndex: number;
  title: string;
}

export default function MainMenuButton({
  cancel,
  iconUrl,
  ignoreIconColor,
  img,
  onClick,
  onDelete,
  onShare,
  tabIndex,
  title,
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
      className={`${styles.buttonContainer} ${cancel ? styles.cancel : ""}`}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      <div className={styles.buttonContainerHeader}>
        {iconUrl && (
          <Image
            className={ignoreIconColor ? styles.ignoreIconColor : undefined}
            src={iconUrl}
            alt={title}
            width={28}
            height={28}
          />
        )}
        {/* Text on top */}
        <div className={styles.buttonContainerTitle}>{title}</div>
      </div>

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
          <button onClick={handleOnDelete}>
            <Image
              src="./icons/material/delete_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Delete"
              width={24}
              height={24}
            />
          </button>
          <button onClick={handleOnShare}>
            <Image
              src="./icons/material/share_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
              alt="Delete"
              width={24}
              height={24}
            />
          </button>
        </div>
      )}
    </div>
  );
}
