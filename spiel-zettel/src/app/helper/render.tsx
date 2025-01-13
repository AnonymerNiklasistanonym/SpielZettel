import type { RefObject } from "react";
import type { SpielZettelElementState } from "./evaluateRule";
import type { SpielZettelElement } from "./readFile";

// Scale helper functions for element positions and sizes
export const scalePosition = (pos: { x: number; y: number }, imgX: number, imgY: number, scale: number) => ({
    x: imgX + pos.x * scale,
    y: imgY + pos.y * scale,
});

export const scaleSize = (size: { width: number; height: number }, scale: number) => ({
    width: size.width * scale,
    height: size.height * scale,
});

const drawElement = (
    ctx: CanvasRenderingContext2D,
    element: SpielZettelElement,
    elementState: SpielZettelElementState | null,
    scaledPosition: { x: number; y: number },
    scaledSize: { width: number; height: number },
    scale: number,
    debug = false
) => {
    const topLeftX = scaledPosition.x - scaledSize.width / 2;
    const topLeftY = scaledPosition.y - scaledSize.height / 2;

    ctx.save(); // Save context state
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    if (debug) {
        ctx.strokeRect(topLeftX, topLeftY, scaledSize.width, scaledSize.height);
    }

    const drawDisabled = () => {
        ctx.save();
        ctx.lineWidth = 15 * scale;
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
    }

    switch (element.type) {
        case "number":
            ctx.font = `${70 * scale}px Arial`;
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(elementState?.value?.toString() ?? "", scaledPosition.x, scaledPosition.y);
            break;

        case "checkbox":
            if (elementState?.disabled === true && (elementState.value === false || elementState.value === undefined)) {
                drawDisabled();
            }
            if (elementState?.value) {
                ctx.save();
                ctx.lineWidth = 15 * scale;
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

        case "string":
            if (elementState?.value) {
                ctx.save();
                ctx.font = `${12 * scale}px Arial`;
                ctx.fillStyle = "black";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(elementState?.value?.toString() ?? "", topLeftX + 5, topLeftY + scaledSize.height / 2);
                ctx.restore();
            }
            break;
        default:
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
            labelHeight
        );

        ctx.font = `${10 * scale}px Arial`;
        ctx.fillStyle = "white"; // Text color
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            `${element.type}: ${element.id}`,
            scaledPosition.x, // Center the text horizontally
            topLeftY - labelHeight / 2 - labelPadding // Center the text vertically in the label
        );
    }

    ctx.restore(); // Restore context state
};

export interface DebugInformation {
    lastEvaluateRulesMs?: number;
    lastEvaluateRulesMsCreateContextSum?: number;
    lastDrawCanvasMs?: number;
}

export function render(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    elements: SpielZettelElement[],
    elementStates: RefObject<SpielZettelElementState[] | null>,
    debug = false,
    debugInformation: DebugInformation = {},
): void {
    console.debug("render", canvas, ctx, image, elements, elementStates, debug);

    const dpr = window.devicePixelRatio || 1; // Fallback to 1 if dpr is not defined
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the context to match the device pixel ratio
    ctx.save();
    ctx.scale(dpr, dpr);
    console.debug("render scale", dpr, dpr);

    // Ensure the canvas is displayed at the correct size
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    console.debug("render canvas.style", canvas.style);

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
    console.debug("render clearRect", canvas.width, canvas.height);

    // Draw the image centered
    ctx.drawImage(image, imgXScaled, imgYScaled, scaledWidth, scaledHeight);
    console.debug("render image", imgXScaled, imgYScaled, scaledWidth, scaledHeight);

    // Draw the elements on top of the image
    for (const element of elements) {
        const scaledPosition = scalePosition(element.position, imgX, imgY, scale);
        const scaledSize = scaleSize(element.size, scale);
        const elementState = elementStates.current?.find(a => a.id === element.id) ?? null;

        drawElement(ctx, element, elementState, scaledPosition, scaledSize, scale, debug);
    };
    ctx.restore();
    if (debug) {
        ctx.save();
        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.fillRect(
            0,
            0,
            200,
            100
        );
        const texts: [string, string][] = [
            ["currentTime", new Date().toLocaleTimeString()],
        ];
        if (debugInformation.lastDrawCanvasMs !== undefined) {
            texts.push(["lastDrawCanvasMs", `${debugInformation.lastDrawCanvasMs}ms`]);
        }
        if (debugInformation.lastEvaluateRulesMs !== undefined) {
            texts.push(["lastEvaluateRulesMs", `${debugInformation.lastEvaluateRulesMs}ms`]);
        }
        ctx.font = "30px Arial";
        ctx.fillStyle = "white";
        let y = 25;
        for (const text of texts) {
            ctx.fillText(text.join(": "), 5, y);
            y += 25;
        }
        ctx.restore();
    }
}
