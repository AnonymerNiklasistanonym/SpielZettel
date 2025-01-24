import React, { useCallback, useEffect, useRef } from "react";

import styles from "./PopupDialog.module.css";

export type PopupDialogType = "alert" | "confirm";

export interface PopupDialogExtraAction {
  title: string;
  onClick: () => Promise<void> | void;
}

export interface PopupDialogProps {
  type: PopupDialogType;
  message: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
  isOpen: boolean;
  closeDialog: () => void;
  extraActions?: PopupDialogExtraAction[];
}

export default function PopupDialog({
  type,
  message,
  onConfirm,
  onCancel,
  isOpen,
  closeDialog,
  extraActions,
}: PopupDialogProps) {
  // States

  const dialogRef = useRef<null | HTMLDialogElement>(null);

  // Values

  const handleClose = useCallback(() => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    closeDialog();
  }, [closeDialog]);

  // Event Listener

  useEffect(() => {
    console.debug("[PopupDialog] USE EFFECT: Change in isOpen", isOpen);
    if (isOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [isOpen]);

  return (
    <dialog
      className={styles.customDialog}
      ref={dialogRef}
      onClose={closeDialog}
    >
      <div className={styles.dialogContent}>
        <p>{message}</p>
        {type === "confirm" && (
          <div className={styles.dialogButtons}>
            <button
              onClick={async () => {
                console.log("Confirm button pressed");
                try {
                  if (onConfirm) {
                    await onConfirm();
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  handleClose();
                }
                console.log("Confirm button reached end");
              }}
            >
              <p>Confirm</p>
            </button>
            <button
              className={styles.cancel}
              onClick={async () => {
                try {
                  if (onCancel) {
                    await onCancel();
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  handleClose();
                }
              }}
            >
              <p>Cancel</p>
            </button>
          </div>
        )}
        {type === "alert" && (
          <div className={styles.dialogButtons}>
            <button onClick={handleClose}>
              <p>OK</p>
            </button>
          </div>
        )}
        {extraActions && extraActions.length > 0 && (
          <div className={styles.dialogButtons}>
            {extraActions.map(({ title, onClick }) => (
              <button
                key={title}
                onClick={async () => {
                  if (onClick) {
                    try {
                      await onClick();
                    } catch (err) {
                      console.error(err);
                    }
                  }
                  handleClose();
                }}
              >
                <p>{title}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
