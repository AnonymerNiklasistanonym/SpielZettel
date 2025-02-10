"use client";

import Image from "next/image";
import { type MouseEvent, useCallback } from "react";

import { debugLogDraw } from "../../helper/debugLogs";
import { iconMaterialDelete, iconMaterialShare } from "../../helper/icons";
import { name } from "../../helper/info";
import useTranslationWrapper from "../../hooks/useTranslationWrapper";

import styles from "./MainMenu.module.css";

export interface MainMenuButtonProps {
  cancel?: boolean;
  fullGrid?: boolean;
  iconUrl?: string;
  ignoreIconColor?: boolean;
  img?: string;
  onClick: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  tabIndex: number;
  title: string;
}

export const COMPONENT_NAME = "MainMenuButton";

export default function MainMenuButton({
  cancel,
  fullGrid,
  iconUrl,
  ignoreIconColor,
  img,
  onClick,
  onDelete,
  onShare,
  tabIndex,
  title,
}: MainMenuButtonProps) {
  debugLogDraw(COMPONENT_NAME, title);

  // Hooks

  const { translate } = useTranslationWrapper();

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
      className={`${styles.buttonContainer} ${cancel ? styles.cancel : ""} ${fullGrid ? styles.fullGrid : ""}`}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      <div className={styles.buttonContainerHeader}>
        {iconUrl && (
          <Image
            className={ignoreIconColor ? styles.ignoreIconColor : undefined}
            src={iconUrl}
            alt={title}
            width={24}
            height={24}
          />
        )}
        {/* Text on top */}
        <div className={styles.buttonContainerTitle}>{title}</div>
      </div>

      {/* Preview Image */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={translate("buttons.preview", { name })}
          className={styles.buttonContainerImage}
        />
      )}

      {/* Delete and Share buttons side by side */}
      {onDelete !== undefined && onShare !== undefined && (
        <div className={styles.buttonActions}>
          <button onClick={handleOnDelete}>
            <Image
              src={iconMaterialDelete}
              alt={translate("buttons.delete")}
              width={24}
              height={24}
            />
          </button>
          <button onClick={handleOnShare}>
            <Image
              src={iconMaterialShare}
              alt={translate("buttons.share")}
              width={24}
              height={24}
            />
          </button>
        </div>
      )}
    </div>
  );
}
