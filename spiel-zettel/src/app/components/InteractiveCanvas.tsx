"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import styles from "./InteractiveCanvas.module.css";

import { getCanvasImageBase64 } from "../helper/canvas.js";
import {
  changeThemeColor,
  getThemeColor,
  resetThemeColor,
} from "../helper/changeThemeColor.js";
import { addFileToClipboard } from "../helper/clipboard.js";
import { createImageFileFromBase64 } from "../helper/createFile.js";
import {
  createNotification,
  createNotificationServiceWorker,
  createNotificationServiceWorkerOrFallback,
  DEFAULT_SW_SCOPE_NOTIFICATIONS,
} from "../helper/createNotification.js";
import {
  debugLogDraw,
  debugLogUseEffectChanged,
  debugLogUseEffectInitialize,
  debugLogUseEffectRegisterChange,
} from "../helper/debugLogs.js";
import {
  areSpielZettelStatesDifferent,
  evaluateRules,
} from "../helper/evaluateRule.js";
import { handleInputs } from "../helper/handleInputs.js";
import {
  iconMaterialBack,
  iconMaterialClipboard,
  iconMaterialClose,
  iconMaterialDeleteSweep,
  iconMaterialDownload,
  iconMaterialFullscreen,
  iconMaterialFullscreenExit,
  iconMaterialHome,
  iconMaterialLink,
  iconMaterialMenu,
  iconMaterialRedo,
  iconMaterialShare,
  iconMaterialSwapHorizontal,
  iconMaterialUndo,
} from "../helper/icons.js";
import {
  backgroundColorDark,
  backgroundColorLight,
  name,
  notificationsServiceWorkerUrl,
  version,
  workboxServiceWorkerUrl,
} from "../helper/info.js";
import { getVersionString, readSpielZettelFile } from "../helper/readFile.js";
import { render } from "../helper/render.js";
import { checkForNewVersion } from "../helper/serviceWorkerUtils.js";
import { downloadFile, shareOrDownloadFile } from "../helper/shareFile.js";
import useDarkMode from "../hooks/useDarkMode.js";
import useFullScreen from "../hooks/useFullscreen.js";
import useIndexedDB from "../hooks/useIndexedDb.js";
import usePopupDialog from "../hooks/usePopupDialog.js";
import useServiceWorker from "../hooks/useServiceWorker.js";
import Overlay from "./dialogs/Overlay.js";
import MainMenu from "./menus/MainMenu.js";
import SideMenu from "./menus/SideMenu.js";

import type { SpielZettelElementState } from "../helper/evaluateRule.js";
import type {
  SpielZettelFileData,
  SpielZettelRuleSet,
} from "../helper/readFile.js";
import type { DebugInformation } from "../helper/render.js";
import type { SaveEntry } from "../hooks/useIndexedDb.js";
import type { OverlayElementProps } from "./dialogs/OverlayElement.js";
import type { SideMenuPositions } from "./menus/SideMenu.js";
import type { SideMenuButtonProps } from "./menus/SideMenuButton.js";
import type { MouseEvent as ReactMouseEvent } from "react";

function isFileHandle(
  handle: FileSystemHandle,
): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

export const COMPONENT_NAME = "InteractiveCanvas";

