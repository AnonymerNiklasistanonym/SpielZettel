import type { RefObject } from "react";

import type {
  EvaluateRuleDebugInfo,
  SpielZettelElementState,
} from "./evaluateRule";
import type { SpielZettelElement } from "./readFile";

// Scale helper functions for element positions and sizes
export const scalePosition = (
  pos: { x: number; y: number },
  imgX: number,
  imgY: number,
  scale: number,
) => ({
  x: imgX + pos.x * scale,
  y: imgY + pos.y * scale,
});

export const scaleSize = (
  size: { width: number; height: number },
  scale: number,
) => ({
  width: size.width * scale,
  height: size.height * scale,
});

export const defaultFontFamily = 'Geist, "Geist Fallback", Arial';

const drawTextInRect = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  scaledPosition: { x: number; y: number },
  scaledSize: { width: number; height: number },
  scale: number,
) => {
  ctx.save();
  let factor = 1;
  while (factor > 0.4) {
    ctx.font = `${fontSize * scale * factor}px ${defaultFontFamily}`;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textMetrics = ctx.measureText(text);
    if (textMetrics.width > scaledSize.width * 0.95) {
      factor = factor * 0.9;
      continue;
    }
    const textHeight =
      textMetrics.actualBoundingBoxAscent +
      textMetrics.actualBoundingBoxDescent;
    const adjustedY =
      scaledPosition.y + textHeight / 2 - textMetrics.actualBoundingBoxDescent;
    ctx.fillText(text, scaledPosition.x, adjustedY);
    break;
  }
  ctx.restore();
};

const items: string[] = ["green", "blue", "red", "purple"];

