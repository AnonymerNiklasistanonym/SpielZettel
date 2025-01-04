import {useState, useRef, useEffect, useCallback} from "react";
import {readSpielZettelFile} from "../helper/readSpielZettelFile";
import type {ChangeEvent, MouseEvent as ReactMouseEvent} from "react";
import type {SpielZettelFileData} from "../helper/readSpielZettelFile";
import {render, type SpielZettelElementInfoState} from "../helper/renderSpielZettel";

function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
    return handle.kind === "file";
}

function InteractiveCanvas() {
  const [file, setFile] = useState<File | null>(null);
  const [elementInfoState, setElementInfoState] = useState<SpielZettelElementInfoState[] | null>(null);
  const [spielZettelData, setSpielZettelData] = useState<SpielZettelFileData | null>(null);
  const [debug, setDebug] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    if (canvas === null || spielZettelData === null || elementInfoState === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image centered
    const image = new Image();
    image.src = spielZettelData.imageBase64;
    image.onload = () => {
      render(canvas, ctx, image, elementInfoState, debug);
      /*
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = image.width;
      const imgHeight = image.height;
      console.log("drawImage1", image, image.width, image.height);

      const scale = Math.min(
        canvasWidth / imgWidth,
        canvasHeight / imgHeight
      );
      const imgX = (canvasWidth - imgWidth * scale) / 2;
      const imgY = (canvasHeight - imgHeight * scale) / 2;

      // Draw the image centered
      ctx.drawImage(image, imgX, imgY, imgWidth * scale, imgHeight * scale);
      console.log("drawImage2", image, imgX, imgY, imgWidth * scale, imgHeight * scale);
      */

      /*
      // Draw checkmark
      if (showCheckmark) {
        ctx.font = "48px Arial";
        ctx.fillStyle = "green";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("X", canvas.width / 2, canvas.height / 2);
      }

      // Draw number
      if (demoNumber !== null) {
        ctx.font = "36px Arial";
        ctx.fillStyle = "blue";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`${demoNumber}`, canvas.width / 2, canvas.height / 2 + 50);
      }
      */
    }
  }, [debug, elementInfoState, spielZettelData]);

  const handleCanvasClick = (event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    /*
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Check if the click is in the center for the checkmark
    const centerRadius = 50; // Clickable radius around the center
    const distToCenter = Math.sqrt(
      Math.pow(x - canvasWidth / 2, 2) + Math.pow(y - canvasHeight / 2, 2)
    );
    if (distToCenter <= centerRadius) {
      setShowCheckmark((prev) => !prev);
    }

    // Check if the click is in the bottom area for number input
    if (y > canvasHeight / 2 + 100 && y < canvasHeight / 2 + 150) {
      const inputNumber = prompt("Enter a number:");
      if (inputNumber !== null) {
        setNumber(Number(inputNumber));
      }
    }
    */
  };

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
    drawCanvas();
  }, [spielZettelData, elementInfoState, debug, drawCanvas]);

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

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <input
          type="file"
          id="file-upload"
          style={styles.fileInput}
          onChange={handleFileUpload}
        />
        <label htmlFor="file-upload" style={styles.button}>
          Upload File
        </label>
        {file !== null ? (
          <button style={styles.button} onClick={resetCanvas}>
            Reset
          </button>
        ) : undefined}
      </div>
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
  },
  controls: {
    position: "absolute",
    top: "10px",
    display: "flex",
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
    marginTop: "50px",
    backgroundColor: "black",
    display: "block",
  },
} as const;

export default InteractiveCanvas;
