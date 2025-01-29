import { useCallback, useEffect, useMemo, useRef } from "react";

import useTranslationWrapper from "../../helper/useTranslationWrapper";

import styles from "./PopupDialog.module.css";

export type PopupDialogType = "alert" | "confirm";

export interface PopupDialogExtraAction {
  title: string;
  onClick: () => Promise<void>;
}

export interface PopupDialogProps {
  type: PopupDialogType;
  message: string;
  onConfirm: null | (() => Promise<void>);
  onCancel: null | (() => Promise<void>);
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

  // Hooks

  const { translate } = useTranslationWrapper();

  // Callbacks

  const handleClose = useCallback(() => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    closeDialog();
  }, [closeDialog]);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm()
        .catch(console.error)
        .finally(() => handleClose());
    } else {
      handleClose();
    }
  }, [handleClose, onConfirm]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
        .catch(console.error)
        .finally(() => handleClose());
    } else {
      handleClose();
    }
  }, [handleClose, onCancel]);

  // Values

  const buttonTextOk = useMemo(() => translate("buttons.ok"), [translate]);
  const buttonTextConfirm = useMemo(
    () => translate("buttons.confirm"),
    [translate],
  );
  const buttonTextCancel = useMemo(
    () => translate("buttons.cancel"),
    [translate],
  );

  const buttonsExtraActions = useMemo(() => {
    if (!extraActions) {
      return [];
    }
    return extraActions.map(({ title, onClick }) => (
      <button
        key={title}
        onClick={() => {
          if (onClick) {
            onClick()
              .catch(console.error)
              .finally(() => handleClose());
          } else {
            handleClose();
          }
        }}
      >
        <p>{title}</p>
      </button>
    ));
  }, [extraActions, handleClose]);

  // Event Listener

  useEffect(() => {
    console.debug("[PopupDialog] USE EFFECT: Change in isOpen", isOpen);
    if (isOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [isOpen]);

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClose={closeDialog}
      tabIndex={-1}
    >
      <div className={styles.dialogContent}>
        <p>{message}</p>
        {type === "confirm" && (
          <div className={styles.dialogButtons}>
            <button onClick={handleConfirm}>
              <p>{buttonTextConfirm}</p>
            </button>
            <button className={styles.cancel} onClick={handleCancel}>
              <p>{buttonTextCancel}</p>
            </button>
          </div>
        )}
        {type === "alert" && (
          <div className={styles.dialogButtons}>
            <button onClick={handleClose}>
              <p>{buttonTextOk}</p>
            </button>
          </div>
        )}
        {buttonsExtraActions.length > 0 && (
          <div className={styles.dialogButtons}>{buttonsExtraActions}</div>
        )}
      </div>
    </dialog>
  );
}
