"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast, ToastContainer } from "react-toastify";

import { defaultLocale } from "../../i18n/i18n";
import {
  changeThemeColor,
  getThemeColor,
  resetThemeColor,
} from "../helper/changeThemeColor";
import {
  createNotification,
  createNotificationServiceWorker,
  createNotificationServiceWorkerOrFallback,
} from "../helper/createNotification";
import { debugLogDraw, debugLogUseEffectChanged } from "../helper/debugLogs";
import type { SpielZettelElementState } from "../helper/evaluateRule";
import {
  areSpielZettelStatesDifferent,
  evaluateRules,
} from "../helper/evaluateRule";
import { handleInputs } from "../helper/handleInputs";
import {
  fileExtension,
  name,
  notificationsServiceWorkerUrl,
  version,
  workboxServiceWorkerUrl,
} from "../helper/info";
import type {
  SpielZettelFileData,
  SpielZettelRuleSet,
} from "../helper/readFile";
import { getVersionString, readSpielZettelFile } from "../helper/readFile";
import type { DebugInformation } from "../helper/render";
import { render } from "../helper/render";
import { checkForNewVersion } from "../helper/serviceWorkerUtils";
import { shareOrDownloadFile } from "../helper/shareFile";
import useDarkMode from "../hooks/useDarkMode";
import useFullScreen from "../hooks/useFullscreen";
import type { SaveEntry } from "../hooks/useIndexedDb";
import useIndexedDB from "../hooks/useIndexedDb";
import { LocaleDebugInfo } from "../hooks/useLocale";
import usePopupDialog from "../hooks/usePopupDialog";
import useServiceWorker from "../hooks/useServiceWorker";
import useTranslationWrapper from "../hooks/useTranslationWrapper";

import type { OverlayElements } from "./dialogs/Overlay";
import Overlay from "./dialogs/Overlay";
import LocaleUpdater from "./language/LocaleUpdater";
import MainMenu from "./menus/MainMenu";
import type { SideMenuButton } from "./menus/SideMenu";
import SideMenu from "./menus/SideMenu";

