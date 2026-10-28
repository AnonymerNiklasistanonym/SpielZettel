import { QuickJSVM } from "@formio/vm";

import type { SpielZettelElement, SpielZettelRuleSet } from "./readFile.js";
import type { RefObject } from "react";

export interface SpielZettelElementState {
  /** The unique ID of the element */
  id: string;
  /** The value of the element */
  value?: string | number | boolean;
  /** If disabled */
  disabled?: boolean;
}

export interface EvaluateRuleDebugInfo {
  init: number;
  script: number;
  evaluate: number;
  dispose: number;
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

export async function evaluateRules(
  ruleSet: SpielZettelRuleSet,
  elements: SpielZettelElement[],
  states: RefObject<SpielZettelElementState[] | null>,
  depth = 0,
): Promise<
  [stateWasUpdated: boolean, debugInfo: void | EvaluateRuleDebugInfo]
> {
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
    const vm = new QuickJSVM();
    await vm.init();
    // const context = createContext(sandbox);
    const endTime1 = performance.now();

    // 1. Construct the state update calls as a string (like before)
    const updateStateCalls = elements
      .map(({ id, rules }) => {
        if (rules !== undefined && ruleSet.name in rules) {
          // We construct a string that pushes a descriptor object
          // instead of calling a host function.
          return `__state_updates__.push({ id: "${id}", newState: ${rules[ruleSet.name]} });`;
        }
      })
      .filter((a) => a !== undefined)
      .join(";\n");

    // 2. Build a self-contained script that includes the update logic
    // and the state array.
    // Rebuild the same `objects.elements` snapshot your node:vm code used
    const sandboxElements = elements.map(({ id, type }) => {
      const existingState = states.current?.find((a) => a.id === id);
      return { id, type, ...existingState };
    });
    const helpersSource = `
  const __elements__ = ${JSON.stringify(sandboxElements)};

  function __opNAreChecked(operation, n, ...ids) {
    const relevant = __elements__.filter(a => ids.includes(a.id) && a.type === "checkbox");
    const checked = relevant.filter(a => a.value === true);
    switch (operation) {
      case "all":   return checked.length === relevant.length;
      case "exact": return checked.length === n;
      case "min":   return checked.length >= n;
      case "max":   return checked.length <= n;
    }
    return false;
  }

  // Keyed by your helperFunctions.*.name values — substitute the real strings
  function ${helperFunctions.checkbox.nOrMoreAreChecked.name}(n, ...ids) {
    return __opNAreChecked("min", n, ...ids);
  }
  function ${helperFunctions.checkbox.nOrLessAreChecked.name}(n, ...ids) {
    return __opNAreChecked("max", n, ...ids);
  }
  function ${helperFunctions.checkbox.allAreChecked.name}(...ids) {
    return __opNAreChecked("all", -1, ...ids);
  }
  function ${helperFunctions.checkbox.nAreChecked.name}(n, ...ids) {
    return __opNAreChecked("exact", n, ...ids);
  }
  function ${helperFunctions.checkbox.countChecked.name}(...ids) {
    return __elements__.filter(a => ids.includes(a.id) && a.type === "checkbox" && a.value === true).length;
  }
  function ${helperFunctions.number.sum.name}(...ids) {
    return __elements__
      .filter(a => ids.includes(a.id) && (a.type === "number" || (a.type === "options" && typeof a.value === "number")))
      .reduce((prev, curr) => typeof curr.value === "number" ? prev + curr.value : prev, 0);
  }
`;

    const script = `
      ${helpersSource}

      // Initialize an array to collect the updates
      const __state_updates__ = [];

      // --- Execute the rules ---
      ${updateStateCalls}

      // --- Return the collected updates ---
      __state_updates__;
    `;
    //console.log(script);

    // const script = new Script(updateStateCalls);
    const endTime2 = performance.now();
    const updatesResult = vm.evaluate(script); // This returns the array of updates
    // Run the script in the context
    // script.runInContext(context);
    const endTime3 = performance.now();
    vm.dispose();
    const endTime4 = performance.now();
    //console.log(updatesResult);

    if (Array.isArray(updatesResult)) {
      for (const update of updatesResult) {
        const { id, newState } = update;
        const prevState = states.current?.find((a) => a.id === id);

        if (prevState === undefined) {
          const newStateFinal: SpielZettelElementState = { id };
          if (newState.disabled !== undefined)
            newStateFinal.disabled = newState.disabled;
          if (newState.value !== undefined)
            newStateFinal.value = newState.value;
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
      }
    }

    const info = {
      init: endTime1 - startTime,
      script: endTime2 - endTime1,
      evaluate: endTime3 - endTime2,
      dispose: endTime4 - endTime3,
      evaluationCount: depth + 1,
    };

    // Recursively call this function until no updates can be found
    if (stateWasUpdated && depth < 50) {
      const [stateWasUpdated2, info2] = await evaluateRules(
        ruleSet,
        elements,
        states,
        depth + 1,
      );
      return [
        stateWasUpdated2,
        {
          init: info.init + (info2 ? info2.init : 0),
          script: info.script + (info2 ? info2.script : 0),
          evaluate: info.evaluate + (info2 ? info2.evaluate : 0),
          dispose: info.dispose + (info2 ? info2.dispose : 0),
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
