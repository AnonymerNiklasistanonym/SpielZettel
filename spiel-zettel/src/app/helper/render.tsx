import type { RefObject } from "react";
import type { SpielZettelElementState } from "./evaluateRule";
import type { SpielZettelElement } from "./readFile";

export type SpielZettelElementInfo = SpielZettelElement & SpielZettelElementState;

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
    element: SpielZettelElementInfo,
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

    if (element.disabled) {
        ctx.lineWidth = 15 * scale;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(topLeftX, topLeftY);
        ctx.lineTo(topLeftX, topLeftY + scaledSize.height);
        ctx.moveTo(topLeftX + scaledSize.width * 1/3, topLeftY);
        ctx.lineTo(topLeftX + scaledSize.width * 1/3, topLeftY + scaledSize.height);
        ctx.moveTo(topLeftX + scaledSize.width * 2/3, topLeftY);
        ctx.lineTo(topLeftX + scaledSize.width * 2/3, topLeftY + scaledSize.height);
        ctx.moveTo(topLeftX + scaledSize.width, topLeftY);
        ctx.lineTo(topLeftX + scaledSize.width, topLeftY + scaledSize.height);
        ctx.stroke();
        ctx.lineWidth = 2;
    } else {
        switch (element.type) {
            case "number":
                ctx.font = `${70 * scale}px Arial`;
                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(elementState?.value?.toString() ?? "", scaledPosition.x, scaledPosition.y);
                break;

            case "checkbox":
                if (elementState?.value) {
                    ctx.lineWidth = 15 * scale;
                    ctx.strokeStyle = "rgba(0,0,0,0.5)";
                    ctx.beginPath();
                    ctx.moveTo(topLeftX, topLeftY);
                    ctx.lineTo(topLeftX + scaledSize.width, topLeftY + scaledSize.height);
                    ctx.moveTo(topLeftX + scaledSize.width, topLeftY);
                    ctx.lineTo(topLeftX, topLeftY + scaledSize.height);
                    ctx.stroke();
                    ctx.lineWidth = 2;
                }
                break;

            case "string":
                if (element.value) {
                    ctx.font = `${12 * scale}px Arial`;
                    ctx.fillStyle = "black";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillText(elementState?.value?.toString() ?? "", topLeftX + 5, topLeftY + scaledSize.height / 2);
                }
                break;
            default:
                console.warn(`Unsupported element type: ${element.type}`);
        }
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

export function render(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    elements: SpielZettelElementInfo[],
    elementStates: RefObject<SpielZettelElementState[] | null>,
    debug = false
): void {
    if (debug) {
        console.debug("render");
    }

    const dpr = window.devicePixelRatio || 1; // Fallback to 1 if dpr is not defined
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the context to match the device pixel ratio
    ctx.save();
    ctx.scale(dpr, dpr);

    // Ensure the canvas is displayed at the correct size
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

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

    // Draw the image centered
    ctx.drawImage(image, imgXScaled, imgYScaled, scaledWidth, scaledHeight);

    // Draw the elements on top of the image
    for (const element of elements) {
        const scaledPosition = scalePosition(element.position, imgX, imgY, scale);
        const scaledSize = scaleSize(element.size, scale);
        const elementState = elementStates.current?.find(a => a.id === element.id) ?? null;

        drawElement(ctx, element, elementState, scaledPosition, scaledSize, scale, debug);
    };
    ctx.restore();
}