import "react-toastify/dist/ReactToastify.css";
import styles from "./InteractiveCanvas.module.css";

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
  const [elementStatesBackup, setElementStatesBackup] = useState<
    SpielZettelElementState[][]
  >([]);
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
  const [sideMenuPosition, setSideMenuPosition] = useState<"left" | "right">(
    "right",
  );
  /** Store the current saves for the overlay */
  const [currentSaves, setCurrentSaves] = useState<SaveEntry[]>([]);
  /** Trigger an additional refresh of the main menu in case of changes in the database */
  const [refreshMainMenu, setRefreshMainMenu] = useState(false);
  const [antiAliasing, setAntiAliasing] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [localeDebugInfo, setLocaleDebugInfo] = useState<LocaleDebugInfo>({
    defaultLocale,
  });

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
    toast.info(message, {
      position: "bottom-left",
      autoClose: 5000,
    });
  }, []);

  const showToastError = useCallback((error: Error) => {
    console.error(error);
    toast.error(error.message, {
      position: "bottom-left",
      autoClose: 5000,
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
  const { popupDialogElement, openPopupDialog } = usePopupDialog();
  const { translate } = useTranslationWrapper();
  /* Update text depending on the locale */
  const onServiceWorkerRegisterText = useRef<string>(
    translate("messages.newVersionAvailable"),
  );
  const registeredWorkboxSw = useServiceWorker(
    workboxServiceWorkerUrl,
    undefined,
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
    showToastError,
  );
  const registeredNotificationsSw = useServiceWorker(
    notificationsServiceWorkerUrl,
    "./notifications/",
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
        translate("messages.confirmDelete", { name, id }) +
          " " +
          translate("messages.confirmAreYouSure"),
        undefined,
        undefined,
        async () => {
          await removeSpielZettel(id);
          setRefreshMainMenu(true);
        },
      );
    },
    [openPopupDialog, removeSpielZettel, translate],
  );

  const onDisabled = useCallback(() => {
    console.debug("onDisabled");
    openPopupDialog(
      "alert",
      translate("messages.alertUnableToEdit"),
      undefined,
      [
        {
          title: translate("messages.disableCurrentRuleSet"),
          onClick: () => {
            setRuleSet(null);
            return Promise.resolve();
          },
        },
      ],
    );
  }, [openPopupDialog, translate]);

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
      antiAliasing,
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
  }, [antiAliasing, debug, image, spielZettelData]);

  const disableRulesetAfterError = useCallback(
    (error: Error) => {
      openPopupDialog(
        "confirm",
        translate("messages.confirmDisableRulesetErrorEvaluateRules", {
          errorMessage: error.message,
          errorCause: (error.cause as Error | undefined)?.message ?? "none",
        }),
        undefined,
        undefined,
        () => {
          setRuleSet(null);
          return Promise.resolve();
        },
      );
    },
    [openPopupDialog, translate],
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
                translate("messages.enterNumber"),
                typeof elementState.value === "string" ||
                  typeof elementState.value === "number"
                  ? `${elementState.value}`
                  : undefined,
                elementState.value !== undefined
                  ? [
                      {
                        title: translate("buttons.clear"),
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
                "number",
                translate("messages.enterText"),
                typeof elementState.value === "string" ||
                  typeof elementState.value === "number"
                  ? `${elementState.value}`
                  : undefined,
                elementState.value !== undefined
                  ? [
                      {
                        title: translate("buttons.clear"),
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
        setElementStatesBackup((prev) => {
          if (
            !areSpielZettelStatesDifferent(
              elementStatesRef.current,
              statesBackup,
            )
          ) {
            // If no change is detected do not add a states backup
            return prev;
          }
          return [...prev, statesBackup].slice(-100);
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
      translate,
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

  const getLastScoreAndSpielZettel = useCallback(async () => {
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
    if (spielZettelData === null) return;
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
    showToast(translate("messages.createNewSave", { name: newSaveId }));
    await addSave(
      newSaveId,
      spielZettelData.dataJSON.name,
      [],
      ruleSetRef.current?.name ?? undefined,
    );
    setCurrentSave(newSaveId);
  }, [addSave, showToast, spielZettelData, translate]);

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
      translate("messages.confirmDeleteAll") +
        " " +
        translate("messages.confirmAreYouSure"),
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
  }, [onResetSates, openPopupDialog, resetDB, showToastError, translate]);

  const evaluateRulesHelper = useCallback(() => {
    // Remove all previous disabled states
    for (const state of elementStatesRef.current) {
      delete state.disabled;
    }
    // Evaluate rules
    if (ruleSetRef.current && spielZettelData) {
      console.debug("evaluate rules helper");
      try {
        const [, info] = evaluateRules(
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

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, ["translate", translate]);
    // Update service worker new version text
    onServiceWorkerRegisterText.current = translate(
      "messages.newVersionAvailable",
    );
  }, [translate]);

  useEffect(() => {
    console.debug("USE EFFECT: [InteractiveCanvas] Loaded");
    // Necessary to detect suspense load
    setRefreshCanvas((prev) => prev + 1);
  }, []);

  useEffect(() => {
    console.debug("USE EFFECT: [InteractiveCanvas] Initialize canvas");
    getLastScoreAndSpielZettel().catch(showToastError);
  }, [getLastScoreAndSpielZettel, showToastError]);

  useEffect(() => {
    console.debug("USE EFFECT: [InteractiveCanvas] Register dpr listener");

    const mediaQueryList = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        console.debug(
          "EVENT LISTENER: [InteractiveCanvas] dpr changed",
          window.devicePixelRatio,
        );
      }
    };
    mediaQueryList.addEventListener("change", onMediaQueryChange);
    return () => {
      mediaQueryList.removeEventListener("change", onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    console.debug("USE EFFECT: [InteractiveCanvas] Register keydown listener");

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "d" && spielZettelData) {
        console.debug("EVENT LISTENER: [InteractiveCanvas] d key pressed");
        setDebug((prev) => !prev);
      }
      if (event.key === "a" && spielZettelData) {
        console.debug("EVENT LISTENER: [InteractiveCanvas] a key pressed");
        setAntiAliasing((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, [spielZettelData]);

  // PWA: Open file
  useEffect(() => {
    if ("launchQueue" in window) {
      window.launchQueue.setConsumer((launchParams) => {
        if (!launchParams.files.length) return;
        Promise.all(
          launchParams.files.map(async (fileHandle) => {
            if (isFileHandle(fileHandle)) {
              const uploadedFile = await fileHandle.getFile();
              console.debug("File received (launch queue):", uploadedFile);
              if (uploadedFile.name.endsWith(fileExtension)) {
                setFile(uploadedFile);
              } else {
                openPopupDialog(
                  "alert",
                  translate("messages.alertErrorUnsupportedFile", {
                    name: uploadedFile.name,
                    fileExtension,
                  }),
                  undefined,
                  undefined,
                  () => Promise.resolve(),
                );
              }
            }
          }),
        ).catch(showToastError);
      });
    }
  }, [openPopupDialog, showToastError, translate]);

  useEffect(() => {
    console.debug(
      "USE EFFECT: Change in spielZettelData and isDarkMode",
      spielZettelData,
      isDarkMode,
    );
    if (spielZettelData === null) {
      // In main menu: set to the background color
      changeThemeColor(isDarkMode ? "#000000" : "#f1f1f1");
    } else {
      // Viewing SpielZettel: set to the background color
      changeThemeColor(isDarkMode ? "#000000" : "#f1f1f1");
    }
  }, [spielZettelData, isDarkMode]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in spielZettelData", spielZettelData);
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
      showToast(translate("messages.noCurrentSaveFound"));
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
    translate,
  ]);

  useEffect(() => {
    if (file !== null) {
      const loadMessage = translate("messages.reading", { name });
      setLoadingMessages((prev) => [
        ...prev.filter((a) => a !== loadMessage),
        loadMessage,
      ]);
      readSpielZettelFile(file)
        .then((data) => {
          setLoadingMessages((prev) => [
            ...prev.filter((a) => a !== loadMessage),
          ]);
          setSpielZettelData(data);
        })
        .catch(showToastError);
    }
  }, [file, showToastError, translate]);

  useEffect(() => {
    if (currentName === null) return;
    // > Document title
    document.title = translate("title.websiteCanvas", {
      name,
      spielZettelName: currentName,
    });
  }, [currentName, translate]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in currentSave", currentSave);
    if (currentSave === null) return;
    getSave(currentSave)
      .then((saveEntry) => {
        console.info(
          "Load save",
          currentSave,
          saveEntry,
          saveEntry?.save?.states ?? [],
        );
        if (!saveEntry) return;
        showToast(
          translate("messages.loadSave", {
            name: saveEntry.id,
            ruleSet: saveEntry.save.ruleSet ?? "none",
          }),
        );
        elementStatesRef.current = saveEntry.save.states ?? [];
        // Reset state backups
        setElementStatesBackup([]);
        // Automatically set ruleSet if it was set before
        setRuleSet(saveEntry.save.ruleSet ?? null);
        // Update canvas with the changes of the save
        setRefreshCanvas((prev) => prev + 1);
      })
      .catch(showToastError);
    // Update last save with the current save
    setLastSave(currentSave).catch(showToastError);
  }, [currentSave, getSave, setLastSave, showToast, showToastError, translate]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in image", image);
    if (image === null) return;
    // Update canvas with the image changes
    setRefreshCanvas((prev) => prev + 1);
  }, [image]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in refreshCanvas", refreshCanvas);
    // Refresh canvas
    drawCanvas();
    debugRef.current.drawCall = refreshCanvas;
  }, [drawCanvas, refreshCanvas]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in currentRuleSet", currentRuleSet);
    if (spielZettelData === null) return;
    ruleSetRef.current = spielZettelData.dataJSON.ruleSets
      ? (spielZettelData.dataJSON.ruleSets.find(
          (a) => a.name === currentRuleSet,
        ) ?? null)
      : null;
    evaluateRulesHelper();
    // Update canvas with the new state changes after evaluating the rules of the rule set
    setRefreshCanvas((prev) => prev + 1);
    // Update save with the currentRuleSet if a current save exists
    if (currentSave === null) return;
    addSave(
      currentSave,
      spielZettelData.dataJSON.name,
      elementStatesRef.current ?? [],
      currentRuleSet ?? undefined,
    ).catch(showToastError);
  }, [
    image,
    currentRuleSet,
    spielZettelData,
    addSave,
    currentSave,
    debug,
    openPopupDialog,
    evaluateRulesHelper,
    showToastError,
  ]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in overlay visibility", overlayVisible);
    if (!overlayVisible) return;
    getAllSaves()
      .then((saves) => {
        setCurrentSaves(saves);
      })
      .catch(showToastError);
  }, [getAllSaves, overlayVisible, showToastError]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in debug", debug);
    // Update canvas with/without debug overlay
    setRefreshCanvas((prev) => prev + 1);
  }, [debug]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in antiAliasing", antiAliasing);
    // Update canvas with/without anti aliasing
    setRefreshCanvas((prev) => prev + 1);
  }, [antiAliasing]);

  useEffect(() => {
    console.debug(
      "USE EFFECT: Register event listener listener for canvas size changes",
    );

    const resizeCanvas = (ev: UIEvent) => {
      console.debug("EVENT LISTENER: Canvas resized", ev);
      // Update canvas with new size
      setRefreshCanvas((prev) => prev + 1);
    };
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [spielZettelData]);

  // MainMenu:
  // > Callbacks

  const onFileUpload = useCallback(
    (files: FileList) => {
      if (files.length === 1) {
        console.info("File received (upload):", files[0]);
        setFile(files[0]);
      }
      if (files.length > 0) {
        console.info("Files received (upload):", files);
        const loadMessage = `Read ${files.length} uploaded SpielZettel...`;
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
          .then(() => {
            setLoadingMessages((prev) => [
              ...prev.filter((a) => a !== loadMessage),
            ]);
            setRefreshMainMenu(true);
          })
          .catch(showToastError);
      }
    },
    [addSpielZettel, showToastError],
  );

  const getSpielZettelDataList = useCallback(async () => {
    console.debug("getSpielZettelDataList", refreshMainMenu);
    return getAllSpielZettel();
  }, [getAllSpielZettel, refreshMainMenu]);

  // SideMenu: Callbacks

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen().catch(showToastError);
    } else {
      document.exitFullscreen().catch(showToastError);
    }
  }, [showToastError]);

  const undoLastAction = useCallback(() => {
    setElementStatesBackup((prev) => {
      if (prev.length > 0) {
        elementStatesRef.current = prev.slice(-1)[0];
        evaluateRulesHelper();
      }
      return prev.slice(0, -1);
    });
    setRefreshCanvas((prev) => prev + 1);
  }, [evaluateRulesHelper]);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible((prev) => !prev);
  }, []);

  // SideMenu: Values

  const buttonsSideMenu = useMemo<SideMenuButton[]>(() => {
    const buttons: SideMenuButton[] = [
      {
        alt: "Open menu",
        iconUrl:
          "icons/material/menu_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        onClick: toggleOverlay,
        badge: currentRuleSet ?? undefined,
      },
    ];
    if (isFullscreen) {
      buttons.push({
        alt: "Exit fullscreen",
        iconUrl:
          "icons/material/fullscreen_exit_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        onClick: toggleFullscreen,
      });
    } else {
      buttons.push({
        alt: "Enter fullscreen",
        iconUrl:
          "icons/material/fullscreen_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        onClick: toggleFullscreen,
      });
    }
    if (elementStatesBackup.length > 0) {
      buttons.push({
        alt: "Undo",
        iconUrl:
          "icons/material/undo_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        onClick: undoLastAction,
        badge:
          elementStatesBackup.length > 1
            ? elementStatesBackup.length
            : undefined,
      });
    }
    return buttons;
  }, [
    toggleOverlay,
    currentRuleSet,
    isFullscreen,
    elementStatesBackup.length,
    toggleFullscreen,
    undoLastAction,
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

  const onShareScreenshot = useCallback(async () => {
    if (spielZettelData === null || !canvasRef.current) return;

    // Capture the canvas content as a Base64 string
    const imageType = "image/png";
    const dataUrl = canvasRef.current.toDataURL(imageType);

    // Convert the Base64 string to a file
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const nameScreenshot = translate("title.screenshot", {
      name,
      version,
      spielZettelName: currentName,
    });
    const fileName = `${nameScreenshot}.png`;
    const file = new File([blob], fileName, { type: imageType });

    await shareOrDownloadFile(file, dataUrl, fileName, nameScreenshot);
  }, [currentName, spielZettelData, translate]);

  // Overlay: Values

  const elementsOverlay = useMemo<OverlayElements[]>(() => {
    const ruleSets: SpielZettelRuleSet[] = [];
    if (spielZettelData !== null && spielZettelData.dataJSON.ruleSets) {
      ruleSets.push(...spielZettelData.dataJSON.ruleSets);
    }
    const savesElement: OverlayElements[] = [];
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
        onChange: (ev) => setCurrentSave(ev.target.value),
        options: currentSavesSpielZettel.map((save) => ({
          text: translate("buttons.loadSave", { name: save.id }),
          value: save.id,
        })),
      });
      savesElement.push({
        id: "clear_saves",
        type: "button",
        text: translate("buttons.clearSaves"),
        iconUrl:
          "./icons/material/delete_sweep_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
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
    const ruleSetElement: OverlayElements[] = [];
    if (ruleSets.length > 0) {
      ruleSetElement.push({
        id: "ruleSets",
        type: "select",
        currentValue: currentRuleSet ?? "none",
        onChange: (ev) => {
          if (ev.target.value === "none") {
            onRulesetChange(null);
            return;
          }
          const ruleSet = ev.target.value;
          openPopupDialog(
            "confirm",
            translate("messages.confirmEnableRuleSetWarning", {
              ruleSet,
              name,
            }) +
              " " +
              translate("messages.confirmAreYouSure"),
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
            text: translate("buttons.disableRuleSets"),
            value: "none",
          },
          ...ruleSets.map((ruleSet) => ({
            text: translate("buttons.enableRuleSet", { name: ruleSet.name }),
            value: ruleSet.name,
          })),
        ],
      });
    }
    const debugElements: OverlayElements[] = [];
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
        {
          id: "debugLanguageInformation",
          type: "button",
          text: "[DEBUG] Language Info",
          onClick: () => {
            window.alert(JSON.stringify(localeDebugInfo));
          },
        },
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
            openPopupDialog("alert", "Test", undefined, undefined, () => {
              window.alert("Confirmed");
              return Promise.resolve();
            });
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
        iconUrl:
          "./icons/material/arrow_back_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        type: "button",
        text: translate("buttons.back"),
        onClick: () => {
          setOverlayVisible(false);
        },
      },
      {
        id: "home",
        iconUrl:
          "./icons/material/home_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        type: "button",
        text: translate("buttons.home"),
        onClick: () => {
          onResetSates();
          setOverlayVisible(false);
        },
      },
      {
        id: "clear",
        iconUrl:
          "./icons/material/close_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        type: "button",
        text: translate("buttons.clear"),
        onClick: () => {
          onClear();
          setOverlayVisible(false);
        },
      },
      {
        id: "screenshot",
        iconUrl:
          "./icons/material/share_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        type: "button",
        text: translate("buttons.shareScreenshot"),
        onClick: () => {
          onShareScreenshot().catch(showToastError);
          setOverlayVisible(false);
        },
      },
      ...ruleSetElement,
      ...savesElement,
      {
        id: "mirror",
        iconUrl:
          "./icons/material/swap_horiz_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        type: "button",
        text: translate("buttons.mirrorSideMenu"),
        onClick: () => {
          setSideMenuPosition((prev) => (prev === "left" ? "right" : "left"));
        },
      },
      {
        id: "debug",
        type: "button",
        text: translate("buttons.toggleDebug", {
          value: (debug
            ? translate("buttons.on")
            : translate("buttons.off")
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
    localeDebugInfo,
    onClear,
    onResetSates,
    onRulesetChange,
    onShareScreenshot,
    openPopupDialog,
    registeredNotificationsSw,
    registeredWorkboxSw,
    removeSaves,
    showToast,
    showToastError,
    spielZettelData,
    translate,
  ]);

  // TODO Add support for tabIndex in canvas by preventing default and using a custom tabIndex state

  return (
    <div className={styles.container}>
      {/* Debug locale info */}
      <Suspense>
        <LocaleUpdater setLocaleDebugInfo={setLocaleDebugInfo} />
      </Suspense>
      {/* Main Menu if no SpielZettel is open */}
      {spielZettelData === null && (
        <MainMenu
          updateSpielZettelDataList={refreshMainMenu}
          setUpdateSpielZettelDataList={setRefreshMainMenu}
          onFileUpload={onFileUpload}
          onError={showToastError}
          onReset={onReset}
          getSpielZettelDataList={getSpielZettelDataList}
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
