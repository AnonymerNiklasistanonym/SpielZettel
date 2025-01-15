import type { RefObject } from "react";
import { createContext, Script } from "vm";

import type { SpielZettelElement, SpielZettelRuleSet } from "./readFile";

export interface SpielZettelElementState {
  /** The unique ID of the element */
  id: string;
  /** The value of the element */
  value?: string | number | boolean;
  /** If disabled */
  disabled?: boolean;
}

export function evaluateRule(
  ruleSet: SpielZettelRuleSet,
  element: SpielZettelElement,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[] | null>,
): void {
  const existingElementState = states.current?.find((a) => a.id === element.id);
  const elementState = existingElementState ?? { id: element.id };
  if (element.rules === undefined || !(ruleSet.name in element.rules)) {
    console.warn(`Found no rule for element '${elementState.id}'`);
    return;
  }
  const rule = element.rules[ruleSet.name];
  const objects = {
    current: {
      id: elementState.id,
      type: element.type,
      value: elementState.value,
    },
    elements: elements.map(({ id, type }) => {
      const existingState = states.current?.find((a) => a.id === id);
      return { id, type, ...existingState };
    }),
  };
  const opNAreChecked = (
    operation: "exact" | "min" | "max" | "all",
    n: number,
    ...ids: string[]
  ) => {
    const relevantElements = objects.elements.filter(
      (a) => ids.includes(a.id) && a.type === "checkbox",
    );
    const checkedElements = relevantElements.filter((a) => a.value === true);
    switch (operation) {
      case "all":
        return checkedElements.length === relevantElements.length;
      case "exact":
        return checkedElements.length === n;
      case "min":
        return checkedElements.length >= n;
      case "max":
        return checkedElements.length <= n;
    }
  };
  const helpers = {
    nOrMoreAreChecked: (n: number, ...ids: string[]) =>
      opNAreChecked("min", n, ...ids),
    nOrLessAreChecked: (n: number, ...ids: string[]) =>
      opNAreChecked("max", n, ...ids),
    allAreChecked: (...ids: string[]) => opNAreChecked("all", -1, ...ids),
    nAreChecked: (n: number, ...ids: string[]) =>
      opNAreChecked("exact", n, ...ids),
    countChecked: (...ids: string[]) => {
      console.log("b", objects.elements, ids);
      return objects.elements.filter(
        (a) => ids.includes(a.id) && a.type === "checkbox" && a.value === true,
      ).length;
    },
    sum: (...ids: string[]) =>
      objects.elements
        .filter((a) => ids.includes(a.id) && a.type === "number")
        .reduce(
          (prev, curr) =>
            typeof curr.value === "number" ? prev + curr.value : prev,
          0,
        ),
  };
  const customFunctions: { [name: string]: unknown } = {};
  if (ruleSet.customFunctions !== undefined) {
    for (const [name, func] of Object.entries(ruleSet.customFunctions)) {
      try {
        const [funcArgs, funcBody] = func;
        customFunctions[name] = new Function(funcArgs, funcBody); // Use Function constructor to create a callable function
      } catch (error) {
        throw Error(`Invalid custom function "${name}": ${func}`, {
          cause: error,
        });
      }
    }
  }
  // Prepare the sandbox
  let updatedState: SpielZettelElementState | null = null;
  const sandbox = {
    ...objects,
    ...helpers,
    customFunctions,
    console,
    updateState: (newState: Partial<SpielZettelElementState>) => {
      updatedState = {
        value: objects.current.value,
        ...newState,
        id: objects.current.id,
      };
    },
  };

  // Create a context and execute the rule
  try {
    const startTime = performance.now();
    const context = createContext(sandbox);
    const endTime1 = performance.now();
    const script = new Script(`
      //const current = { id: "${elementState.id}", type: "${element.type}", value: ${elementState.value} };
      console.log({current, customFunctions, newState: ${rule} });
      updateState(${rule});
    `);
    const endTime2 = performance.now();
    // Run the script in the context
    script.runInContext(context);
    const endTime3 = performance.now();

    // Log the updated result after the script runs
    console.log("Actual result after script execution:", updatedState, {
      createContextMs: endTime1 - startTime,
      createScriptMs: endTime2 - endTime1,
      runInContextMs: endTime3 - endTime2,
    });

    if (updatedState !== null) {
      if (existingElementState === undefined) {
        states.current?.push(updatedState);
      } else {
        if ((updatedState as SpielZettelElementState).disabled !== undefined) {
          existingElementState.disabled = (
            updatedState as SpielZettelElementState
          ).disabled;
        }
        if ((updatedState as SpielZettelElementState).value !== undefined) {
          existingElementState.value = (
            updatedState as SpielZettelElementState
          ).value;
        }
      }
    }
    return;
  } catch (error) {
    throw Error(`Error evaluating rule "${rule}"`, {
      cause: error,
    });
  }
}

