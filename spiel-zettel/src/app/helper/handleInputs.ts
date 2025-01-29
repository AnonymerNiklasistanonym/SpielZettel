import type { MouseEvent as ReactMouseEvent, RefObject } from "react";

import { evaluateRules, type SpielZettelElementState } from "./evaluateRule";
import type { SpielZettelElement, SpielZettelRuleSet } from "./readFile";
import { DebugInformation, scalePosition, scaleSize } from "./render";

function elementClicked(
  element: SpielZettelElement,
  mouseX: number,
  mouseY: number,
  imgX: number,
  imgY: number,
  scale: number,
): [boolean, boolean] {
  // Get the scaled position and size
  const scaledPosition = scalePosition(element.position, imgX, imgY, scale);
  const scaledSize = scaleSize(element.size, scale);

  // Calculate the top-left corner of the element
  const topLeftX = scaledPosition.x - scaledSize.width / 2;
  const topLeftY = scaledPosition.y - scaledSize.height / 2;

  // Check if the click is inside the element
  const insideElement =
    mouseX >= topLeftX &&
    mouseX <= topLeftX + scaledSize.width &&
    mouseY >= topLeftY &&
    mouseY <= topLeftY + scaledSize.height;

  const bottomDebugThreshold = topLeftY + scaledSize.height * 0.6;
  const insideBottomDebugArea = insideElement && mouseY >= bottomDebugThreshold;

  return [insideElement, insideBottomDebugArea];
}

export function handleInputs(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[]>,
  ruleSet: RefObject<SpielZettelRuleSet | null>,
  onDisabled: () => void,
  debugRef: RefObject<DebugInformation>,
  debug: boolean,
): boolean {
  let refresh = false;
  // Get mouse position relative to the canvas
  const canvasRect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - canvasRect.left;
  const mouseY = event.clientY - canvasRect.top;

  // Calculate scale to fit the image inside the canvas while preserving aspect ratio
  const dpr = window.devicePixelRatio || 1; // Fallback to 1 if dpr is not defined
  const canvasWidth = canvas.width / dpr;
  const canvasHeight = canvas.height / dpr;
  const imgWidth = image.width;
  const imgHeight = image.height;
  const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
  const imgX = (canvasWidth - imgWidth * scale) / 2;
  const imgY = (canvasHeight - imgHeight * scale) / 2;

  // Loop through the elements and check if any element is clicked
  for (const element of elements) {
    const [clickedInside, clickedInsideDebug] = elementClicked(
      element,
      mouseX,
      mouseY,
      imgX,
      imgY,
      scale,
    );
    if (debug && clickedInsideDebug) {
      // Debug elements
      const state = states.current?.find((a) => a.id === element.id);
      window.alert(JSON.stringify({ element, state, ruleSet }, undefined, 4));
    } else if (clickedInside) {
      const existingElementState = states.current?.find(
        (a) => a.id === element.id,
      );
      const elementState: SpielZettelElementState = existingElementState ?? {
        id: element.id,
      };
      if (elementState.disabled === true) {
        onDisabled();
      } else {
        // Prompt the user for a new value if the element is clicked
        switch (element.type) {
          case "checkbox":
            elementState.value =
              typeof elementState.value === "boolean"
                ? !elementState.value
                : true; // Toggle boolean
            refresh = true;
            break;
          case "number":
            const newValueNumber = prompt(
              "Enter a new number:",
              elementState.value !== undefined
                ? elementState.value.toString()
                : "",
            );
            const newNumber =
              newValueNumber !== null &&
              newValueNumber.trim() !== "" &&
              !isNaN(Number(newValueNumber))
                ? Number(newValueNumber)
                : null;
            if (newNumber === null) {
              refresh = elementState.value !== undefined;
              delete elementState.value;
            } else {
              refresh = elementState.value !== newNumber;
              elementState.value = newNumber;
            }
            break;
          case "string":
            const newValue = prompt(
              "Enter a new value:",
              elementState.value !== undefined ? `${elementState.value}` : "",
            );
            if (newValue !== null) {
              refresh = elementState.value !== newValue;
              elementState.value = newValue; // Update string
            }
            break;
          default:
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            console.warn(`Unsupported element type: ${element.type}`);
            break;
        }
      }
      if (refresh && existingElementState === undefined) {
        states.current?.push(elementState);
      }
    }
  }

  if (refresh && ruleSet.current !== null) {
    const [, info] = evaluateRules(ruleSet.current, elements, states);
    if (info) {
      debugRef.current = { ...debugRef.current, ...info };
    }
  }

  return refresh;
}
