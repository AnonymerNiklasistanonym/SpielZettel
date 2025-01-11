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

export function InteractiveCanvas() {
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
  const elementStatesRef = useRef<SpielZettelElementState[] | null>(null);

  /** Store the current rule set */
  const [ruleSet, setRuleSet] = useState<string | null>(null);
  const ruleSetRef = useRef<SpielZettelRuleSet | null>(null);

  const { loading, addSpielZettel, getSpielZettel, getAllSpielZettel, addSave, getSave, setLastSave, getLastSave } = useIndexedDB("SpielZettelDB");

  const drawCanvas = useCallback(() => {
    console.debug("drawCanvas");

    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    render(canvas, ctx, image, spielZettelData.dataJSON.elements, elementStatesRef, debug);
  }, [debug, image, spielZettelData]);

  const updateState = useCallback((newState: SpielZettelElementState[] | null) => {
    elementStatesRef.current = newState;

    // Redraw canvas
    drawCanvas();
  }, [drawCanvas]);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("handleCanvasClick");
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;

    const refresh = handleInputs(canvas, image, event, spielZettelData.dataJSON.elements, elementStatesRef, ruleSetRef, debug);
    if (refresh) {
      console.debug("DETECTED STATE CHANGE: [handleCanvasClick]", elementStatesRef.current);
      drawCanvas();
    }
  }, [spielZettelData, image, debug, drawCanvas]);

  const getLastScoreAndSpielZettel = useCallback(async () => {
    try {
      const lastSaveId = await getLastSave();
      if (!lastSaveId) {
        console.warn('No last save (ID) found.');
        return;
      }
      const lastSave = await getSave(lastSaveId);
      if (!lastSave) {
        console.warn('No last save found.');
        return;
      }
      const spielZettel = await getSpielZettel(lastSave.spielZettelKey);
      console.info("Found last save:", lastSave, spielZettel);

      //setSpielZettelData(data.data);
      //updateState(lastSave.states);

      // TODO
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

      // TODO
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

  const toggleOverlay = useCallback(() => {
    setOverlayVisible(prev => !prev);
  }, []);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        console.debug("Pixel ratio changed: ", window.devicePixelRatio)
      }
    };

    mediaQueryList.addEventListener("change", onMediaQueryChange);
    return () => {
      mediaQueryList.removeEventListener("change", onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'd') {
        setDebug(prev => !prev);
        console.log('Debug mode:', !debug);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [debug]);

  const handleFileUpload = useCallback((files: FileList) => {
    const uploadedFile = files[0];
    if (uploadedFile) {
      console.log("File received (upload):", uploadedFile);
      setFile(uploadedFile);
      setOverlayVisible(false);
    }
  }, []);

  useEffect(() => {
    if ("launchQueue" in window) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files.length) return;

        for (const fileHandle of launchParams.files) {
          if (isFileHandle(fileHandle)) {
            const uploadedFile = await fileHandle.getFile();
            console.log("File received (launch queue):", uploadedFile);
            if (uploadedFile.name.endsWith(".spielzettel")) {
              alert(`File "${uploadedFile.name}" set successfully!`);
              setFile(uploadedFile);
            } else {
              alert("Unsupported file type.");
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
        updateState([]);
      })
    }
  }, [file, updateState])

  useEffect(() => {
    if (spielZettelData === null) return;
    const img = new Image();
    img.src = spielZettelData.imageBase64;
    img.onload = () => {
      setImage(img); // Store the image in state
    };
    document.title = `Spiel Zettel: ${spielZettelData.dataJSON.name} (${getVersionString(spielZettelData.dataJSON.version)})`;
    const newSaveId = new Date().toJSON().slice(0,10);
    addSpielZettel(spielZettelData.dataJSON.name, spielZettelData)
      .then(() => addSave(newSaveId, spielZettelData.dataJSON.name, elementStatesRef.current ?? []))
      .then(() => setCurrentSave(newSaveId))
      .then(() => setLastSave(newSaveId))
      .catch(console.error);
  }, [addSave, addSpielZettel, setLastSave, spielZettelData]);

  useEffect(() => {
    if (spielZettelData === null) return;
    console.debug("DETECTED STATE CHANGE: [ruleSet]", ruleSet);
    evaluateRules(spielZettelData.dataJSON.elements, elementStatesRef, ruleSetRef);
    drawCanvas();
  },  [drawCanvas, image, ruleSet, spielZettelData]);

  const clear = useCallback(() => {
    // TODO: Save state

    elementStatesRef.current = [];

    // Update canvas
    drawCanvas();
  }, [drawCanvas]);

  const reset = useCallback(() => {
    setFile(null);
    setSpielZettelData(null);
    setRuleSet(null);
    updateState([]);
    ruleSetRef.current = null;

    // TODO: Clear indexed storage

    // Update canvas
    drawCanvas();
  }, [drawCanvas, updateState]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in spielZettelData/debug [DRAW UPDATED CANVAS]");
    drawCanvas();
  }, [spielZettelData, debug, drawCanvas]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in debug [SHOW ALERT IF TRUE]");

    const canvas = canvasRef.current;
    if (debug === false || canvas === null) return;
    const rect = canvas.getBoundingClientRect();
    window.alert(`canvasSize=${canvas?.width}x${canvas?.height}, windowSize=${window.innerWidth}x${window.innerHeight}, screenSize=${window.screen.width}x${window.screen.height},rectSize=${rect.width}x${rect.height}, pixelRatio=${window.devicePixelRatio}`);
  }, [debug]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in canvas size [DRAW UPDATED CANVAS]");

    const resizeCanvas = () => {
      console.debug("DETECTED CANVAS RESIZE");
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

  const shareScreenshot = useCallback(async () => {
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
    if (ruleSet === undefined ) {
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

  return (
    <div style={styles.container}>
      {/* Upload file */}
      {spielZettelData === null && <MainMenu
        onFileUpload={handleFileUpload}
       />}

      {/* Top-right button */}
      {spielZettelData !== null && (
        <button style={styles.topRightButton} onClick={toggleOverlay}>
          {overlayVisible ? "Close" : "Menu"}
        </button>
      )}

      {/* Overlay with controls */}
      <Overlay
        spielZettelData={spielZettelData}
        currentRuleset={ruleSet}
        debug={debug}
        currentSave={currentSave}
        saves={null}
        onRulesetChange={onRulesetChange}
        onSaveChange={onSaveChange}
        setDebug={setDebug}
        onClear={clear}
        onReset={reset}
        onShareScreenshot={shareScreenshot}
        visible={overlayVisible}
        setVisible={setOverlayVisible}
      />

      {/* Canvas */}
      {spielZettelData !== null ? (
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onClick={handleCanvasClick}
        ></canvas>
      ) : undefined}
    </div>
  );
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

export default InteractiveCanvas;