const drawElement = (
  ctx: CanvasRenderingContext2D,
  element: SpielZettelElement,
  elementState: SpielZettelElementState | null,
  scaledPosition: { x: number; y: number },
  scaledSize: { width: number; height: number },
  scale: number,
  debug = false,
) => {
  const topLeftX = scaledPosition.x - scaledSize.width / 2;
  const topLeftY = scaledPosition.y - scaledSize.height / 2;

  ctx.save(); // Save context state

  if (debug) {
    ctx.strokeStyle = items[Math.floor(Math.random() * items.length)];
    ctx.lineWidth = 2;
    ctx.strokeRect(topLeftX, topLeftY, scaledSize.width, scaledSize.height);
    const bottomThreshold = topLeftY + scaledSize.height * 0.6;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(
      topLeftX,
      bottomThreshold,
      scaledSize.width,
      scaledSize.height * 0.4,
    );
  }

  const drawDisabled = () => {
    ctx.save();
    ctx.lineWidth =
      Math.min(element.size.height, element.size.width) * 0.1 * scale;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.moveTo(topLeftX + scaledSize.width, topLeftY);
    ctx.lineTo(topLeftX, topLeftY + scaledSize.height);
    ctx.moveTo(topLeftX + scaledSize.width * 0.75, topLeftY);
    ctx.lineTo(topLeftX, topLeftY + scaledSize.height * 0.75);
    ctx.moveTo(topLeftX + scaledSize.width, topLeftY + scaledSize.height / 4);
    ctx.lineTo(topLeftX + scaledSize.width / 4, topLeftY + scaledSize.height);
    ctx.stroke();
    ctx.restore();
  };

  switch (element.type) {
    case "checkbox":
      if (
        elementState?.disabled === true &&
        (elementState.value === false || elementState.value === undefined)
      ) {
        drawDisabled();
      } else if (elementState?.value && elementState.value === true) {
        ctx.save();
        ctx.lineWidth =
          Math.min(element.size.height, element.size.width) * 0.18 * scale;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.moveTo(topLeftX, topLeftY);
        ctx.lineTo(topLeftX + scaledSize.width, topLeftY + scaledSize.height);
        ctx.moveTo(topLeftX + scaledSize.width, topLeftY);
        ctx.lineTo(topLeftX, topLeftY + scaledSize.height);
        ctx.stroke();
        ctx.restore();
      }
      break;

    case "options":
    case "number":
    case "string":
      if (
        elementState?.disabled === true &&
        (elementState.value === undefined ||
          (typeof elementState.value === "string" &&
            elementState.value.trim() === ""))
      ) {
        drawDisabled();
      } else if (
        elementState?.value !== undefined &&
        ((typeof elementState.value === "string" &&
          elementState.value.trim() !== "") ||
          typeof elementState.value === "number")
      ) {
        drawTextInRect(
          ctx,
          `${elementState?.value}`,
          element.size.height * 0.75,
          scaledPosition,
          scaledSize,
          scale,
        );
      }
      break;
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.warn(`Unsupported element type: ${element.type}`);
  }

  // Draw debug label with element ID
  if (debug) {
    const labelPadding = 5 * scale;
    const labelHeight = 20 * scale;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent background
    ctx.fillRect(
      topLeftX, // Align with the element's top-left corner
      topLeftY - labelHeight - labelPadding, // Place above the element
      scaledSize.width, // Match the element's width
      labelHeight,
    );

    ctx.font = `${labelHeight * 0.9}px ${defaultFontFamily}`;
    ctx.fillStyle = "white"; // Text color
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${element.type}: ${element.id}`,
      scaledPosition.x, // Center the text horizontally
      topLeftY - labelHeight / 2 - labelPadding, // Center the text vertically in the label
    );
  }

  ctx.restore(); // Restore context state
};

export interface DebugInformation extends Partial<EvaluateRuleDebugInfo> {
  handleInputsMs?: number;
  previousDrawCanvasMs?: number;
  drawCall?: number;
}

export function render(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  elements: SpielZettelElement[],
  elementStates: RefObject<SpielZettelElementState[] | null>,
  fixSize = false,
  antiAliasing = true,
  debug = false,
  debugInformation: DebugInformation = {},
): void {
  if (debug) {
    console.debug("render", canvas, ctx, image, elements, elementStates, debug);
  }

  const dpr = window.devicePixelRatio || 1; // Fallback to 1 if dpr is not defined

  // Ensure the canvas is displayed at the correct size
  if (fixSize) {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  // Scale the context to match the device pixel ratio
  ctx.save();
  ctx.scale(dpr, dpr);

  const canvasWidth = canvas.width / dpr;
  const canvasHeight = canvas.height / dpr;
  const imgWidth = image.width;
  const imgHeight = image.height;

  // Calculate scale to fit the image inside the canvas while preserving aspect ratio
  const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
  const imgX = (canvasWidth - imgWidth * scale) / 2;
  const imgY = (canvasHeight - imgHeight * scale) / 2;

  // Scale and center the image
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;

  const imgXScaled = (canvasWidth - scaledWidth) / 2;
  const imgYScaled = (canvasHeight - scaledHeight) / 2;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the image centered (and anti-aliasing)
  ctx.save();
  if (antiAliasing) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }
  ctx.drawImage(image, imgXScaled, imgYScaled, scaledWidth, scaledHeight);
  ctx.restore();

  // Draw the elements on top of the image
  for (const element of elements) {
    const scaledPosition = scalePosition(element.position, imgX, imgY, scale);
    const scaledSize = scaleSize(element.size, scale);
    const elementState =
      elementStates.current?.find((a) => a.id === element.id) ?? null;

    drawElement(
      ctx,
      element,
      elementState,
      scaledPosition,
      scaledSize,
      scale,
      debug,
    );
  }
  ctx.restore();
  if (debug) {
    const texts: [string, string][] = [
      ["currentTime", new Date().toLocaleTimeString()],
    ];
    if (debugInformation.drawCall !== undefined) {
      texts.push(["drawCall", `${debugInformation.drawCall}`]);
    }
    if (debugInformation.previousDrawCanvasMs !== undefined) {
      texts.push([
        "lastDrawCanvasMs",
        `${debugInformation.previousDrawCanvasMs}ms`,
      ]);
    }
    if (debugInformation.handleInputsMs !== undefined) {
      texts.push(["handleInputsMs", `${debugInformation.handleInputsMs}ms`]);
    }
    if (debugInformation.createContextMs !== undefined) {
      texts.push(["createContextMs", `${debugInformation.createContextMs}ms`]);
    }
    if (debugInformation.createScriptMs !== undefined) {
      texts.push(["createScriptMs", `${debugInformation.createScriptMs}ms`]);
    }
    if (debugInformation.runInContextMs !== undefined) {
      texts.push(["runInContextMs", `${debugInformation.runInContextMs}ms`]);
    }
    if (debugInformation.evaluationCount !== undefined) {
      texts.push(["evaluationCount", `${debugInformation.evaluationCount}`]);
    }
    ctx.save();
    ctx.fillStyle = "rgb(255, 0, 0)";
    ctx.fillRect(0, 0, 400, 30 * (texts.length + 1));
    ctx.font = "30px Arial";
    ctx.fillStyle = "white";
    let y = 45;
    for (const text of texts) {
      ctx.fillText(text.join(": "), 5, y);
      y += 30;
    }
    ctx.restore();
  }
}
