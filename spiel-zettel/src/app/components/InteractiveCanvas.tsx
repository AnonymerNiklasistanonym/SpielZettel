import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { readSpielZettelFile } from "../helper/readSpielZettelFile";
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import type { SpielZettelFileData } from "../helper/readSpielZettelFile";
import { render, type SpielZettelElementInfoState } from "../helper/renderSpielZettel";
import { handleInputs } from "../helper/handleSpielZettelInputs";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible(!overlayVisible);
  }, [overlayVisible]);

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
    // Define the key press handler
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'd') {
        setDebug((prev) => !prev); // Toggle the debug value
        console.log('Debug mode:', !debug);
      }
    };

    // Add the event listener
    window.addEventListener('keydown', handleKeyPress);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [debug]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      console.log("File received (upload):", uploadedFile);
      setFile(uploadedFile);
    }
  };

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
        setElementInfoState(data.dataJSON.elements ?? null);
        const img = new Image();
        img.src = data.imageBase64;
        img.onload = () => {
          setImage(img); // Store the image in state
        };
      })
    }
  }, [file])

  const resetCanvas = () => {
    setFile(null);
    setSpielZettelData(null);
    setElementInfoState(null);

    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    console.log("drawCanvas", canvas, canvas?.width, canvas?.height)
    if (canvas === null || spielZettelData === null || elementInfoState === null || image === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image centered
    const newElements = render(canvas, ctx, image, elementInfoState, debug);
    setElementInfoState(newElements);
  }, [debug, elementInfoState, image, spielZettelData]);

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    console.log("handleCanvasClick");
    const canvas = canvasRef.current;
    if (canvas === null || spielZettelData === null || elementInfoState === null || image === null) return;

    const newElements = handleInputs(canvas, image, event, elementInfoState, debug, setRefresh);
    setElementInfoState(newElements);
  }, [debug, elementInfoState, spielZettelData, image]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
    setRefresh(false);
    drawCanvas();
  }, [spielZettelData, elementInfoState, debug, refresh, drawCanvas]);

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
  }, [canvasRef]);

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
  </>, []);

  return (
    <div style={styles.container}>
      {file === null && fileUpload}
      {/* Top-right button */}
      {file !== null && (
        <button style={styles.topRightButton} onClick={toggleOverlay}>
          {overlayVisible ? "Close" : "Menu"}
        </button>
      )}

      {/* Overlay with controls */}
      {overlayVisible && file !== null && (
        <div style={styles.overlay}
          onClick={(e) => {
            // Check if the click target is not a button or its child
            if (e.target === e.currentTarget) {
              setOverlayVisible(false);
            }
          }}>
          <div style={styles.controls}>
            {fileUpload}
            <button style={styles.button} onClick={resetCanvas}>
              Reset {name}
            </button>
            <button style={styles.button} onClick={shareScreenshot}>
              Share Screenshot
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
    display: "block",
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