export function evaluateRules(
  ruleSet: SpielZettelRuleSet,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[] | null>,
): boolean {
  const objects = {
    elements: elements.map(({ id, type }) => {
      const existingState = states.current?.find((a) => a.id === id);
      return { id, type, ...existingState };
    }),
  };
  const opNAreChecked = (
    operation: "exact" | "min" | "max" | "all",
    n: number,
    ...ids: string[]
  ) => {
    const relevantElements = objects.elements.filter(
      (a) => ids.includes(a.id) && a.type === "checkbox",
    );
    const checkedElements = relevantElements.filter((a) => a.value === true);
    switch (operation) {
      case "all":
        return checkedElements.length === relevantElements.length;
      case "exact":
        return checkedElements.length === n;
      case "min":
        return checkedElements.length >= n;
      case "max":
        return checkedElements.length <= n;
    }
  };
  const helpers = {
    nOrMoreAreChecked: (n: number, ...ids: string[]) =>
      opNAreChecked("min", n, ...ids),
    nOrLessAreChecked: (n: number, ...ids: string[]) =>
      opNAreChecked("max", n, ...ids),
    allAreChecked: (...ids: string[]) => opNAreChecked("all", -1, ...ids),
    nAreChecked: (n: number, ...ids: string[]) =>
      opNAreChecked("exact", n, ...ids),
    countChecked: (...ids: string[]) => {
      console.log("b", objects.elements, ids);
      return objects.elements.filter(
        (a) => ids.includes(a.id) && a.type === "checkbox" && a.value === true,
      ).length;
    },
    sum: (...ids: string[]) =>
      objects.elements
        .filter((a) => ids.includes(a.id) && a.type === "number")
        .reduce(
          (prev, curr) =>
            typeof curr.value === "number" ? prev + curr.value : prev,
          0,
        ),
  };
  const customFunctions: { [name: string]: unknown } = {};
  if (ruleSet.customFunctions !== undefined) {
    for (const [name, func] of Object.entries(ruleSet.customFunctions)) {
      try {
        const [funcArgs, funcBody] = func;
        customFunctions[name] = new Function(funcArgs, funcBody); // Use Function constructor to create a callable function
      } catch (error) {
        throw Error(`Invalid custom function "${name}": ${func}`, {
          cause: error,
        });
      }
    }
  }
  // Prepare the sandbox
  let stateWasUpdated = false;
  const sandbox = {
    ...objects,
    ...helpers,
    customFunctions,
    console,
    updateState: (id: string, newState: Partial<SpielZettelElementState>) => {
      const existingState = states.current?.find((a) => a.id === id);
      if (existingState === undefined) {
        states.current?.push({ id, ...newState });
        stateWasUpdated = true;
      } else {
        if (newState.disabled !== undefined) {
          existingState.disabled = newState.disabled;
          stateWasUpdated = true;
        }
        if (newState.value !== undefined) {
          existingState.value = newState.value;
          stateWasUpdated = true;
        }
      }
    },
  };

  // Create a context and execute the rule
  try {
    const startTime = performance.now();
    const context = createContext(sandbox);
    const endTime1 = performance.now();

    const updateStateCalls = elements
      .map(({ id, rules }) => {
        if (rules !== undefined && ruleSet.name in rules) {
          return `updateState(${id}, ${rules[ruleSet.name]})`;
        }
      })
      .filter((a) => a !== undefined)
      .join(";\n");

    const script = new Script(updateStateCalls);
    const endTime2 = performance.now();
    // Run the script in the context
    script.runInContext(context);
    const endTime3 = performance.now();

    // Log the updated result after the script runs
    console.log("Timings after script execution:", {
      createContextMs: endTime1 - startTime,
      createScriptMs: endTime2 - endTime1,
      runInContextMs: endTime3 - endTime2,
    });

    return stateWasUpdated;
  } catch (error) {
    throw Error(`Error evaluating rules`, {
      cause: error,
    });
  }
}
