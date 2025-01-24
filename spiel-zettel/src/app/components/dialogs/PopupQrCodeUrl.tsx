import { QRCodeSVG } from "qrcode.react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";

import { addTextToClipboard } from "@/app/helper/clipboard";

import { version } from "../../helper/info";

import styles from "./PopupQrCodeUrl.module.css";

export interface PopupBarcodeProps {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  url: string;
}

export default function PopupQrCodeUrl({
  url,
  visible,
  setVisible,
}: PopupBarcodeProps) {
  const dialogRef = useRef<null | HTMLDialogElement>(null);

  const closeDialog = useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  const closeOverlayIfNotChild = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (e.target === e.currentTarget) {
        setVisible(false);
      }
    },
    [setVisible],
  );

  const copyUrlToClipboard = useCallback(() => {
    addTextToClipboard(url).catch(console.error);
  }, [url]);

  // Event Listeners

  useEffect(() => {
    console.debug("[PopupQrCodeUrl] USE EFFECT: Change in visible", visible);
    if (dialogRef.current) {
      if (visible && !dialogRef.current.open) {
        dialogRef.current.showModal();
      } else if (!visible) {
        dialogRef.current.close();
      }
    }
  }, [visible]);

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClose={closeDialog}
      onClick={closeOverlayIfNotChild}
    >
      <QRCodeSVG value={url} onClick={copyUrlToClipboard} />
      <p>{url}</p>
      <p>{version}</p>
    </dialog>
  );
}
