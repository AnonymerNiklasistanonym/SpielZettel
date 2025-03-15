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

export interface EvaluateRuleDebugInfo {
  createContextMs: number;
  createScriptMs: number;
  runInContextMs: number;
  evaluationCount: number;
}

export const helperFunctions = Object.freeze({
  checkbox: Object.freeze({
    /** (n: number, ...ids: string[]) => boolean */
    nOrMoreAreChecked: {
      name: "nOrMoreAreChecked",
    },
    /** (n: number, ...ids: string[]) => boolean */
    nOrLessAreChecked: {
      name: "nOrLessAreChecked",
    },
    /** (n: number, ...ids: string[]) => boolean */
    nAreChecked: {
      name: "nAreChecked",
    },
    /** (...ids: string[]) => boolean */
    allAreChecked: {
      name: "allAreChecked",
    },
    /** (...ids: string[]) => number */
    countChecked: {
      name: "countChecked",
    },
  }),
  number: Object.freeze({
    /** (...ids: string[]) => number */
    sum: Object.freeze({
      name: "sum",
    }),
  }),
});

export function evaluateRules(
  ruleSet: SpielZettelRuleSet,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[] | null>,
  depth = 0,
): [stateWasUpdated: boolean, debugInfo: void | EvaluateRuleDebugInfo] {
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
    [helperFunctions.checkbox.nOrMoreAreChecked.name]: (
      n: number,
      ...ids: string[]
    ) => opNAreChecked("min", n, ...ids),
    [helperFunctions.checkbox.nOrLessAreChecked.name]: (
      n: number,
      ...ids: string[]
    ) => opNAreChecked("max", n, ...ids),
    [helperFunctions.checkbox.allAreChecked.name]: (...ids: string[]) =>
      opNAreChecked("all", -1, ...ids),
    [helperFunctions.checkbox.nAreChecked.name]: (
      n: number,
      ...ids: string[]
    ) => opNAreChecked("exact", n, ...ids),
    [helperFunctions.checkbox.countChecked.name]: (...ids: string[]) => {
      return objects.elements.filter(
        (a) => ids.includes(a.id) && a.type === "checkbox" && a.value === true,
      ).length;
    },
    [helperFunctions.number.sum.name]: (...ids: string[]) =>
      objects.elements
        .filter(
          (a) =>
            ids.includes(a.id) &&
            (a.type === "number" ||
              (a.type === "options" && typeof a.value === "number")),
        )
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
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        customFunctions[name] = new Function(funcArgs, funcBody); // Use Function constructor to create a callable function
      } catch (error) {
        throw Error(`Invalid custom function "${name}": [${func.join(",")}]`, {
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
      const prevState = states.current?.find((a) => a.id === id);
      if (prevState === undefined) {
        const newStateFinal: SpielZettelElementState = { id };
        if (newState.disabled !== undefined) {
          newStateFinal.disabled = newState.disabled;
        }
        if (newState.value !== undefined) {
          newStateFinal.value = newState.value;
        }
        if (newState.disabled !== undefined || newState.value !== undefined) {
          states.current?.push(newStateFinal);
          stateWasUpdated = true;
        }
      } else {
        if (
          newState.disabled !== undefined &&
          newState.disabled !== prevState.disabled
        ) {
          prevState.disabled = newState.disabled;
          stateWasUpdated = true;
        }
        if (
          newState.value !== undefined &&
          newState.value !== prevState.value
        ) {
          prevState.value = newState.value;
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
          return `updateState("${id}", ${rules[ruleSet.name]})`;
        }
      })
      .filter((a) => a !== undefined)
      .join(";\n");

    const script = new Script(updateStateCalls);
    const endTime2 = performance.now();
    // Run the script in the context
    script.runInContext(context);
    const endTime3 = performance.now();

    const info = {
      createContextMs: endTime1 - startTime,
      createScriptMs: endTime2 - endTime1,
      runInContextMs: endTime3 - endTime2,
      evaluationCount: depth + 1,
    };

    // Recursively call this function until no updates can be found
    if (stateWasUpdated && depth < 50) {
      const [stateWasUpdated2, info2] = evaluateRules(
        ruleSet,
        elements,
        states,
        depth + 1,
      );
      return [
        stateWasUpdated2,
        {
          createContextMs:
            info.createContextMs + (info2 ? info2.createContextMs : 0),
          createScriptMs:
            info.createScriptMs + (info2 ? info2.createScriptMs : 0),
          runInContextMs:
            info.runInContextMs + (info2 ? info2.runInContextMs : 0),
          evaluationCount: info2 ? info2.evaluationCount : info.evaluationCount,
        },
      ];
    }
    if (depth >= 50) {
      console.warn("Detected unhandled (infinite) recursion in rule set logic");
    }

    return [stateWasUpdated, info];
  } catch (error) {
    throw Error(`Error evaluating rules`, {
      cause: error,
    });
  }
}

export function areSpielZettelStatesDifferent(
  stateA: SpielZettelElementState[],
  stateB: SpielZettelElementState[],
): boolean {
  const stateMapA = new Map(stateA.map((item) => [item.id, item]));
  const stateMapB = new Map(stateB.map((item) => [item.id, item]));

  // Check if every element is equivalent
  for (const [id, elementA] of stateMapA) {
    const elementB = stateMapB.get(id);
    // If `id` is not found in listB
    if (!elementB) {
      return true;
    }
    // If values differ
    if (elementA?.value !== elementB?.value) {
      return true;
    }
    // If disabled states differ
    if ((elementA?.disabled ?? false) !== (elementB?.disabled ?? false)) {
      return true;
    }
  }

  // Check if listB has extra elements not in listA
  for (const id of stateMapB.keys()) {
    if (!stateMapA.has(id)) {
      return true;
    }
  }

  return false;
}
