"use client";

import Image from "next/image";
import { type MouseEvent, useCallback } from "react";

import { name } from "../helper/info";

import styles from "./MainMenu.module.css";

export interface MainMenuButtonProps {
  tabIndex: number;
  title: string;
  img?: string;
  iconUrl?: string;
  cancel?: boolean;
  onDelete?: () => Promise<void> | void;
  onShare?: () => void;
  onClick: () => void;
}

export default function MainMenuButton({
  title,
  img,
  iconUrl,
  onDelete,
  onShare,
  onClick,
  tabIndex,
  cancel,
}: MainMenuButtonProps) {
  console.debug("Draw MainMenuButton", title);

  // Callbacks

  const handleOnDelete = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!onDelete) return;
      try {
        await onDelete();
      } catch (err) {
        console.error(err);
      }
    },
    [onDelete],
  );

  const handleOnShare = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!onShare) return;
      try {
        await onShare();
      } catch (err) {
        console.error(err);
      }
    },
    [onShare],
  );

  return (
    <div
      className={`${styles.buttonContainer} ${cancel ? "cancel" : ""}`}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      <div className={styles.buttonContainerHeader}>
        {iconUrl && <Image src={iconUrl} alt={title} width={28} height={28} />}
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
