import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { readSpielZettelFile } from "../helper/readFile";
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import type { SpielZettelFileData } from "../helper/readFile";
import { render } from "../helper/render";
import { handleInputs } from "../helper/handleInputs";
import { useIndexedDB } from "../hooks/useIndexedDb";
import Overlay from "./Overlay";
import type { SpielZettelElementState } from "../helper/evaluateRule";

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
  /** Store the current element states */
  const elementStatesRef = useRef<SpielZettelElementState[] | null>(null);

  /** Store the current rule set */
  const [ruleSet, setRuleSet] = useState<string | null>(null);

  const { saveData, getCurrentData, setCurrentKey, getAllEntries } = useIndexedDB("SpielZettelDB", "zettel");

  useEffect(() => {
    console.debug("USE EFFECT: Load persistently stored data [UPDATED SPIELZETTELDATA]");

    const fetchCurrentData = async () => {
      try {
        const data = await getCurrentData();
        console.log("Current Data:", data);
        return data;
      } catch (err) {
        console.error("Error fetching current data:", err);
      }
    };
    fetchCurrentData().then(data => {
      if (data === undefined) return;
      console.info("TODO Load stored data", data);
      // TODO
      //setSpielZettelData(data.data);
      //elementStatesRef.current = [];
    }).catch(console.error);
    getAllEntries().then(console.debug).catch(console.error);
  }, [getAllEntries, getCurrentData]);

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

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const uploadedFile = event.target.files[0];
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
        elementStatesRef.current = [];
      })
    }
  }, [file])

  useEffect(() => {
    if (spielZettelData !== null) {
      const img = new Image();
      img.src = spielZettelData.imageBase64;
      img.onload = () => {
        setImage(img); // Store the image in state
      };
      saveData(spielZettelData.dataJSON.name, spielZettelData).then(() => setCurrentKey(spielZettelData.dataJSON.name)).catch(console.error);
    }
  }, [saveData, setCurrentKey, spielZettelData])

  const resetCanvas = useCallback(() => {
    setFile(null);
    setSpielZettelData(null);
    elementStatesRef.current = [];

    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    console.log("drawCanvas", canvas, canvas?.width, canvas?.height, window.innerWidth, window.innerHeight, canvas.getBoundingClientRect());

    const dpr = window.devicePixelRatio || 1; // Fallback to 1 if dpr is not defined
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the context to match the device pixel ratio
    ctx.save();
    ctx.scale(dpr, dpr);

    // Ensure the canvas is displayed at the correct size
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image centered
    render(canvas, ctx, image, spielZettelData.dataJSON.elements, elementStatesRef, debug);
    ctx.restore();
  }, [debug, image, spielZettelData]);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("handleCanvasClick");
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || image === null) return;

    const refresh = handleInputs(canvas, image, event, spielZettelData.dataJSON.elements, elementStatesRef, debug);
    if (refresh) {
      console.debug("DETECTED STATE CHANGE: [handleCanvasClick]", elementStatesRef.current);
      drawCanvas();
    }
  }, [spielZettelData, image, debug, drawCanvas]);

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
    const dataUrl = canvasRef.current.toDataURL("image/png");

    // Convert the Base64 string to a Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create a downloadable file
    const file = new File([blob], "canvas-screenshot.png", { type: "image/png" });

    // Check if the Web Share API is supported
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        // Share the image as a file
        await navigator.share({
          files: [file],
          title: `Spielzettel Screenshot ${name}`,
          //text: "",
        });
        console.log("Screenshot shared successfully!");
      } catch (error) {
        console.error("Error sharing screenshot:", error);
      }
    } else {
      // Fall back to downloading the image
      console.warn("Web Share API not supported on this device. Falling back to download.");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "canvas-screenshot.png";
      link.click();
    }
  }, [canvasRef, name]);

  const fileUpload = useMemo(() => <>
    <input
      type="file"
      id="file-upload"
      style={styles.fileInput}
      onChange={handleFileUpload}
    />
    <label htmlFor="file-upload" style={styles.button}>
      Upload File
    </label>
  </>, [handleFileUpload]);

  const onRulesetChange = useCallback((ruleSet: string | null) => {
    console.log("Change ruleset to ", ruleSet);
    setRuleSet(ruleSet);
  }, []);

  return (
    <div style={styles.container}>
      {/* Upload file */}
      {spielZettelData === null && fileUpload}

      {/* Top-right button */}
      {spielZettelData !== null && (
        <button style={styles.topRightButton} onClick={toggleOverlay}>
          {overlayVisible ? "Close" : "Menu"}
        </button>
      )}

      {/* Overlay with controls */}
      <Overlay spielZettelData={spielZettelData} currentRuleset={ruleSet} debug={debug} saves={null} onRulesetChange={onRulesetChange} onSaveChange={function (save: string): void {
        console.warn(`Function not implemented. [onSaveChange] (${save})`);
      }} setDebug={setDebug} onResetCanvas={resetCanvas} onShareScreenshot={shareScreenshot} visible={overlayVisible} setVisible={setOverlayVisible} />

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
