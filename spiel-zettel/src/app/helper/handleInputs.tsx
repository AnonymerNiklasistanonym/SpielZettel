import type { MouseEvent as ReactMouseEvent, RefObject } from "react";

import {
  evaluateRule,
  EvaluateRuleDebugInfo,
  evaluateRules,
  type SpielZettelElementState,
} from "./evaluateRule";
import type { SpielZettelElement, SpielZettelRuleSet } from "./readFile";
import { DebugInformation, scalePosition, scaleSize } from "./render";

function elementClicked(
  element: SpielZettelElement,
  mouseX: number,
  mouseY: number,
  imgX: number,
  imgY: number,
  scale: number,
): boolean {
  // Get the scaled position and size
  const scaledPosition = scalePosition(element.position, imgX, imgY, scale);
  const scaledSize = scaleSize(element.size, scale);

  // Calculate the top-left corner of the element
  const topLeftX = scaledPosition.x - scaledSize.width / 2;
  const topLeftY = scaledPosition.y - scaledSize.height / 2;

  return (
    mouseX >= topLeftX &&
    mouseX <= topLeftX + scaledSize.width &&
    mouseY >= topLeftY &&
    mouseY <= topLeftY + scaledSize.height
  );
}

export function handleInputs(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  event: ReactMouseEvent<HTMLCanvasElement, MouseEvent>,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[]>,
  ruleSet: RefObject<SpielZettelRuleSet | null>,
  debugRef: RefObject<DebugInformation>,
  debug = false,
  evaluateRulesNew = false,
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
    if (debug) {
      console.log(
        { mouseX, mouseY },
        element,
        elementClicked(element, mouseX, mouseY, imgX, imgY, scale),
      );
    }
    if (elementClicked(element, mouseX, mouseY, imgX, imgY, scale)) {
      const existingElementState = states.current?.find(
        (a) => a.id === element.id,
      );
      const elementState: SpielZettelElementState = existingElementState ?? {
        id: element.id,
      };
      if (elementState.disabled === true) {
        window.alert(
          "Unable to edit. Element is disabled by the current rule set!",
        );
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
            if (newValueNumber !== null && !isNaN(Number(newValueNumber))) {
              elementState.value = Number(newValueNumber); // Update number
              refresh = true;
            }
            break;
          case "string":
            const newValue = prompt(
              "Enter a new value:",
              elementState.value !== undefined ? `${elementState.value}` : "",
            );
            if (newValue !== null) {
              elementState.value = newValue; // Update string
              refresh = true;
            }
            break;
          default:
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
    if (evaluateRulesNew) {
      evaluateRules(ruleSet.current, elements, states);
    } else {
      const info = evaluateRulesOld(ruleSet.current, elements, states);
      if (info) {
        debugRef.current.createContextMs = info.createContextMs;
        debugRef.current.createScriptMs = info.createScriptMs;
        debugRef.current.runInContextMs = info.runInContextMs;
      }
    }
  }

  return refresh;
}

export function evaluateRulesOld(
  ruleSet: SpielZettelRuleSet,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[] | null>,
) {
  if (ruleSet === null) return;
  const infos: EvaluateRuleDebugInfo[] = [];
  for (const element of elements) {
    const info = evaluateRule(ruleSet, element, elements, states);
    if (info) {
      infos.push(info);
    }
  }
  return infos.reduce(
    (prev, curr) => ({
      createContextMs: prev.createContextMs + curr.createContextMs,
      createScriptMs: prev.createScriptMs + curr.createScriptMs,
      runInContextMs: prev.runInContextMs + curr.runInContextMs,
    }),
    {
      createContextMs: 0,
      createScriptMs: 0,
      runInContextMs: 0,
    },
  );
}
