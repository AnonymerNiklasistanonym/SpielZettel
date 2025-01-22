"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createNotification } from "../helper/createNotification";
import {
  evaluateRules,
  type SpielZettelElementState,
} from "../helper/evaluateRule";
import { handleInputs } from "../helper/handleInputs";
import { name, workboxServiceWorkerUrl } from "../helper/info";
import type {
  SpielZettelFileData,
  SpielZettelRuleSet,
} from "../helper/readFile";
import { getVersionString, readSpielZettelFile } from "../helper/readFile";
import { DebugInformation, render } from "../helper/render";
import {
  checkForNewVersion,
  registerServiceWorker,
} from "../helper/serviceWorkerUtils";
import { shareOrDownloadFile } from "../helper/shareFile";
import useIndexedDB, { SaveEntry } from "../hooks/useIndexedDb";

import MainMenu from "./MainMenu";
import Overlay, { OverlayElements } from "./Overlay";
import SideMenu, { SideMenuButton } from "./SideMenu";

import styles from "./InteractiveCanvas.module.css";

function isFileHandle(
  handle: FileSystemHandle,
): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

export default function InteractiveCanvas() {
  console.debug("DRAW InteractiveCanvas");

  // States

  /** Store uploaded or PWA launched files */
  const [file, setFile] = useState<File | null>(null);
  /** Store parsed JSON */
  const [spielZettelData, setSpielZettelData] =
    useState<SpielZettelFileData | null>(null);
  /** Store the current image element */
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  /** Reference to the canvas which should be used to render the SpielZettel */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /** Store the current element states (and the previous version) */
  const elementStatesRef = useRef<SpielZettelElementState[]>([]);
  const elementStatesBackupRef = useRef<SpielZettelElementState[] | null>(null);
  const [undoPossible, setUndoPossible] = useState(false);

  /** Store the current debug information */
  const [debug, setDebug] = useState(false);
  const debugRef = useRef<DebugInformation>({});

  /** Overlay related states */
  const [overlayVisible, setOverlayVisible] = useState(false);

  /** Track the current save ID */
  const [currentSave, setCurrentSave] = useState<string | null>(null);
  /** Track the current rule set ID */
  const [currentRuleSet, setRuleSet] = useState<string | null>(null);

  /** Store the current rule set */
  const ruleSetRef = useRef<SpielZettelRuleSet | null>(null);

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

  /** Database hook */
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
  } = useIndexedDB("SpielZettelDB");

  // Values

  const currentName = useMemo<string | null>(() => {
    if (spielZettelData === null) return null;
    const info = spielZettelData.dataJSON;
    return `${info.name} (${getVersionString(info.version)}${currentRuleSet ? ` - ${currentRuleSet}` : ""})`;
  }, [currentRuleSet, spielZettelData]);

  // Callbacks

  const deleteSpielZettel = useCallback(
    async (id: string) => {
      const userConfirmed = confirm(
        `This will delete the SpielZettel ${id} and all it's save files. Are you sure you want to continue?`,
      );
      if (userConfirmed) {
        await removeSpielZettel(id);
      }
    },
    [removeSpielZettel],
  );

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

  const handleCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
      console.debug("handleCanvasClick");
      const canvas = canvasRef.current;
      if (canvas === null || spielZettelData === null || image === null) return;

      // Setup backup
      const statesBackup = elementStatesRef.current.map((a) => ({ ...a }));

      const startTime = performance.now();
      let refresh = false;

      try {
        refresh = handleInputs(
          canvas,
          image,
          event,
          spielZettelData.dataJSON.elements,
          elementStatesRef,
          ruleSetRef,
          debugRef,
        );
      } catch (error) {
        const errorCauseMessage = ((error as Error).cause as Error).message;
        if (
          confirm(
            `Do you want to disable the current rule set after evaluating rules threw an error? (${(error as Error).message} [${errorCauseMessage ?? "none"}])`,
          )
        ) {
          setRuleSet(null);
        }
      }
      const endTime = performance.now();
      debugRef.current.handleInputsMs = endTime - startTime;

      if (refresh) {
        console.debug(
          "DETECTED STATE CHANGE: [handleCanvasClick]",
          elementStatesRef.current,
        );
        // Setup undo action
        elementStatesBackupRef.current = statesBackup;
        setUndoPossible(true);

        // Update save with state changes
        if (currentSave !== null) {
          addSave(
            currentSave,
            spielZettelData.dataJSON.name,
            elementStatesRef.current ?? [],
            ruleSetRef.current?.name ?? undefined,
          ).catch(console.error);
        }
        // Update canvas with state changes
        setRefreshCanvas((prev) => prev + 1);
      }
    },
    [spielZettelData, image, currentSave, addSave],
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
        console.warn("[Last Save] No connected SpielZettel found.");
        return;
      }
      // Found last save, load it
      console.info("Found last save:", lastSave, spielZettel);
      createNotification(
        `Found last save: ${lastSave.id} (${spielZettel.id} | ${lastSave.save.ruleSet ?? "none"})`,
      ).catch(console.error);
      setSpielZettelData(spielZettel.spielZettel);
      setCurrentSave(lastSave.id);
    } catch (error) {
      console.error(Error("Error fetching last save", { cause: error }));
    }
  }, [getLastSave, getSave, getSpielZettel]);

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
    createNotification(`Create new save: ${newSaveId}`).catch(console.error);
    await addSave(
      newSaveId,
      spielZettelData.dataJSON.name,
      [],
      ruleSetRef.current?.name ?? undefined,
    );
    setCurrentSave(newSaveId);
  }, [addSave, spielZettelData]);

  const onClear = useCallback(() => {
    // Create a new save which automatically clears the current state
    createNewSave().catch(console.error);
  }, [createNewSave]);

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
    onResetSates();
    // Reset the database
    resetDB();
    // TODO Fix errors - for now just reload the page
    window.location.reload();
  }, [onResetSates, resetDB]);

  // Event Listeners

  useEffect(() => {
    console.debug("USE EFFECT: [InteractiveCanvas] Initialize canvas");
    getLastScoreAndSpielZettel().catch(console.error);
  }, [getLastScoreAndSpielZettel]);

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
    console.debug("USE EFFECT: [InteractiveCanvas] Register service worker");
    registerServiceWorker(workboxServiceWorkerUrl)
      .then(() => {
        checkForNewVersion(workboxServiceWorkerUrl);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    console.debug("USE EFFECT: [InteractiveCanvas] Register keydown listener");

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "d") {
        console.debug("EVENT LISTENER: [InteractiveCanvas] d key pressed");
        setDebug((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, []);

  // PWA: Open file
  useEffect(() => {
    if ("launchQueue" in window) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;
        for (const fileHandle of launchParams.files) {
          if (isFileHandle(fileHandle)) {
            const uploadedFile = await fileHandle.getFile();
            console.debug("File received (launch queue):", uploadedFile);
            if (uploadedFile.name.endsWith(".spielzettel")) {
              setFile(uploadedFile);
              alert(`File "${uploadedFile.name}" set successfully!`);
            } else {
              alert(
                `Unsupported file type "${uploadedFile.name}" (expected .spielzettel).`,
              );
            }
          }
        }
      });
    }
  }, []);

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
      .catch(console.error);
    // > If no save is loaded check if a save file exists otherwise create a new one
    if (currentSave === null) {
      createNotification("Found no current save, create new save").catch(
        console.error,
      );
      getAllSaves()
        .then((saves) => {
          const spielZettelSaves = saves.filter(
            (a) => a.save.spielZettelKey === spielZettelData.dataJSON.name,
          );
          if (spielZettelSaves.length === 0) {
            return createNewSave();
          }
          const latestSave = spielZettelSaves[spielZettelSaves.length - 1];
          createNotification(
            `Found existing save: ${latestSave.id} (${latestSave.save.ruleSet ?? "none"})`,
          ).catch(console.error);
          setCurrentSave(latestSave.id);
        })
        .catch(console.error);
    }
    // > Refresh canvas
    setRefreshCanvas((prev) => prev + 1);
  }, [
    addSave,
    addSpielZettel,
    createNewSave,
    currentSave,
    getAllSaves,
    spielZettelData,
  ]);

  useEffect(() => {
    if (file !== null) {
      readSpielZettelFile(file).then((data) => {
        setSpielZettelData(data);
      });
    }
  }, [file]);

  useEffect(() => {
    if (currentName === null) return;
    // > Document title
    document.title = `${name}: ${currentName}`;
  }, [currentName]);

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
        createNotification(
          `Load save ${saveEntry.id} (${saveEntry.save.ruleSet ?? "none"})`,
        ).catch(console.error);
        elementStatesRef.current = saveEntry.save.states ?? [];
        // Automatically set ruleSet if it was set before
        setRuleSet(saveEntry.save.ruleSet ?? null);
        // Update canvas with the changes of the save
        setRefreshCanvas((prev) => prev + 1);
      })
      .catch(console.error);
    // Update last save with the current save
    setLastSave(currentSave);
  }, [currentSave, getSave, setLastSave]);

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
    if (ruleSetRef.current) {
      // Evaluate current state using the new ruleset
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
        const errorCauseMessage = ((error as Error).cause as Error).message;
        if (
          confirm(
            `Do you want to disable the current rule set after evaluating rules threw an error? (${(error as Error).message} [${errorCauseMessage ?? "none"}])`,
          )
        ) {
          setRuleSet(null);
        }
      }
    } else {
      // If ruleset is disabled remove all disabled states
      for (const state of elementStatesRef.current) {
        delete state.disabled;
      }
    }
    // Update canvas with the new state changes after evaluating the rules of the rule set
    setRefreshCanvas((prev) => prev + 1);
    // Update save with the currentRuleSet if a current save exists
    if (currentSave === null) return;
    addSave(
      currentSave,
      spielZettelData.dataJSON.name,
      elementStatesRef.current ?? [],
      currentRuleSet ?? undefined,
    ).catch(console.error);
  }, [image, currentRuleSet, spielZettelData, addSave, currentSave, debug]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in overlay visibility", overlayVisible);
    if (!overlayVisible) return;
    getAllSaves()
      .then((saves) => {
        setCurrentSaves(saves);
      })
      .catch(console.error);
  }, [getAllSaves, overlayVisible]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in debug", debug);
    // Update canvas with/without debug overlay
    setRefreshCanvas((prev) => prev + 1);
    // Show alert if debug is enabled
    const canvas = canvasRef.current;
    if (debug === false || canvas === null) return;
    const rect = canvas.getBoundingClientRect();
    window.alert(
      `canvasSize=${canvas?.width}x${canvas?.height}, windowSize=${window.innerWidth}x${window.innerHeight}, screenSize=${window.screen.width}x${window.screen.height},rectSize=${rect.width}x${rect.height}, pixelRatio=${window.devicePixelRatio}`,
    );
  }, [debug]);

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
        Promise.all(
          Array.from(files).map((uploadedFile) =>
            readSpielZettelFile(uploadedFile).then((data) =>
              addSpielZettel(data.dataJSON.name, data),
            ),
          ),
        )
          .then(() => {
            setRefreshMainMenu(true);
          })
          .catch(console.error);
      }
    },
    [addSpielZettel],
  );

  const getSpielZettelDataList = useCallback(async () => {
    console.debug("getSpielZettelDataList", refreshMainMenu);
    return getAllSpielZettel();
  }, [getAllSpielZettel, refreshMainMenu]);

  // SideMenu: Callbacks

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  const undoLastAction = useCallback(() => {
    setUndoPossible(false);
    elementStatesRef.current = elementStatesBackupRef.current ?? [];
    elementStatesBackupRef.current = null;
    setRefreshCanvas((prev) => prev + 1);
  }, []);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible((prev) => !prev);
  }, []);

  // SideMenu: Values

  const buttonsSideMenu = useMemo<SideMenuButton[]>(() => {
    const buttons: SideMenuButton[] = [
      { text: "☰", onClick: toggleOverlay },
      { text: "⛶", onClick: toggleFullscreen },
    ];
    if (undoPossible) {
      buttons.push({ text: "⎌", onClick: undoLastAction });
    }
    return buttons;
  }, [toggleFullscreen, toggleOverlay, undoPossible, undoLastAction]);

  // Overlay: Callbacks

  const onRulesetChange = useCallback(
    (ruleSet: string | null) => {
      console.debug("Change rule set to ", ruleSet);
      const ruleSetObj = spielZettelData?.dataJSON.ruleSets?.find(
        (a) => a.name === ruleSet,
      );
      if (ruleSet === null) {
        setRuleSet(null);
        ruleSetRef.current = null;
      }
      if (ruleSet === undefined) {
        console.error("Selected rule set was not found!", ruleSet);
        setRuleSet(null);
        ruleSetRef.current = null;
      }
      setRuleSet(ruleSet);
      ruleSetRef.current = ruleSetObj ?? null;
    },
    [spielZettelData?.dataJSON.ruleSets],
  );

  const onShareScreenshot = useCallback(async () => {
    if (spielZettelData === null || !canvasRef.current) return;

    // Capture the canvas content as a Base64 string
    const imageType = "image/png";
    const dataUrl = canvasRef.current.toDataURL(imageType);

    // Convert the Base64 string to a file
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const name = `SpielZettel Screenshot ${currentName}`;
    const fileName = `${name}.png`;
    const file = new File([blob], fileName, { type: imageType });

    await shareOrDownloadFile(file, dataUrl, fileName, name);
  }, [currentName, spielZettelData]);

  // Overlay: Values

  const elementsOverlay = useMemo<OverlayElements[]>(() => {
    const ruleSets: SpielZettelRuleSet[] = [];
    if (spielZettelData !== null && spielZettelData.dataJSON.ruleSets) {
      ruleSets.push(...spielZettelData.dataJSON.ruleSets);
    }
    return [
      {
        id: "home",
        type: "button",
        text: "Change Spiel Zettel",
        onClick: () => {
          onResetSates();
          setOverlayVisible(false);
        },
      },
      {
        id: "clear",
        type: "button",
        text: "Clear",
        onClick: () => {
          onClear();
          setOverlayVisible(false);
        },
      },
      {
        id: "screenshot",
        type: "button",
        text: "Share Screenshot",
        onClick: () => {
          onShareScreenshot();
          setOverlayVisible(false);
        },
      },
      {
        id: "ruleSets",
        type: "select",
        currentValue: currentRuleSet ?? undefined,
        onChange: (ev) => {
          if (ev.target.value === "none") {
            onRulesetChange(null);
            return;
          }
          const userConfirmed = confirm(
            "This will run arbitrary code. Only enable this if you trust the source of the SpielZettel! Are you sure you want to continue?",
          );
          if (userConfirmed) {
            onRulesetChange(ev.target.value);
          } else {
            ev.target.value = "none";
          }
          setOverlayVisible(false);
        },
        options: [
          {
            text: "Disable Rule Sets",
            value: "none",
          },
          ...ruleSets.map((ruleSet) => ({
            text: `Enable Rule Set: ${ruleSet.name}`,
            value: ruleSet.name,
          })),
        ],
      },
      {
        id: "saves",
        type: "select",
        currentValue: currentSave ?? undefined,
        onChange: (ev) => setCurrentSave(ev.target.value),
        options: currentSaves.map((save) => ({
          text: `Load Save: ${save.id}`,
          value: save.id,
        })),
      },
      {
        id: "debug",
        type: "button",
        text: `Toggle Debug: ${debug ? "ON" : "OFF"}`,
        onClick: () => {
          setDebug((prev) => !prev);
          setOverlayVisible(false);
        },
      },
      {
        id: "mirror",
        type: "button",
        text: "Mirror Side Menu",
        onClick: () => {
          setSideMenuPosition((prev) => (prev === "left" ? "right" : "left"));
          setOverlayVisible(false);
        },
      },
      {
        id: "reset",
        type: "button",
        text: "Reset",
        onClick: () => {
          onReset();
          setOverlayVisible(false);
        },
      },
    ];
  }, [
    currentRuleSet,
    currentSave,
    currentSaves,
    debug,
    onClear,
    onReset,
    onResetSates,
    onRulesetChange,
    onShareScreenshot,
    spielZettelData,
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
          getSpielZettelDataList={getSpielZettelDataList}
          setSpielZettelData={setSpielZettelData}
          deleteSpielZettel={deleteSpielZettel}
          spielZettelData={spielZettelData}
        />
      )}

      {/* Side menu */}
      <SideMenu
        visible={spielZettelData !== null}
        buttons={buttonsSideMenu}
        position={sideMenuPosition}
      />

      {/* Overlay with controls if SpielZettel is open and enabled */}
      <Overlay
        visible={overlayVisible}
        setVisible={setOverlayVisible}
        elements={elementsOverlay}
      />

      {/* Canvas if SpielZettel is open */}
      {spielZettelData !== null && (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
        ></canvas>
      )}
    </div>
  );
}
