'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import { getVersionString, readSpielZettelFile } from "../helper/readFile";
import { DebugInformation, render } from "../helper/render";
import { evaluateRulesOld, handleInputs } from "../helper/handleInputs";
import { shareOrDownloadFile } from "../helper/shareFile";
import useIndexedDB from "../hooks/useIndexedDb";
import Overlay from "./Overlay";
import MainMenu from "./MainMenu";

import type { MouseEvent as ReactMouseEvent } from "react";
import type { SpielZettelFileData, SpielZettelRuleSet } from "../helper/readFile";
import type { SpielZettelElementState } from "../helper/evaluateRule";

import styles from "./InteractiveCanvas.module.css";

function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

export default function InteractiveCanvas() {
  console.debug("DRAW InteractiveCanvas");

  const [debug, setDebug] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /** Store uploaded or PWA launched files */
  const [file, setFile] = useState<File | null>(null);

  /** Store parsed JSON */
  const [spielZettelData, setSpielZettelData] = useState<SpielZettelFileData | null>(null);

  /** Store the current image element */
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [currentSave, setCurrentSave] = useState<string | null>(null);
  /** Store the current element states */
  const elementStatesRef = useRef<SpielZettelElementState[]>([]);
  const debugRef = useRef<DebugInformation>({});

  /** Store the current rule set */
  const [currentRuleSet, setRuleSet] = useState<string | null>(null);
  const ruleSetRef = useRef<SpielZettelRuleSet | null>(null);

  const [refreshCanvas, setRefreshCanvas] = useState(false);
  const [refreshMainMenu, setRefreshMainMenu] = useState(false);
  const [mirrorButtons, setMirrorButtons] = useState<boolean>(false);
  const [evaluateRulesSwitch, setEvaluateRulesSwitch] = useState<boolean>(false);


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

  const deleteSpielZettel = useCallback(async (id: string) => {
    const userConfirmed = confirm(`This will delete the SpielZettel ${id} and all it's save files. Are you sure you want to continue?`);
    if (userConfirmed) {
      await removeSpielZettel(id);
    }
  }, [removeSpielZettel]);

  const drawCanvas = useCallback(() => {
    console.debug("drawCanvas");

    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    const startTime = performance.now()
    render(canvas, ctx, image, spielZettelData.dataJSON.elements, elementStatesRef, debug, debugRef.current);
    const endTime = performance.now()
    debugRef.current.lastDrawCanvasMs = endTime - startTime;
    if (debug) {
      console.debug("drawCanvas timings:", debugRef.current.lastDrawCanvasMs, "ms");
    }
  }, [debug, image, spielZettelData]);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("handleCanvasClick");
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;

    const startTime = performance.now()
    const refresh = handleInputs(canvas, image, event, spielZettelData.dataJSON.elements, elementStatesRef, ruleSetRef, debug, evaluateRulesSwitch);
    const endTime = performance.now()
    debugRef.current.lastEvaluateRulesMs = endTime - startTime;
    if (debug) {
      console.debug("evaluateRules timings:", debugRef.current.lastEvaluateRulesMs, "ms");
    }
    if (refresh) {
      console.debug("DETECTED STATE CHANGE: [handleCanvasClick]", elementStatesRef.current);
      // Update save with state changes
      if (currentSave !== null) {
        addSave(currentSave, spielZettelData.dataJSON.name, elementStatesRef.current ?? [], ruleSetRef.current?.name ?? undefined).catch(console.error);
      }
      // Update canvas with state changes
      setRefreshCanvas(prev => !prev);
    }
  }, [spielZettelData, image, debug, evaluateRulesSwitch, currentSave, addSave]);

  const getLastScoreAndSpielZettel = useCallback(async () => {
    try {
      const lastSaveId = await getLastSave();
      if (!lastSaveId) {
        console.warn('[Last Save] No last save ID found.');
        return;
      }
      const lastSave = await getSave(lastSaveId);
      if (!lastSave) {
        console.warn('[Last Save] No connected last save found.');
        return;
      }
      const spielZettel = await getSpielZettel(lastSave.save.spielZettelKey);
      if (!spielZettel) {
        console.warn('[Last Save] No connected SpielZettel found.');
        return;
      }
      // Found last save, load it
      console.info("Found last save:", lastSave, spielZettel);
      setSpielZettelData(spielZettel.spielZettel);
      setCurrentSave(lastSave.id);
    } catch (error) {
      console.error('Error fetching last save', error);
    }
  }, [getLastSave, getSave, getSpielZettel]);

  useEffect(() => {
    console.debug("USE EFFECT: Initialize canvas");
    getLastScoreAndSpielZettel().catch(console.error);
  }, [getLastScoreAndSpielZettel]);

  useEffect(() => {
    console.debug("USE EFFECT: Register event listener for pixel ratio");

    const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        console.debug("EVENT LISTENER: Pixel ratio changed", window.devicePixelRatio)
      }
    };

    mediaQueryList.addEventListener("change", onMediaQueryChange);
    return () => {
      mediaQueryList.removeEventListener("change", onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    console.debug("USE EFFECT: Register service worker");

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then((registration) => {
          console.info('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    console.debug("USE EFFECT: Register key press listener");

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'd') {
        setDebug(prev => {
          console.debug("KEY PRESS: Toggle debug", !prev);
          return !prev;
      });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
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
              alert(`Unsupported file type "${uploadedFile.name}" (expected .spielzettel).`);
            }
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (file !== null) {
      readSpielZettelFile(file).then(data => {
        console.log(data);
        setSpielZettelData(data);
        elementStatesRef.current = [];
      })
    }
  }, [file]);

  const createNewSave = useCallback(async () => {
    if (spielZettelData === null) return;
    const now = new Date();
    const offset = now.getTimezoneOffset()
    const currentDateIsoStr = new Date(now.getTime() - (offset*60*1000)).toISOString().split('T')[0];
    const currentTimeStr = now.toLocaleTimeString('de', { hour12: false }).split(":").join('-');
    const newSaveId = `${currentDateIsoStr}_${currentTimeStr}`;
    await addSave(newSaveId, spielZettelData.dataJSON.name, [], ruleSetRef.current?.name ?? undefined);
    setCurrentSave(newSaveId);
  }, [addSave, spielZettelData]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in spielZettelData", spielZettelData);
    if (spielZettelData === null) return;
    // If spielZettelData changes set up
    // > Image element with new image data
    const img = new Image();
    img.src = spielZettelData.imageBase64;
    img.onload = () => {
      setImage(img); // Store the image in state
    };
    // > Document title
    document.title = `Spiel Zettel: ${spielZettelData.dataJSON.name} (${getVersionString(spielZettelData.dataJSON.version)})`;
    // > Add/Update Spiel Zettel in database
    addSpielZettel(spielZettelData.dataJSON.name, spielZettelData).then(() => {
      setRefreshMainMenu(true);
    }).catch(console.error);
    // > Create a new save if this is the first save or load the most recent one
    createNewSave();
    setRefreshCanvas(prev => !prev);
  }, [addSave, addSpielZettel, createNewSave, getAllSaves, spielZettelData]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in currentSave", currentSave);
    if (currentSave === null) return;
    getSave(currentSave).then(saveEntry => {
      console.info("Load save", currentSave, saveEntry, saveEntry?.save?.states ?? []);
      if (!saveEntry) return;
      elementStatesRef.current = saveEntry.save.states ?? [];
      // Automatically set ruleSet if it was set before
      setRuleSet(saveEntry.save.ruleSet ?? null);
      // Update canvas with the changes of the save
      setRefreshCanvas(prev => !prev);
    }).catch(console.error);
    // Update last save with the current save
    setLastSave(currentSave);
  }, [currentSave, getSave, setLastSave]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in image", image);
    if (image === null) return;
    // Update canvas with the image changes
    setRefreshCanvas(prev => !prev);
  }, [image]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in refreshCanvas", refreshCanvas);
    // Refresh canvas
    drawCanvas();
  }, [drawCanvas, refreshCanvas]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in currentRuleSet", currentRuleSet);
    if (spielZettelData === null) return;
    // TODO Update ruleset in here!
    if (ruleSetRef.current !== null) {
      // Evaluate current state using the ruleset and then redraw the canvas
      const startTime = performance.now()
      evaluateRulesOld(ruleSetRef.current, spielZettelData.dataJSON.elements, elementStatesRef);
      const endTime = performance.now()
      debugRef.current.lastEvaluateRulesMs = endTime - startTime;
      if (debug) {
        console.debug("evaluateRules timings:", debugRef.current.lastEvaluateRulesMs, "ms");
      }
    } else {
      // If ruleset is disabled remove all disabled states
      for (const state of elementStatesRef.current) {
        delete state.disabled;
      }
      setRefreshCanvas(prev => !prev);
    }
    // Update canvas with the new state changes after evaluating the rules of the rule set
    setRefreshCanvas(prev => !prev);
    // Update save with the currentRuleSet
    if (currentSave === null) return;
    addSave(currentSave, spielZettelData.dataJSON.name, elementStatesRef.current ?? [], currentRuleSet ?? undefined)
      .catch(console.error);
  }, [image, currentRuleSet, spielZettelData, addSave, currentSave, debug]);

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
    elementStatesRef.current = null;
    setRefreshMainMenu(true);
  }, []);

  const onReset = useCallback(() => {
    onResetSates();
    // Reset the database
    resetDB();
    // TODO Fix errors - for now just reload the page
    window.location.reload();
  }, [onResetSates, resetDB]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in debug", debug);
    // Update canvas with/without debug overlay
    setRefreshCanvas(prev => !prev);
    // Show alert if debug is enabled
    const canvas = canvasRef.current;
    if (debug === false || canvas === null) return;
    const rect = canvas.getBoundingClientRect();
    window.alert(`canvasSize=${canvas?.width}x${canvas?.height}, windowSize=${window.innerWidth}x${window.innerHeight}, screenSize=${window.screen.width}x${window.screen.height},rectSize=${rect.width}x${rect.height}, pixelRatio=${window.devicePixelRatio}`);
  }, [debug]);

  useEffect(() => {
    console.debug("USE EFFECT: Register event listener listener for canvas size changes");

    const resizeCanvas = (ev: UIEvent) => {
      console.debug("EVENT LISTENER: Canvas resized", ev);
      // Update canvas with new size
      setRefreshCanvas(prev => !prev);
    };

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [spielZettelData]);

  const name = useMemo<string | null>(() => {
    if (spielZettelData === null) return null;
    const info = spielZettelData.dataJSON;
    return `${info.name} (${getVersionString(info.version)})`;
  }, [spielZettelData]);

  // Buttons:
  // > Callbacks
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // MainMenu:
  // > Callbacks
  const onFileUpload = useCallback((files: FileList) => {
    const uploadedFile = files[0];
    if (uploadedFile) {
      console.log("File received (upload):", uploadedFile);
      setFile(uploadedFile);
      setOverlayVisible(false);
    }
  }, []);

  const getSpielZettelDataList =  useCallback(async () => {
    console.debug("getSpielZettelDataList", refreshMainMenu);
    return getAllSpielZettel();
  }, [getAllSpielZettel, refreshMainMenu]);

  // Overlay:
  // > Callbacks
  const toggleOverlay = useCallback(() => {
    setOverlayVisible(prev => !prev);
  }, []);

  const onSaveChange = useCallback((saveId: string | null) => {
    console.log("Change save to ", saveId);
    setCurrentSave(saveId);
  }, []);

  const getSavesOfCurrentSpielZettel = useCallback(async () => {
    if (spielZettelData === null) return [];
    const allSaves = await getAllSaves();
    return allSaves.filter(a => a.save.spielZettelKey === spielZettelData.dataJSON.name);
  }, [getAllSaves, spielZettelData]);

  const onRulesetChange = useCallback((ruleSet: string | null) => {
    console.log("Change rule set to ", ruleSet);
    const ruleSetObj = spielZettelData?.dataJSON.ruleSets?.find(a => a.name === ruleSet);
    if (ruleSet === null) {
      setRuleSet(null);
      ruleSetRef.current = null;
    }
    if (ruleSet === undefined) {
      console.error("Selected rule set was not found!", ruleSet)
      setRuleSet(null);
      ruleSetRef.current = null;
    }
    setRuleSet(ruleSet);
    ruleSetRef.current = ruleSetObj ?? null;
  }, [spielZettelData?.dataJSON.ruleSets]);

  const onShareScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;

    // Capture the canvas content as a Base64 string
    const imageType = "image/png";
    const dataUrl = canvasRef.current.toDataURL(imageType);

    // Convert the Base64 string to a file
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fileName = "SpielZettel-screenshot.png";
    const file = new File([blob], fileName, { type: imageType });

    await shareOrDownloadFile(file, dataUrl, fileName, `SpielZettel Screenshot ${name}`);
  }, [canvasRef, name]);

  const onToggleRuleEvaluation = useCallback(async () => {
    setEvaluateRulesSwitch(prev => !prev);
  }, [setEvaluateRulesSwitch]);

  return (
    <div className={styles.container}>
      {/* Main Menu if no SpielZettel is open */}
      {spielZettelData === null && <MainMenu
        updateSpielZettelDataList={refreshMainMenu}
        setUpdateSpielZettelDataList={setRefreshMainMenu}
        onFileUpload={onFileUpload}
        getSpielZettelDataList={getSpielZettelDataList}
        setSpielZettelData={setSpielZettelData}
        deleteSpielZettel={deleteSpielZettel} />}

      {/* Button to toggle Overlay if SpielZettel is open */}
      {spielZettelData !== null && (
        <button className={mirrorButtons ? `${styles.topRightButton} ${styles.topLeftButton}` : styles.topRightButton} onClick={toggleOverlay}>
          ☰
        </button>
      )}
      {spielZettelData !== null && (
        <button className={mirrorButtons ? `${styles.topRightButton2} ${styles.topLeftButton}` : styles.topRightButton2} onClick={toggleFullscreen}>
          ⛶
        </button>
      )}

      {/* Overlay with controls if SpielZettel is open and enabled */}
      <Overlay
        spielZettelData={spielZettelData}
        setMirrorButtons={setMirrorButtons}
        currentRuleset={currentRuleSet}
        debug={debug}
        currentSave={currentSave}
        getSaves={getSavesOfCurrentSpielZettel}
        onRulesetChange={onRulesetChange}
        onSaveChange={onSaveChange}
        setDebug={setDebug}
        onClear={onClear}
        onReset={onReset}
        onHome={onResetSates}
        onToggleRuleEvaluation={onToggleRuleEvaluation}
        onShareScreenshot={onShareScreenshot}
        visible={overlayVisible}
        setVisible={setOverlayVisible}
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
