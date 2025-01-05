import { scalePosition, scaleSize } from "./render";

import type { SpielZettelElementInfoState } from "./render";
import type { MouseEvent as ReactMouseEvent } from "react";


function elementClicked(
  element: SpielZettelElementInfoState,
  mouseX: number,
  mouseY: number,
  imgX: number,
  imgY: number,
  scale: number
): boolean {
  // Get the scaled position and size
  const scaledPosition = scalePosition(element.position, imgX, imgY, scale);
  const scaledSize = scaleSize(element.size, scale);

  // Calculate the top-left corner of the element
  const topLeftX = scaledPosition.x - scaledSize.width / 2;
  const topLeftY = scaledPosition.y - scaledSize.height / 2;

  return mouseX >= topLeftX && mouseX <= topLeftX + scaledSize.width && mouseY >= topLeftY && mouseY <= topLeftY + scaledSize.height;
}

export function handleInputs(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>,
  elements: SpielZettelElementInfoState[],
  debug = false,
  setRefresh: (newRefresh: boolean) => void
): SpielZettelElementInfoState[] {
  // Get mouse position relative to the canvas
  const canvasRect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - canvasRect.left;
  const mouseY = event.clientY - canvasRect.top;

  // Calculate scale to fit the image inside the canvas while preserving aspect ratio
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const imgWidth = image.width;
  const imgHeight = image.height;
  const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
  const imgX = (canvasWidth - imgWidth * scale) / 2;
  const imgY = (canvasHeight - imgHeight * scale) / 2;

  // Loop through the elements and check if any element is clicked
  for (const element of elements) {
    if (debug) {
      console.log({ mouseX, mouseY }, element, elementClicked(element, mouseX, mouseY, imgX, imgY, scale));
    }
    if (elementClicked(element, mouseX, mouseY, imgX, imgY, scale)) {
      // Prompt the user for a new value if the element is clicked
      switch (element.type) {
        case "checkbox":
          element.value = typeof element.value === "boolean" ? !element.value : true; // Toggle boolean
          setRefresh(true);
          break;
        case "number":
          const newValueNumber = prompt("Enter a new number:", element.value !== undefined ? element.value.toString() : "");
          if (newValueNumber !== null && !isNaN(Number(newValueNumber))) {
            element.value = Number(newValueNumber); // Update number
            setRefresh(true);
          }
          break;
        case "string":
          const newValue = prompt("Enter a new value:", element.value !== undefined ? `${element.value}` : "");
          if (newValue !== null) {
            element.value = newValue; // Update string
            setRefresh(true);
          }
          break;
        default:
          console.warn(`Unsupported element type: ${element.type}`);
          break;
      }
    }
  };

  return elements;
}
