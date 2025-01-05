import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { readSpielZettelFile } from "../helper/readFile";
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import type { SpielZettelFileData } from "../helper/readFile";
import { render, type SpielZettelElementInfoState } from "../helper/render";
import { handleInputs } from "../helper/handleInputs";
import { useIndexedDB } from "../hooks/useIndexedDb";

function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

function InteractiveCanvas() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [elementInfoState, setElementInfoState] = useState<SpielZettelElementInfoState[] | null>(null);
  const [spielZettelData, setSpielZettelData] = useState<SpielZettelFileData | null>(null);
  const [debug, setDebug] = useState(false);
  const [refresh, setRefresh] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [pixelRatio, setPixelRatio] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { saveData, getCurrentData, setCurrentKey } = useIndexedDB("SpielZettelDB", "zettel");
  //const { getData, currentKey, error } = useIndexedDB("SpielZettelDB", "zettel");

  useEffect(() => {
    console.warn("AAAAAAAAAAAAAAAA")
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
      setSpielZettelData(data.data);
    }).catch(console.error);
  }, [getCurrentData]);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible(prev => !prev);
  }, []);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setPixelRatio(window.devicePixelRatio);
      }
    };
    mediaQueryList.addEventListener("change", onMediaQueryChange);
    setPixelRatio(window.devicePixelRatio);
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
      })
    }
  }, [file, saveData, setCurrentKey])

  useEffect(() => {
    if (spielZettelData !== null) {
      setElementInfoState(spielZettelData.dataJSON.elements ?? null);
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
    setElementInfoState(null);

    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    console.log("drawCanvas", canvas, canvas?.width, canvas?.height, window.innerWidth, window.innerHeight)
    if (canvas === null || spielZettelData === null || elementInfoState === null || image === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    //const dpr = window.devicePixelRatio;
    //const rect = canvas.getBoundingClientRect();
    //canvas.width = rect.width * dpr;
    //canvas.height = rect.height * dpr;
    //canvas.style.width = `${rect.width}px`;
    //canvas.style.height = `${rect.height}px`;
    //ctx.save();
    //ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image centered
    const newElements = render(canvas, ctx, image, elementInfoState, debug);
    setElementInfoState(newElements);
    //ctx.restore();
  }, [debug, elementInfoState, image, spielZettelData]);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("handleCanvasClick");
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || elementInfoState === null || image === null) return;

    const newElements = handleInputs(canvas, image, event, elementInfoState, debug, setRefresh);
    setElementInfoState(newElements);
  }, [debug, elementInfoState, spielZettelData, image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      setRefresh(false);
      drawCanvas();
    }
  }, [spielZettelData, elementInfoState, debug, refresh, drawCanvas, pixelRatio]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        drawCanvas(); // Redraw the canvas content after resizing
      }
    };

    // Set initial canvas size
    resizeCanvas();

    // Add resize event listener
    window.addEventListener("resize", resizeCanvas);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [spielZettelData, elementInfoState, drawCanvas]);

  const name = useMemo<string | null>(() => {
    if (spielZettelData === null) return null;
    const info = spielZettelData.dataJSON;
    return `${info.name} (v${info.version.major}.${info.version.minor}.${info.version.patch})`;
  }, [spielZettelData]);

  const debugString = useMemo<string | null>(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;
    const rect = canvas.getBoundingClientRect();
    return `canvasSize=${canvas?.width}x${canvas?.height}, windowSize=${window.innerWidth}x${window.innerHeight}, screenSize=${window.screen.width}x${window.screen.height},rectSize=${rect.width}x${rect.height}, pixelRatio=${pixelRatio}, refresh=${refresh}`;
  }, [pixelRatio, refresh]);

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

  const closeOverlay = useCallback((event: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
    // Check if the click target is not a button or its child
    if (event.target === event.currentTarget) {
      setOverlayVisible(false);
    }
  }, []);

  const toggleDebug = useCallback(() => {
    if (!debug) {
      window.alert(debugString);
    }
    setDebug(!debug);
  }, [debug, debugString]);

  return (
    <div style={styles.container}>
      {spielZettelData === null && fileUpload}
      {/* Top-right button */}
      {spielZettelData !== null && (
        <button style={styles.topRightButton} onClick={toggleOverlay}>
          {overlayVisible ? "Close" : "Menu"}
        </button>
      )}

      {/* Overlay with controls */}
      {overlayVisible && spielZettelData !== null && (
        <div style={styles.overlay}
          onClick={closeOverlay}>
          <div style={styles.controls}>
            {fileUpload}
            <button style={styles.button} onClick={resetCanvas}>
              Reset {name}
            </button>
            <button style={styles.button} onClick={shareScreenshot}>
              Share Screenshot
            </button>
            <button style={styles.button} onClick={toggleDebug}>
              Debug: {debug ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}

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
