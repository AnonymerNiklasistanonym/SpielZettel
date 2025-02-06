import { useCallback, useMemo, useState } from "react";

import {
  PopupDialogExtraAction,
  PopupDialogType,
} from "../components/dialogs/PopupDialog";
import PopupDialog from "../components/dialogs/PopupDialog";
import { debugLogUseMemo } from "../helper/debugLogs";

export const COMPONENT_NAME = "usePopupDialog";

export default function usePopupDialog() {
  // States

  const [isOpen, setIsOpen] = useState(false);
  const [dialogType, setDialogType] = useState<PopupDialogType>("alert");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogPlaceholder, setDialogPlaceholder] = useState<
    string | undefined
  >(undefined);
  const [dialogExtraActions, setDialogExtraActions] = useState<
    PopupDialogExtraAction[]
  >([]);
  const [dialogConfirmAction, setDialogConfirmAction] = useState<
    null | (() => Promise<void>)
  >(null);
  const [dialogCancelAction, setDialogCancelAction] = useState<
    null | (() => Promise<void>)
  >(null);

  // Callbacks

  const openPopupDialog = useCallback(
    (
      type: PopupDialogType,
      message: string,
      placeholder?: string,
      extraActions?: PopupDialogExtraAction[],
      confirmAction?: (inputValue?: string | number) => Promise<void>,
      cancelAction?: () => Promise<void>,
    ) => {
      setDialogType(type);
      setDialogMessage(message);
      setDialogPlaceholder(placeholder);
      setDialogExtraActions(extraActions ?? []);
      if (confirmAction) {
        setDialogConfirmAction(() => confirmAction);
      }
      if (cancelAction) {
        setDialogCancelAction(() => cancelAction);
      }
      setIsOpen(true);
    },
    [],
  );

  const closePopupDialog = useCallback(() => {
    setIsOpen(false);
    setDialogConfirmAction(null);
    setDialogCancelAction(null);
  }, []);

  const popupDialogElement = useMemo(() => {
    debugLogUseMemo(
      COMPONENT_NAME,
      "PopupDialogElement",
      ["closePopupDialog", closePopupDialog],
      ["dialogCancelAction", dialogCancelAction],
      ["dialogConfirmAction", dialogConfirmAction],
      ["dialogExtraActions", dialogExtraActions],
      ["dialogMessage", dialogMessage],
      ["dialogPlaceholder", dialogPlaceholder],
      ["dialogType", dialogType],
      ["isOpen", isOpen],
    );
    return (
      <PopupDialog
        type={dialogType}
        message={dialogMessage}
        placeholder={dialogPlaceholder}
        isOpen={isOpen}
        extraActions={dialogExtraActions}
        closeDialog={closePopupDialog}
        onConfirm={dialogConfirmAction}
        onCancel={dialogCancelAction}
      />
    );
  }, [
    closePopupDialog,
    dialogCancelAction,
    dialogConfirmAction,
    dialogExtraActions,
    dialogMessage,
    dialogPlaceholder,
    dialogType,
    isOpen,
  ]);

  return { openPopupDialog, popupDialogElement };
}