export default function InteractiveCanvas() {
  debugLogDraw(COMPONENT_NAME);

  // States

  /** Store uploaded or PWA launched files */
  const [file, setFile] = useState<File | null>(null);
  /** Store parsed JSON */
  const [spielZettelData, setSpielZettelData] =
    useState<SpielZettelFileData | null>(null);
  /** Store the current image element */
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [elementStatesUndoRedo, setElementStatesUndoRedo] = useState<{
    undos: SpielZettelElementState[][];
    redos: SpielZettelElementState[][];
  }>({ undos: [], redos: [] });
  /** Store the current debug information */
  const [debug, setDebug] = useState(false);
  /** Overlay related states */
  const [overlayVisible, setOverlayVisible] = useState(false);
  /** Track the current save ID */
  const [currentSave, setCurrentSave] = useState<string | null>(null);
  /** Track the current rule set ID */
  const [currentRuleSet, setRuleSet] = useState<string | null>(null);
  /** Trigger a canvas refresh by incrementing this variable */
  const [refreshCanvas, setRefreshCanvas] = useState(0);
  /** Store the current position for the side menu */
  const [sideMenuPosition, setSideMenuPosition] =
    useState<SideMenuPositions>("top-right");
  /** Store the current saves for the overlay */
  const [currentSaves, setCurrentSaves] = useState<SaveEntry[]>([]);
  /** Trigger an additional refresh of the main menu in case of changes in the database */
  const [refreshMainMenu, setRefreshMainMenu] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);

  // References

  /** Reference to the canvas which should be used to render the SpielZettel */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Store the current element states (and the previous version) */
  const elementStatesRef = useRef<SpielZettelElementState[]>([]);
  const debugRef = useRef<DebugInformation>({});
  /** Store the current rule set */
  const ruleSetRef = useRef<SpielZettelRuleSet | null>(null);

  // Toasts

  const showToast = useCallback((message: string) => {
    return toast.info(message, {
      position: "bottom-left",
      autoClose: 10000,
    });
  }, []);

  const showToastError = useCallback((error: Error) => {
    console.error(error);
    return toast.error(error.message, {
      position: "bottom-left",
      autoClose: 10000,
    });
  }, []);

  // Hooks

  const {
    addSpielZettel,
    removeSpielZettel,
    getSpielZettel,
    getAllSpielZettel,
    addSave,
    getSave,
    getAllSaves,
    setLastSave,
    getLastSave,
    resetDB,
    removeSaves,
  } = useIndexedDB("SpielZettelDB");
  const isDarkMode = useDarkMode();
  const isFullscreen = useFullScreen();
  const { popupDialogIsOpen, popupDialogElement, openPopupDialog } =
    usePopupDialog();
  const { t } = useTranslation();
  /* Update text depending on the locale */
  const onServiceWorkerRegisterText = useRef<string>(
    t("messages.newVersionAvailable"),
  );
  const checkForNewVersionSw = useCallback(
    () =>
      checkForNewVersion(
        workboxServiceWorkerUrl,
        () =>
          new Promise((resolve) =>
            openPopupDialog(
              "confirm",
              onServiceWorkerRegisterText.current,
              undefined,
              undefined,
              undefined,
              () => {
                resolve(true);
                return Promise.resolve();
              },
              () => {
                resolve(false);
                return Promise.resolve();
              },
            ),
          ),
      ),
    [openPopupDialog],
  );
  const registeredWorkboxSw = useServiceWorker(
    workboxServiceWorkerUrl,
    undefined,
    checkForNewVersionSw,
    showToastError,
  );
  const registeredNotificationsSw = useServiceWorker(
    notificationsServiceWorkerUrl,
    `./${DEFAULT_SW_SCOPE_NOTIFICATIONS}`,
  );

  // Values

  const currentName = useMemo<string | null>(() => {
    if (spielZettelData === null) return null;
    const info = spielZettelData.dataJSON;
    return `${info.name} (${getVersionString(info.version)}${currentRuleSet ? ` - ${currentRuleSet}` : ""})`;
  }, [currentRuleSet, spielZettelData]);

  // Callbacks

  const deleteSpielZettel = useCallback(
    (id: string) => {
      openPopupDialog(
        "confirm",
        t("messages.confirmDelete", { name, id }) +
          " " +
          t("messages.confirmAreYouSure"),
        undefined,
        undefined,
        undefined,
        async () => {
          await removeSpielZettel(id);
          setRefreshMainMenu(true);
        },
      );
    },
    [openPopupDialog, removeSpielZettel, t],
  );

  const onDisabled = useCallback(() => {
    console.debug("onDisabled");
    openPopupDialog(
      "alert",
      t("messages.alertUnableToEdit"),
      undefined,
      undefined,
      [
        {
          title: t("messages.disableCurrentRuleSet"),
          onClick: () => {
            setRuleSet(null);
            return Promise.resolve();
          },
        },
      ],
    );
  }, [openPopupDialog, t]);

  const drawCanvas = useCallback(() => {
    console.debug("drawCanvas");

    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    const startTime = performance.now();
    render(
      canvas,
      ctx,
      image,
      spielZettelData.dataJSON.elements,
      elementStatesRef,
      true,
      true,
      debug,
      debugRef.current,
    );
    const endTime = performance.now();
    debugRef.current.previousDrawCanvasMs = endTime - startTime;
    if (debug) {
      console.debug(
        "drawCanvas timings:",
        debugRef.current.previousDrawCanvasMs,
        "ms",
      );
    }
  }, [debug, image, spielZettelData]);

  const disableRulesetAfterError = useCallback(
    (error: Error) => {
      openPopupDialog(
        "confirm",
        t("messages.confirmDisableRulesetErrorEvaluateRules", {
          errorMessage: error.message,
          errorCause: (error.cause as Error | undefined)?.message ?? "none",
        }),
        undefined,
        undefined,
        undefined,
        () => {
          setRuleSet(null);
          return Promise.resolve();
        },
      );
    },
    [openPopupDialog, t],
  );

  const handleCanvasClick = useCallback(
    async (event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
      console.debug("handleCanvasClick");
      const canvas = canvasRef.current;
      if (canvas === null || spielZettelData === null || image === null) return;

      // Setup backup
      const statesBackup = elementStatesRef.current.map((a) => ({ ...a }));

      const startTime = performance.now();
      let refresh = false;

      try {
        refresh = await handleInputs(
          canvas,
          image,
          event,
          spielZettelData.dataJSON.elements,
          elementStatesRef,
          ruleSetRef,
          onDisabled,
          (element, elementState) =>
            new Promise((resolve) => {
              openPopupDialog(
                "number",
                t("messages.enterNumber"),
                typeof elementState.value === "string" ||
                  typeof elementState.value === "number"
                  ? `${elementState.value}`
                  : undefined,
                element.options,
                elementState.value !== undefined
                  ? [
                      {
                        title: t("buttons.clear"),
                        onClick: () => {
                          resolve(undefined);
                          return Promise.resolve();
                        },
                      },
                    ]
                  : [],
                (value) => {
                  resolve((value as number) ?? null);
                  return Promise.resolve();
                },
                () => {
                  resolve(null);
                  return Promise.resolve();
                },
              );
            }),
          (element, elementState) =>
            new Promise((resolve) => {
              openPopupDialog(
                "text",
                t("messages.enterText"),
                typeof elementState.value === "string" ||
                  typeof elementState.value === "number"
                  ? `${elementState.value}`
                  : undefined,
                element.options,
                elementState.value !== undefined
                  ? [
                      {
                        title: t("buttons.clear"),
                        onClick: () => {
                          resolve(undefined);
                          return Promise.resolve();
                        },
                      },
                    ]
                  : [],
                (value) => {
                  resolve((value as string) ?? null);
                  return Promise.resolve();
                },
                () => {
                  resolve(null);
                  return Promise.resolve();
                },
              );
            }),
          (element, elementState) =>
            new Promise((resolve) => {
              openPopupDialog(
                "options",
                t("messages.selectOption"),
                undefined,
                element.options,
                elementState.value !== undefined
                  ? [
                      {
                        title: t("buttons.clear"),
                        onClick: () => {
                          resolve(undefined);
                          return Promise.resolve();
                        },
                      },
                    ]
                  : [],
                (value) => {
                  resolve(value ?? null);
                  return Promise.resolve();
                },
                () => {
                  resolve(null);
                  return Promise.resolve();
                },
              );
            }),
          debugRef,
          debug,
        );
      } catch (error) {
        disableRulesetAfterError(error as Error);
      }
      const endTime = performance.now();
      debugRef.current.handleInputsMs = endTime - startTime;

      if (refresh) {
        console.debug(
          "DETECTED STATE CHANGE: [handleCanvasClick]",
          elementStatesRef.current,
        );
        // If states changed add a states backup
        setElementStatesUndoRedo((prev) => {
          if (
            !areSpielZettelStatesDifferent(
              elementStatesRef.current,
              statesBackup,
            )
          ) {
            // If no change is detected do not add a states backup
            return prev;
          }
          return {
            ...prev,
            redos: [],
            undos: [...prev.undos, statesBackup].slice(-999),
          };
        });

        // Update save with state changes
        if (currentSave !== null) {
          addSave(
            currentSave,
            spielZettelData.dataJSON.name,
            elementStatesRef.current ?? [],
            ruleSetRef.current?.name ?? undefined,
          ).catch(showToastError);
        }
        // Update canvas with state changes
        setRefreshCanvas((prev) => prev + 1);
      }
    },
    [
      spielZettelData,
      image,
      onDisabled,
      debug,
      openPopupDialog,
      t,
      disableRulesetAfterError,
      currentSave,
      addSave,
      showToastError,
    ],
  );

  const handleCanvasClickWrapper = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
      handleCanvasClick(event).catch(showToastError);
    },
    [handleCanvasClick, showToastError],
  );

  const loadLastSpielZettel = useCallback(async () => {
    try {
      const lastSaveId = await getLastSave();
      if (!lastSaveId) {
        console.warn("[Last Save] No last save ID found.");
        return;
      }
      const lastSave = await getSave(lastSaveId);
      if (!lastSave) {
        console.warn("[Last Save] No connected last save found.");
        return;
      }
      const spielZettel = await getSpielZettel(lastSave.save.spielZettelKey);
      if (!spielZettel) {
        console.warn(`[Last Save] No connected ${name} found.`);
        return;
      }
      // Found last save, load it
      console.info("Found last save:", lastSave, spielZettel);
      setSpielZettelData(spielZettel.spielZettel);
      setCurrentSave(lastSave.id);
    } catch (error) {
      showToastError(Error("Error fetching last save", { cause: error }));
    }
  }, [getLastSave, getSave, getSpielZettel, showToastError]);

  const createNewSave = useCallback(async () => {
    if (spielZettelData === null) {
      showToastError(
        Error("Unable to create new save since no SpielZettel is loaded"),
      );
      return;
    }
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const currentDateIsoStr = new Date(now.getTime() - offset * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const currentTimeStr = now
      .toLocaleTimeString("de", { hour12: false })
      .split(":")
      .join("-");
    const newSaveId = `${currentDateIsoStr}_${currentTimeStr}`;
    showToast(t("messages.createNewSave", { name: newSaveId }));
    await addSave(
      newSaveId,
      spielZettelData.dataJSON.name,
      [],
      ruleSetRef.current?.name ?? undefined,
    );
    setCurrentSave(newSaveId);
  }, [addSave, showToast, showToastError, spielZettelData, t]);

  const onClear = useCallback(() => {
    // Create a new save which automatically clears the current state
    createNewSave().catch(showToastError);
  }, [createNewSave, showToastError]);

  const onResetSates = useCallback(() => {
    // Reset all states
    setFile(null);
    setSpielZettelData(null);
    setRuleSet(null);
    ruleSetRef.current = null;
    elementStatesRef.current = [];
    setRefreshMainMenu(true);
  }, []);

  const onReset = useCallback(() => {
    openPopupDialog(
      "confirm",
      t("messages.confirmDeleteAll") + " " + t("messages.confirmAreYouSure"),
      undefined,
      undefined,
      undefined,
      async () => {
        onResetSates();
        localStorage.clear();
        try {
          await Promise.race([
            resetDB(),
            // Max execution time to make sure the DB is reset but also to not wait forever (resetDB broken!)
            new Promise((resolve) => setTimeout(() => resolve(true), 500)),
          ]);
        } catch (err) {
          showToastError(err as Error);
        } finally {
          setRefreshMainMenu(true);
          window.location.reload();
        }
      },
    );
  }, [onResetSates, openPopupDialog, resetDB, showToastError, t]);

  const evaluateRulesHelper = useCallback(async () => {
    // Remove all previous disabled states
    for (const state of elementStatesRef.current) {
      delete state.disabled;
    }
    // Evaluate rules
    if (ruleSetRef.current && spielZettelData) {
      console.debug("evaluate rules helper");
      try {
        const [, info] = await evaluateRules(
          ruleSetRef.current,
          spielZettelData.dataJSON.elements,
          elementStatesRef,
        );
        if (info) {
          debugRef.current = { ...debugRef.current, ...info };
        }
      } catch (error) {
        disableRulesetAfterError(error as Error);
      }
    }
  }, [disableRulesetAfterError, spielZettelData]);

  const loadFiles = useCallback(
    (files: File[], origin: string) => {
      if (files.length === 1) {
        console.info(`File received (${origin}):`, files[0]);
        setFile(files[0]);
      } else if (files.length > 0) {
        console.info(`Files received (${origin}):`, files);
        const loadMessage = t("messages.reading", {
          name,
          fileName: Array.from(files)
            .map((file) => file.name)
            .join(", "),
        });
        showToast(loadMessage);
        setLoadingMessages((prev) => [
          ...prev.filter((a) => a !== loadMessage),
          loadMessage,
        ]);
        Promise.all(
          Array.from(files).map((uploadedFile) =>
            readSpielZettelFile(uploadedFile).then((data) =>
              addSpielZettel(data.dataJSON.name, data),
            ),
          ),
        )
          .then(() => setRefreshMainMenu(true))
          .catch(showToastError)
          .finally(() =>
            setLoadingMessages((prev) => prev.filter((a) => a !== loadMessage)),
          );
      } else {
        console.warn(`No files received (${origin})`);
      }
    },
    [addSpielZettel, showToast, showToastError, t],
  );

  // Event Listeners

  // > Initialize

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["spielZettelData", spielZettelData],
      ["showToastError", showToastError],
    );
    // Exit fullscreen in the main menu automatically
    if (spielZettelData === null && document.fullscreenElement) {
      document.exitFullscreen().catch(showToastError);
    }
  }, [showToastError, spielZettelData]);

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "Refresh canvas");
    // Refresh canvas on load
    setRefreshCanvas((prev) => prev + 1);
  }, []);

  useEffect(() => {
    debugLogUseEffectInitialize(
      COMPONENT_NAME,
      "Get last score and spielzettel",
    );
    loadLastSpielZettel().catch(showToastError);
  }, [loadLastSpielZettel, showToastError]);

  useEffect(() => {
    const controller = new AbortController();

    window
      .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener(
        "change",
        (event) => {
          if (event.matches) {
            debugLogUseEffectRegisterChange(
              COMPONENT_NAME,
              "dpr changed",
              window.devicePixelRatio,
            );
            setRefreshCanvas((prev) => prev + 1);
          }
        },
        { signal: controller.signal },
      );

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "d" && spielZettelData && !popupDialogIsOpen) {
          debugLogUseEffectRegisterChange(
            COMPONENT_NAME,
            "key pressed" + popupDialogIsOpen,
            event.key,
          );
          setDebug((prev) => !prev);
        }
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, [spielZettelData, popupDialogIsOpen]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["t", t]);
    // Dismiss all toasts if language changes
    toast.dismiss();
  }, [t]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["t", t]);
    // Update service worker new version text
    onServiceWorkerRegisterText.current = t("messages.newVersionAvailable");
  }, [t]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["openPopupDialog", openPopupDialog],
      ["showToastError", showToastError],
      ["t", t],
      ["loadFiles", loadFiles],
    );
    // PWA: Detect file opened with installed application
    if ("launchQueue" in window) {
      window.launchQueue.setConsumer((launchParams) => {
        if (!launchParams.files.length) return;
        Promise.all(
          launchParams.files
            .filter(isFileHandle)
            .map((fileHandle) => fileHandle.getFile()),
        )
          .then((files) => loadFiles(files, "launch queue"))
          .catch(showToastError);
      });
    }
  }, [loadFiles, openPopupDialog, showToastError, t]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["isDarkMode", isDarkMode]);
    // Make sure the correct theme color is set
    changeThemeColor(isDarkMode ? backgroundColorDark : backgroundColorLight);
  }, [isDarkMode]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, [
      "spielZettelData",
      spielZettelData,
    ]);
    // Load SpielZettel
    if (spielZettelData === null) {
      setCurrentSave(null);
      return;
    }
    // > Image element with new image data
    const img = new Image();
    img.src = spielZettelData.imageBase64;
    img.onload = () => {
      setImage(img); // Store the image in state
    };
    // > Add/Update SpielZettel in database
    addSpielZettel(spielZettelData.dataJSON.name, spielZettelData)
      .then(() => {
        setRefreshMainMenu(true);
      })
      .catch(showToastError);
    // > If no save is loaded check if a save file exists otherwise create a new one
    if (currentSave === null) {
      showToast(t("messages.noCurrentSaveFound"));
      getAllSaves()
        .then((saves) => {
          const spielZettelSaves = saves.filter(
            (a) => a.save.spielZettelKey === spielZettelData.dataJSON.name,
          );
          if (spielZettelSaves.length === 0) {
            return createNewSave();
          }
          const latestSave = spielZettelSaves[spielZettelSaves.length - 1];
          setCurrentSave(latestSave.id);
        })
        .catch(showToastError);
    }
    // > Refresh canvas
    setRefreshCanvas((prev) => prev + 1);
  }, [
    addSave,
    addSpielZettel,
    createNewSave,
    currentSave,
    getAllSaves,
    showToast,
    showToastError,
    spielZettelData,
    t,
  ]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["file", file],
      ["showToastError", showToastError],
      ["t", t],
    );
    // Read uploaded file
    if (file !== null) {
      const loadMessage = t("messages.reading", {
        name,
        fileName: file.name,
      });
      showToast(loadMessage);
      setLoadingMessages((prev) => [
        ...prev.filter((a) => a !== loadMessage),
        loadMessage,
      ]);
      readSpielZettelFile(file)
        .then((data) => setSpielZettelData(data))
        .catch(showToastError)
        .finally(() =>
          setLoadingMessages((prev) => prev.filter((a) => a !== loadMessage)),
        );
    }
  }, [file, showToast, showToastError, t]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["currentName", currentName],
      ["t", t],
    );
    if (currentName === null) return;
    // > Document title
    document.title = t("title.websiteCanvas", {
      name,
      spielZettelName: currentName,
    });
  }, [currentName, t]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["currentSave", currentSave],
      ["spielZettelData", spielZettelData],
      ["evaluateRulesHelper", evaluateRulesHelper],
      ["getSave", getSave],
      ["setLastSave", setLastSave],
      ["showToast", showToast],
      ["showToastError", showToastError],
      ["t", t],
    );
    if (spielZettelData === null) return;
    if (currentSave === null) return;
    getSave(currentSave)
      .then(async (saveEntry) => {
        console.info(
          "Load save",
          currentSave,
          saveEntry,
          saveEntry?.save?.states ?? [],
        );
        if (!saveEntry) return;
        showToast(
          t("messages.loadSave", {
            name: saveEntry.id,
            ruleSet: saveEntry.save.ruleSet ?? "none",
          }),
        );
        elementStatesRef.current = saveEntry.save.states ?? [];
        // Reset undos/redos
        setElementStatesUndoRedo({ undos: [], redos: [] });
        // Automatically set ruleSet if it was set before
        setRuleSet(saveEntry.save.ruleSet ?? null);
        await evaluateRulesHelper();
        // Update canvas with the changes of the save
        setRefreshCanvas((prev) => prev + 1);
      })
      .catch(showToastError);
    // Update last save with the current save
    setLastSave(currentSave).catch(showToastError);
  }, [
    currentSave,
    evaluateRulesHelper,
    getSave,
    setLastSave,
    showToast,
    showToastError,
    spielZettelData,
    t,
  ]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["image", image]);
    if (image === null) return;
    // Update canvas with the image changes
    setRefreshCanvas((prev) => prev + 1);
  }, [image]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["refreshCanvas", refreshCanvas]);
    // Refresh canvas
    drawCanvas();
    debugRef.current.drawCall = refreshCanvas;
  }, [drawCanvas, refreshCanvas]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["currentRuleSet", currentRuleSet],
      ["spielZettelData", spielZettelData],
      ["evaluateRulesHelper", evaluateRulesHelper],
      ["showToast", showToast],
      ["t", t],
    );
    if (spielZettelData === null) return;
    ruleSetRef.current = spielZettelData.dataJSON.ruleSets
      ? (spielZettelData.dataJSON.ruleSets.find(
          (a) => a.name === currentRuleSet,
        ) ?? null)
      : null;
    evaluateRulesHelper()
      .then(() => {
        // Update canvas with the new state changes after evaluating the rules of the rule set
        setRefreshCanvas((prev) => prev + 1);
      })
      .catch(console.error);
  }, [currentRuleSet, spielZettelData, evaluateRulesHelper, showToast, t]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["currentRuleSet", currentRuleSet],
      ["spielZettelData", spielZettelData],
      ["addSave", addSave],
      ["currentSave", currentSave],
      ["showToastError", showToastError],
    );
    if (spielZettelData === null) return;
    if (currentSave === null) return;
    // Update save with the currentRuleSet if a current save exists
    addSave(
      currentSave,
      spielZettelData.dataJSON.name,
      elementStatesRef.current ?? [],
      currentRuleSet ?? undefined,
    ).catch(showToastError);
  }, [currentRuleSet, spielZettelData, addSave, currentSave, showToastError]);

  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["overlayVisible", overlayVisible],
      ["getAllSaves", getAllSaves],
      ["showToastError", showToastError],
    );
    if (!overlayVisible) return;
    // Update all saves if the overlay is is opened
    getAllSaves()
      .then((saves) => {
        setCurrentSaves(saves);
      })
      .catch(showToastError);
  }, [getAllSaves, overlayVisible, showToastError]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["debug", debug]);
    // Update canvas with/without debug overlay
    setRefreshCanvas((prev) => prev + 1);
  }, [debug]);

  useEffect(() => {
    const controller = new AbortController();

    window.addEventListener(
      "resize",
      (ev) => {
        debugLogUseEffectRegisterChange(COMPONENT_NAME, "Canvas resized", ev);
        // Update canvas with new size
        setRefreshCanvas((prev) => prev + 1);
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, [spielZettelData]);

  // MainMenu:
  // > Callbacks

  const onFileUpload = useCallback(
    (files: File[]) => loadFiles(files, "upload"),
    [loadFiles],
  );

  // SideMenu: Callbacks

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen().catch(showToastError);
    } else {
      document.exitFullscreen().catch(showToastError);
    }
  }, [showToastError]);

  const undoLastAction = useCallback(() => {
    const current = elementStatesRef.current.slice();
    setElementStatesUndoRedo((prev) => {
      if (prev.undos.length === 0) {
        return prev;
      }
      // Update the current state to the latest undo
      elementStatesRef.current = prev.undos.slice(-1)[0];
      // Trigger a rule evaluation and refresh canvas
      // TODO Async?
      evaluateRulesHelper()
        .then(() => {
          setRefreshCanvas((prev) => prev + 1);
        })
        .catch(console.error);
      return {
        ...prev,
        // Add current state to redos
        redos: [...prev.redos, current],
        // Remove the newest undo
        undos: prev.undos.slice(0, -1),
      };
    });
  }, [evaluateRulesHelper]);

  const redoLastAction = useCallback(() => {
    const current = elementStatesRef.current.slice();
    setElementStatesUndoRedo((prev) => {
      if (prev.redos.length === 0) {
        return prev;
      }
      // Update the current state to the latest redo
      elementStatesRef.current = prev.redos.slice(-1)[0];
      // Trigger a rule evaluation and refresh canvas
      // TODO Async?
      evaluateRulesHelper()
        .then(() => {
          setRefreshCanvas((prev) => prev + 1);
        })
        .catch(console.error);
      return {
        ...prev,
        // Add current state to undos
        undos: [...prev.undos, current],
        // Remove the newest redo
        redos: prev.redos.slice(0, -1),
      };
    });
  }, [evaluateRulesHelper]);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible((prev) => !prev);
  }, []);

  // SideMenu: Values

  const buttonsSideMenu = useMemo<SideMenuButtonProps[]>(() => {
    const buttons: SideMenuButtonProps[] = [
      {
        alt: t("buttons.openMenu"),
        iconUrl: iconMaterialMenu,
        onClick: toggleOverlay,
        badge: currentRuleSet ?? undefined,
      },
      {
        alt: t("buttons.home"),
        iconUrl: iconMaterialHome,
        onClick: onResetSates,
      },
    ];
    if (isFullscreen) {
      buttons.push({
        alt: t("buttons.exitFullscreen"),
        iconUrl: iconMaterialFullscreenExit,
        onClick: toggleFullscreen,
      });
    } else {
      buttons.push({
        alt: t("buttons.enterFullscreen"),
        iconUrl: iconMaterialFullscreen,
        onClick: toggleFullscreen,
      });
    }
    if (elementStatesUndoRedo.undos.length > 0) {
      buttons.push({
        alt: t("buttons.undo"),
        iconUrl: iconMaterialUndo,
        onClick: undoLastAction,
        badge:
          elementStatesUndoRedo.undos.length > 1
            ? elementStatesUndoRedo.undos.length
            : undefined,
      });
    }
    if (elementStatesUndoRedo.redos.length > 0) {
      buttons.push({
        alt: t("buttons.redo"),
        iconUrl: iconMaterialRedo,
        onClick: redoLastAction,
        badge:
          elementStatesUndoRedo.redos.length > 1
            ? elementStatesUndoRedo.redos.length
            : undefined,
      });
    }
    return buttons;
  }, [
    t,
    toggleOverlay,
    currentRuleSet,
    onResetSates,
    isFullscreen,
    elementStatesUndoRedo.undos.length,
    elementStatesUndoRedo.redos.length,
    toggleFullscreen,
    undoLastAction,
    redoLastAction,
  ]);

  // Overlay: Callbacks

  const onRulesetChange = useCallback(
    (ruleSet: string | null) => {
      console.debug("Change rule set to ", ruleSet);
      const ruleSetObj = spielZettelData?.dataJSON.ruleSets?.find(
        (a) => a.name === ruleSet,
      );
      if (ruleSet) {
        setRuleSet(null);
        ruleSetRef.current = null;
      }
      if (ruleSet === undefined) {
        showToastError(Error("Selected rule set was not found!"));
        setRuleSet(null);
        ruleSetRef.current = null;
      }
      setRuleSet(ruleSet);
      ruleSetRef.current = ruleSetObj ?? null;
    },
    [showToastError, spielZettelData?.dataJSON.ruleSets],
  );

  const onShareScreenshot = useCallback(
    async (copyToClipboard = false) => {
      if (
        spielZettelData === null ||
        image === null ||
        !canvasRef.current ||
        currentName === null
      ) {
        return;
      }

      const croppedCanvas = document.createElement("canvas");
      const ctx = croppedCanvas.getContext("2d");
      if (ctx === null) {
        throw Error("Cropped canvas null");
      }

      croppedCanvas.width = image.width;
      croppedCanvas.height = image.height;
      render(
        croppedCanvas,
        ctx,
        image,
        spielZettelData.dataJSON.elements,
        elementStatesRef,
        false,
        true,
        false,
        debugRef.current,
      );

      // Change image type to JPG in case the image gets really big so it can still be shared via e.g. Discord
      const { dataUrl, ext, mimeType } = await getCanvasImageBase64(
        croppedCanvas,
        (canvas, ctx) =>
          Promise.resolve(
            render(
              canvas,
              ctx,
              image,
              spielZettelData.dataJSON.elements,
              elementStatesRef,
              false,
              true,
              false,
              debugRef.current,
            ),
          ),
        {
          mimeType: copyToClipboard ? "image/png" : undefined,
        },
        {
          // Discord max file size
          maxFileSizeMB: 10,
          beforeResizingTryJPEG: !copyToClipboard,
          // 0.92 is initial JPEG format
          beforeResizingLowestQuality: 0.3,
        },
      );

      const nameScreenshot = t("title.screenshot", {
        name,
        version,
        spielZettelName: currentName,
      });
      const fileName = `${nameScreenshot}.${ext}`;

      const file = await createImageFileFromBase64(dataUrl, fileName, mimeType);

      if (copyToClipboard) {
        const addedToClipboard = await addFileToClipboard(file);
        if (!addedToClipboard) {
          throw Error(
            "Adding file to clipboard (navigator.clipboard) is not supported",
          );
        }
      } else {
        await shareOrDownloadFile(file, dataUrl, fileName, nameScreenshot);
      }
    },
    [currentName, image, spielZettelData, t],
  );

  // Overlay: Values

  const elementsOverlay = useMemo<OverlayElementProps[]>(() => {
    const ruleSets: SpielZettelRuleSet[] = [];
    if (spielZettelData !== null && spielZettelData.dataJSON.ruleSets) {
      ruleSets.push(...spielZettelData.dataJSON.ruleSets);
    }
    const savesElement: OverlayElementProps[] = [];
    const currentSavesSpielZettel =
      spielZettelData !== null
        ? currentSaves.filter(
            ({ save }) => save.spielZettelKey === spielZettelData.dataJSON.name,
          )
        : [];
    if (currentSavesSpielZettel.length > 1 && spielZettelData !== null) {
      savesElement.push({
        id: "saves",
        type: "select",
        currentValue: currentSave ?? undefined,
        onChange: (ev) => {
          setCurrentSave(ev.target.value);
          setOverlayVisible(false);
        },
        options: currentSavesSpielZettel.map((save) => ({
          text: t("buttons.useSave", { name: save.id }),
          value: save.id,
        })),
      });
      savesElement.push({
        id: "clear_saves",
        type: "button",
        text: t("buttons.clearSaves"),
        iconUrl: iconMaterialDeleteSweep,
        onClick: () => {
          removeSaves(spielZettelData.dataJSON.name)
            .then(() => {
              // Bad solution but it works for now
              setCurrentSaves([]);
              if (currentSave !== null) {
                // Add current save
                return addSave(
                  currentSave,
                  spielZettelData.dataJSON.name,
                  elementStatesRef.current ?? [],
                  ruleSetRef.current?.name ?? undefined,
                ).then(() => {
                  setCurrentSave(currentSave);
                });
              }
            })
            .catch(showToastError);
        },
      });
    }
    const ruleSetElement: OverlayElementProps[] = [];
    if (ruleSets.length > 0) {
      ruleSetElement.push({
        id: "ruleSets",
        type: "select",
        currentValue: currentRuleSet ?? "none",
        onChange: (ev) => {
          if (ev.target.value === "none") {
            onRulesetChange(null);
            setOverlayVisible(false);
            return;
          }
          const ruleSet = ev.target.value;
          openPopupDialog(
            "confirm",
            t("messages.confirmEnableRuleSetWarning", {
              ruleSet,
              name,
            }) +
              " " +
              t("messages.confirmAreYouSure"),
            undefined,
            undefined,
            undefined,
            () => {
              onRulesetChange(ruleSet);

              setOverlayVisible(false);
              return Promise.resolve();
            },
          );
        },
        options: [
          {
            text: t("buttons.disableRuleSets"),
            value: "none",
          },
          ...ruleSets.map((ruleSet) => ({
            text: t("buttons.useRuleSet", { name: ruleSet.name }),
            value: ruleSet.name,
          })),
        ],
      });
    }
    const resElements: OverlayElementProps[] = [];
    const resourceElements = spielZettelData?.dataJSON.res ?? [];
    if (resourceElements) {
      const resourceLinks = resourceElements.filter((a) => "url" in a);
      for (const { name, url } of resourceLinks) {
        resElements.push({
          id: `resourceLink${name}`,
          type: "button",
          text: name,
          iconUrl: iconMaterialLink,
          onClick: () => window.open(url, "_blank"),
        });
      }
      const resourceFiles = resourceElements.filter((a) => "fileName" in a);
      for (const { name, fileName, fileData, fileMimeType } of resourceFiles) {
        resElements.push({
          id: `resourceFile${name}`,
          type: "button",
          text: name,
          iconUrl: iconMaterialDownload,
          onClick: () => {
            const blob = new Blob(
              [Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0))],
              { type: fileMimeType },
            );
            const fileObjectUrl = URL.createObjectURL(blob);
            downloadFile(fileObjectUrl, fileName);
          },
        });
      }
    }
    const debugElements: OverlayElementProps[] = [];
    if (debug) {
      debugElements.push(
        {
          id: "debugNotificationFallback",
          type: "button",
          text: "[DEBUG] Notification + Fallback",
          onClick: () => {
            createNotificationServiceWorkerOrFallback("Test").catch((err) =>
              window.alert(
                `Error creating notification: ${(err as Error).message}`,
              ),
            );
          },
        },
        {
          id: "debugNotification",
          type: "button",
          text: "[DEBUG] Notification",
          onClick: () => {
            createNotification("Test").catch((err) =>
              window.alert(
                `Error creating notification: ${(err as Error).message}`,
              ),
            );
          },
        },
        {
          id: "debugNotificationSw",
          type: "button",
          text: "[DEBUG] Notification Service Worker",
          onClick: () => {
            createNotificationServiceWorker("Test").catch((err) =>
              window.alert(
                `Error creating notification via service worker: ${(err as Error).message}`,
              ),
            );
          },
        },
        {
          id: "debugToast",
          type: "button",
          text: "[DEBUG] Toast",
          onClick: () => {
            showToast("Test default");
            toast("Test forever", {
              position: "bottom-left",
              autoClose: false,
            });
            toast.info("Test long", {
              position: "bottom-left",
              autoClose: 1000000,
            });
            toast.warn("Test long [warn]", {
              position: "bottom-left",
              autoClose: 1000000,
            });
            toast.error("Test forever [error]", {
              position: "bottom-left",
              autoClose: 1000000,
            });
          },
        },
        {
          id: "debugDisplayInformation",
          type: "button",
          text: "[DEBUG] Display Info",
          onClick: () => {
            const canvas = canvasRef.current;
            if (canvas === null) {
              window.alert("No canvas");
              return;
            }
            const rect = canvas.getBoundingClientRect();
            window.alert(
              JSON.stringify({
                canvasSize: { width: canvas.width, height: canvas.height },
                windowSize: {
                  width: window.innerWidth,
                  height: window.innerHeight,
                },
                screenSize: {
                  width: window.screen.width,
                  height: window.screen.height,
                },
                rectSize: { width: rect.width, height: rect.height },
                pixelRatio: window.devicePixelRatio,
              }),
            );
          },
        },
        /*
        {
          id: "debugLanguageInformation",
          type: "button",
          text: "[DEBUG] Language Info",
          onClick: () => {
            window.alert(JSON.stringify(localeDebugInfo));
          },
        },
        */
        {
          id: "debugSwInformation",
          type: "button",
          text: "[DEBUG] Service Worker Info",
          onClick: () => {
            window.alert(
              JSON.stringify({
                registeredWorkboxSw,
                registeredNotificationsSw,
                workboxServiceWorkerUrl,
                notificationsServiceWorkerUrl,
              }),
            );
          },
        },
        {
          id: "debugPopupDialogAlert",
          type: "button",
          text: "[DEBUG] Popup Dialog Alert",
          onClick: () => {
            openPopupDialog(
              "alert",
              "Test",
              undefined,
              undefined,
              undefined,
              () => {
                window.alert("Confirmed");
                return Promise.resolve();
              },
            );
          },
        },
        {
          id: "debugPopupDialogConfirm",
          type: "button",
          text: "[DEBUG] Popup Dialog Confirm",
          onClick: () => {
            openPopupDialog(
              "confirm",
              "Test",
              "Placeholder",
              undefined,
              undefined,
              () => {
                window.alert("Confirmed");
                return Promise.resolve();
              },
              () => {
                window.alert("Cancel");
                return Promise.resolve();
              },
            );
          },
        },
        {
          id: "debugPopupDialogText",
          type: "button",
          text: "[DEBUG] Popup Dialog Text",
          onClick: () => {
            openPopupDialog(
              "text",
              "Test",
              "Placeholder",
              undefined,
              undefined,
              (value) => {
                window.alert(`Confirmed: ${value} (${typeof value})`);
                return Promise.resolve();
              },
              () => {
                window.alert("Cancel");
                return Promise.resolve();
              },
            );
          },
        },
        {
          id: "debugPopupDialogNumber",
          type: "button",
          text: "[DEBUG] Popup Dialog Number",
          onClick: () => {
            openPopupDialog(
              "number",
              "Test",
              "Placeholder",
              undefined,
              undefined,
              (value) => {
                window.alert(`Confirmed: ${value} (${typeof value})`);
                return Promise.resolve();
              },
              () => {
                window.alert("Cancel");
                return Promise.resolve();
              },
            );
          },
        },
        {
          id: "debugPopupDialogNumberOptions",
          type: "button",
          text: "[DEBUG] Popup Dialog Number Options",
          onClick: () => {
            openPopupDialog(
              "number",
              "Test",
              "Placeholder",
              [-5, 42],
              undefined,
              (value) => {
                window.alert(`Confirmed: ${value} (${typeof value})`);
                return Promise.resolve();
              },
              () => {
                window.alert("Cancel");
                return Promise.resolve();
              },
            );
          },
        },
        {
          id: "debugPopupDialogOptions",
          type: "button",
          text: "[DEBUG] Popup Dialog Options",
          onClick: () => {
            openPopupDialog(
              "options",
              "Test",
              "Placeholder",
              ["X", "O"],
              undefined,
              (value) => {
                window.alert(`Confirmed: ${value} (${typeof value})`);
                return Promise.resolve();
              },
              () => {
                window.alert("Cancel");
                return Promise.resolve();
              },
            );
          },
        },
        {
          id: "debugThemeColor",
          type: "select",
          currentValue: "none",
          onChange: (ev) => {
            console.debug("debugThemeColor", ev.target.value);
            if (ev.target.value === "none") {
              return;
            }
            const previousThemeColor = getThemeColor();
            if (ev.target.value === "reset") {
              resetThemeColor();
            } else {
              changeThemeColor(ev.target.value);
            }
            window.alert(
              JSON.stringify({
                previousThemeColor,
                currentThemeColor: getThemeColor(),
              }),
            );
          },
          options: [
            {
              text: "[DEBUG] Change theme color",
              value: "none",
            },
            {
              text: "Reset theme color",
              value: "reset",
            },
            {
              text: "Black",
              value: "#000000",
            },
            {
              text: "White",
              value: "#ffffff",
            },
            {
              text: "Red",
              value: "#ff0000",
            },
          ],
        },
      );
    }
    return [
      {
        id: "back",
        iconUrl: iconMaterialBack,
        type: "button",
        text: t("buttons.back"),
        onClick: () => {
          setOverlayVisible(false);
        },
      },
      {
        id: "clear",
        iconUrl: iconMaterialClose,
        type: "button",
        text: t("buttons.clear"),
        onClick: () => {
          onClear();
          setOverlayVisible(false);
        },
      },
      {
        id: "screenshot",
        iconUrl: iconMaterialShare,
        type: "button",
        text: t("buttons.shareScreenshot"),
        onClick: () => {
          onShareScreenshot().catch(showToastError);
          setOverlayVisible(false);
        },
      },
      {
        id: "screenshot_clipboard",
        iconUrl: iconMaterialClipboard,
        type: "button",
        text: t("buttons.copyScreenshotToClipboard"),
        onClick: () => {
          onShareScreenshot(true).catch(showToastError);
          setOverlayVisible(false);
        },
      },
      ...ruleSetElement,
      ...savesElement,
      {
        id: "mirror",
        iconUrl: iconMaterialSwapHorizontal,
        type: "button",
        text: t("buttons.mirrorSideMenu"),
        onClick: () => {
          setSideMenuPosition((prev) =>
            prev === "top-left" ? "top-right" : "top-left",
          );
        },
      },
      ...resElements,
      {
        id: "debug",
        type: "button",
        text: t("buttons.toggleDebug", {
          value: (debug
            ? t("buttons.on")
            : t("buttons.off")
          ).toLocaleUpperCase(),
        }),
        onClick: () => {
          setDebug((prev) => !prev);
        },
      },
      ...debugElements,
    ];
  }, [
    addSave,
    currentRuleSet,
    currentSave,
    currentSaves,
    debug,
    onClear,
    onRulesetChange,
    onShareScreenshot,
    openPopupDialog,
    registeredNotificationsSw,
    registeredWorkboxSw,
    removeSaves,
    showToast,
    showToastError,
    spielZettelData,
    t,
  ]);

  // TODO Add support for tabIndex in canvas by preventing default and using a custom tabIndex state

  return (
    <div className={styles.container}>
      {/* Main Menu if no SpielZettel is open */}
      {spielZettelData === null && (
        <MainMenu
          updateSpielZettelDataList={refreshMainMenu}
          setUpdateSpielZettelDataList={setRefreshMainMenu}
          onFileUpload={onFileUpload}
          onError={showToastError}
          onReset={onReset}
          getSpielZettelDataList={getAllSpielZettel}
          setSpielZettelData={setSpielZettelData}
          deleteSpielZettel={deleteSpielZettel}
          spielZettelData={spielZettelData}
          loadingMessages={loadingMessages}
          setLoadingMessages={setLoadingMessages}
        />
      )}

      {/* Side menu */}
      <SideMenu
        visible={spielZettelData !== null}
        buttons={buttonsSideMenu}
        position={sideMenuPosition}
      />

      {/* Overlay with controls if SpielZettel is open and enabled */}
      {spielZettelData && (
        <Overlay
          visible={overlayVisible}
          setVisible={setOverlayVisible}
          elements={elementsOverlay}
        />
      )}

      {/* Canvas if SpielZettel is open */}
      {spielZettelData !== null && (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClickWrapper}
        ></canvas>
      )}

      {popupDialogElement}
      <ToastContainer />
    </div>
  );
}
