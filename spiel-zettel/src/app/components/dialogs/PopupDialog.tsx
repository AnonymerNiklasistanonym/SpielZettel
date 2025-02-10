import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { debugLogDraw, debugLogUseEffectChanged } from "../../helper/debugLogs";
import useTranslationWrapper from "../../hooks/useTranslationWrapper";

import styles from "./PopupDialog.module.css";

export type PopupDialogType = "alert" | "confirm" | "text" | "number";

export interface PopupDialogExtraAction {
  title: string;
  onClick: () => Promise<void>;
}

export interface PopupDialogProps {
  type: PopupDialogType;
  message: string;
  placeholder?: string;
  onConfirm: null | ((inputValue?: string | number) => Promise<void>);
  onCancel: null | (() => Promise<void>);
  isOpen: boolean;
  closeDialog: () => void;
  extraActions?: PopupDialogExtraAction[];
}

export const COMPONENT_NAME = "PopupDialog";

export default function PopupDialog({
  type,
  message,
  placeholder,
  onConfirm,
  onCancel,
  isOpen,
  closeDialog,
  extraActions,
}: PopupDialogProps) {
  debugLogDraw(COMPONENT_NAME);

  // States

  const [inputValue, setInputValue] = useState<string | number>("");

  // References

  const dialogRef = useRef<null | HTMLDialogElement>(null);

  // Hooks

  const { translate } = useTranslationWrapper();

  // Callbacks

  const handleClose = useCallback(() => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
    closeDialog();
    // Reset input value on close
    setInputValue("");
  }, [closeDialog]);

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm(type === "number" ? Number(inputValue) : inputValue)
        .catch(console.error)
        .finally(() => handleClose());
    } else {
      handleClose();
    }
  }, [handleClose, inputValue, onConfirm, type]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
        .catch(console.error)
        .finally(() => handleClose());
    } else {
      handleClose();
    }
  }, [handleClose, onCancel]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        // Confirm automatically if the enter key is pressed inside the input element
        handleConfirm();
      }
    },
    [handleConfirm],
  );

  // Values

  const buttonTextOk = useMemo(
    () => translate("buttons.ok").toLocaleUpperCase(),
    [translate],
  );
  const buttonTextConfirm = useMemo(
    () => translate("buttons.confirm").toLocaleUpperCase(),
    [translate],
  );
  const buttonTextCancel = useMemo(
    () => translate("buttons.cancel").toLocaleUpperCase(),
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
        <p>{title.toLocaleUpperCase()}</p>
      </button>
    ));
  }, [extraActions, handleClose]);

  // Event Listener

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["isOpen", isOpen]);
    if (isOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [isOpen]);

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClose={handleClose}
      tabIndex={-1}
    >
      <div className={styles.dialogContent}>
        <p>{message}</p>
        {(type === "confirm" || type === "text" || type === "number") && (
          <>
            {(type === "text" || type === "number") && (
              <div className={styles.dialogInputWrapper}>
                <input
                  type={type === "text" ? "text" : "number"}
                  value={
                    type === "text"
                      ? (inputValue as string)
                      : (inputValue as number)
                  }
                  placeholder={placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className={styles.input}
                />
              </div>
            )}
            <div className={styles.dialogButtons}>
              <button onClick={handleConfirm}>
                <p>{buttonTextConfirm}</p>
              </button>
              <button className={styles.cancel} onClick={handleCancel}>
                <p>{buttonTextCancel}</p>
              </button>
            </div>
          </>
        )}

        {type === "alert" && (
          <div className={styles.dialogButtons}>
            <button onClick={handleConfirm}>
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
