import type { SpielZettelElement } from "./readSpielZettelFile";

export interface SpielZettelElementInfoState extends SpielZettelElement {
    value?: string | number | boolean;
}

export function render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement, elements: SpielZettelElementInfoState[], debug = false): SpielZettelElementInfoState[] {

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = image.width;
    const imgHeight = image.height;

    // Calculate scale and center the image
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const imgX = (canvasWidth - imgWidth * scale) / 2;
    const imgY = (canvasHeight - imgHeight * scale) / 2;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image centered
    ctx.drawImage(image, imgX, imgY, imgWidth * scale, imgHeight * scale);

    // Scale helper functions for element positions and sizes
    const scalePosition = (pos: { x: number; y: number }) => ({
      x: imgX + pos.x * scale,
      y: imgY + pos.y * scale,
    });
    const scaleSize = (size: { width: number; height: number }) => ({
      width: size.width * scale,
      height: size.height * scale,
    });

    // Draw the elements
    for (const element of elements) {
      const scaledPosition = scalePosition(element.position);
      const scaledSize = scaleSize(element.size);

      // Convert center-based position to top-left position
      const topLeftX = scaledPosition.x - scaledSize.width / 2;
      const topLeftY = scaledPosition.y - scaledSize.height / 2;

      ctx.save(); // Save context state
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;

      // Draw the main element
      switch (element.type) {
        case "number":
          ctx.strokeRect(
            topLeftX,
            topLeftY,
            scaledSize.width,
            scaledSize.height
          );
          ctx.font = `${12 * scale}px Arial`;
          ctx.fillStyle = "black";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            element.value?.toString() ?? "",
            scaledPosition.x, // Center the text
            scaledPosition.y // Center the text
          );
          break;

        case "checkbox":
          ctx.strokeRect(
            topLeftX,
            topLeftY,
            scaledSize.width,
            scaledSize.height
          );
          if (element.value) {
            ctx.beginPath();
            ctx.moveTo(topLeftX, topLeftY);
            ctx.lineTo(topLeftX + scaledSize.width, topLeftY + scaledSize.height);
            ctx.moveTo(topLeftX + scaledSize.width, topLeftY);
            ctx.lineTo(topLeftX, topLeftY + scaledSize.height);
            ctx.stroke();
          }
          break;

        case "string":
          ctx.strokeRect(
            topLeftX,
            topLeftY,
            scaledSize.width,
            scaledSize.height
          );
          ctx.font = `${12 * scale}px Arial`;
          ctx.fillStyle = "black";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(
            element.value?.toString() ?? "",
            topLeftX + 5, // Left-align the text inside the box
            topLeftY + scaledSize.height / 2
          );
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
    }

    return elements;

  return elements;
}
