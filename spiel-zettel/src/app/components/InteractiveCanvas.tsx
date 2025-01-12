'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { getVersionString, readSpielZettelFile } from "../helper/readFile";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { SpielZettelFileData, SpielZettelRuleSet } from "../helper/readFile";
import { render } from "../helper/render";
import { evaluateRules, handleInputs } from "../helper/handleInputs";
import useIndexedDB from "../hooks/useIndexedDb";
import Overlay from "./Overlay";
import type { SpielZettelElementState } from "../helper/evaluateRule";
import MainMenu from "./MainMenu";
import { shareOrDownloadFile } from "../helper/shareFile";


function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "black",
    color: "white",
    height: "100vh",
    overflow: "hidden",
    position: "relative",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  fileInput: {
    display: "none",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#1E90FF",
    color: "#fff",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },
  canvas: {
    backgroundColor: "black",
    display: "block"
  },
  topRightButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "10px 20px",
    backgroundColor: "#FF6347",
    color: "#fff",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
} as const;


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
  //const [saves, setSaves] = useState<string[] | null>(null);
  const [spielZettelDataList, setSpielZettelDataList] = useState<SpielZettelFileData[] | null>(null);
  /** Store the current element states */
  const elementStatesRef = useRef<SpielZettelElementState[] | null>(null);

  /** Store the current rule set */
  const [currentRuleSet, setRuleSet] = useState<string | null>(null);
  const ruleSetRef = useRef<SpielZettelRuleSet | null>(null);

  const {
    loading,
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
    render(canvas, ctx, image, spielZettelData.dataJSON.elements, elementStatesRef, debug);
  }, [debug, image, spielZettelData]);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("handleCanvasClick");
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;

    const refresh = handleInputs(canvas, image, event, spielZettelData.dataJSON.elements, elementStatesRef, ruleSetRef, debug);
    if (refresh) {
      console.debug("DETECTED STATE CHANGE: [handleCanvasClick]", elementStatesRef.current);
      // Update save with state changes
      if (currentSave !== null) {
        addSave(currentSave, spielZettelData.dataJSON.name, elementStatesRef.current ?? [], ruleSetRef.current?.name ?? undefined).catch(console.error);
      }
      // Update canvas with state changes
      drawCanvas();
    }
  }, [spielZettelData, image, debug, currentSave, drawCanvas, addSave]);

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

  const getSpielZettelList = useCallback(async () => {
    try {
      const spielZettelList = await getAllSpielZettel();
      if (!spielZettelList) {
        console.warn('No SpielZettel found.');
        return;
      }
      console.info("Found SpielZettel list:", spielZettelList);

      setSpielZettelDataList(spielZettelList.map(a => a.spielZettel));
    } catch (error) {
      console.error('Error fetching last save', error);
    }
  }, [getAllSpielZettel]);

  useEffect(() => {
    console.debug("USE EFFECT: Load persistently stored data [UPDATED SPIELZETTELDATA]", loading);
    if (loading) return;

    getLastScoreAndSpielZettel().catch(console.error);
    getSpielZettelList().catch(console.error);
  }, [loading, getLastScoreAndSpielZettel, getSpielZettelList]);

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
    // > Create a new save if this is the first save or load the most recent one
    getAllSaves().then(async allSaves => {
      const latestSave = allSaves.find(a => a.save.spielZettelKey === spielZettelData.dataJSON.name);
      if (latestSave) {
        setCurrentSave(latestSave.id);
      } else {
        return createNewSave();
      }
    }).catch(console.error);
  }, [addSave, addSpielZettel, createNewSave, getAllSaves, spielZettelData]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in currentSave", currentSave);
    if (currentSave === null) return;
    getSave(currentSave).then(saveEntry => {
      console.info("Load save", currentSave, saveEntry);
      elementStatesRef.current = saveEntry?.save?.states ?? [];
      // Automatically set ruleSet if it was set before
      if (saveEntry?.save.ruleSet) {
        setRuleSet(saveEntry.save.ruleSet);
      }
      // Update canvas with the changes of the save
      drawCanvas();
    }).catch(console.error);
    // Update last save with the current save
    setLastSave(currentSave);
  }, [currentSave, drawCanvas, getSave, setLastSave]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in image", image);
    if (image === null) return;
    // Update canvas with the image changes
    drawCanvas();
  }, [drawCanvas, image]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in currentRuleSet", currentRuleSet);
    if (spielZettelData === null) return;
    // Evaluate current state using the ruleset and then redraw the canvas
    evaluateRules(spielZettelData.dataJSON.elements, elementStatesRef, ruleSetRef);
    // Update canvas with the new state changes after evaluating the rules of the rule set
    drawCanvas();
    // Update save with the currentRuleSet
    if (currentSave === null) return;
    addSave(currentSave, spielZettelData.dataJSON.name, elementStatesRef.current ?? [], currentRuleSet ?? undefined)
      .catch(console.error);
  }, [drawCanvas, image, currentRuleSet, spielZettelData, addSave, currentSave]);

  const onClear = useCallback(() => {
    // Create a new save which automatically clears the current state
    createNewSave().catch(console.error);
  }, [createNewSave]);

  const onReset = useCallback(() => {
    // Reset all states
    setFile(null);
    setSpielZettelData(null);
    setRuleSet(null);
    ruleSetRef.current = null;
    elementStatesRef.current = null;
    // Reset the database
    resetDB();
  }, [resetDB]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in debug", debug);
    // Update canvas with/without debug overlay
    drawCanvas();
    // Show alert if debug is enabled
    const canvas = canvasRef.current;
    if (debug === false || canvas === null) return;
    const rect = canvas.getBoundingClientRect();
    window.alert(`canvasSize=${canvas?.width}x${canvas?.height}, windowSize=${window.innerWidth}x${window.innerHeight}, screenSize=${window.screen.width}x${window.screen.height},rectSize=${rect.width}x${rect.height}, pixelRatio=${window.devicePixelRatio}`);
  }, [debug, drawCanvas]);

  useEffect(() => {
    console.debug("USE EFFECT: Register event listener listener for canvas size changes");

    const resizeCanvas = (ev: UIEvent) => {
      console.debug("EVENT LISTENER: Canvas resized", ev);
      // Update canvas with new size
      drawCanvas();
    };

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [spielZettelData, drawCanvas]);

  const name = useMemo<string | null>(() => {
    if (spielZettelData === null) return null;
    const info = spielZettelData.dataJSON;
    return `${info.name} (v${info.version.major}.${info.version.minor}.${info.version.patch})`;
  }, [spielZettelData]);

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

  const onSaveChange = useCallback((saveId: string | null) => {
    console.log("Change save to ", saveId);
    setCurrentSave(saveId);
    // TODO
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

  // Overlay:
  // > Callbacks
  const toggleOverlay = useCallback(() => {
    setOverlayVisible(prev => !prev);
  }, []);

  const getSavesOfCurrentSpielZettel = useCallback(async () => {
    if (spielZettelData === null) return [];
    const allSaves = await getAllSaves();
    return allSaves.filter(a => a.save.spielZettelKey === spielZettelData.dataJSON.name);
  }, [getAllSaves, spielZettelData]);

  return (
    <div style={styles.container}>
      {/* Main Menu if no SpielZettel is open */}
      {spielZettelData === null && <MainMenu
        onFileUpload={onFileUpload}
        spielZettelDataList={spielZettelDataList}
        setSpielZettelData={setSpielZettelData}
        deleteSpielZettel={deleteSpielZettel} />}

      {/* Button to toggle Overlay if SpielZettel is open */}
      {spielZettelData !== null && (
        <button style={styles.topRightButton} onClick={toggleOverlay}>
          {overlayVisible ? "Close" : "Menu"}
        </button>
      )}

      {/* Overlay with controls if SpielZettel is open and enabled */}
      <Overlay
        spielZettelData={spielZettelData}
        currentRuleset={currentRuleSet}
        debug={debug}
        currentSave={currentSave}
        getSaves={getSavesOfCurrentSpielZettel}
        onRulesetChange={onRulesetChange}
        onSaveChange={onSaveChange}
        setDebug={setDebug}
        onClear={onClear}
        onReset={onReset}
        onShareScreenshot={onShareScreenshot}
        visible={overlayVisible}
        setVisible={setOverlayVisible}
      />

      {/* Canvas if SpielZettel is open */}
      {spielZettelData !== null && (
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onClick={handleCanvasClick}
        ></canvas>
      )}
    </div>
  );
}
