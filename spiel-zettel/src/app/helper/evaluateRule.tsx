import { Script, createContext } from 'vm';
import type { SpielZettelElementInfo } from './render';
import type { SpielZettelElement, SpielZettelRuleSet } from './readFile';
import type { RefObject } from 'react';

export interface SpielZettelElementState {
  /** The unique ID of the element */
  id: string;
  /** The value of the element */
  value?: string | number | boolean;
  /** If disabled */
  disabled?: boolean;
}

// Function to load and execute rules
export function evaluateRule(ruleSet: SpielZettelRuleSet, element: SpielZettelElement, rule: string | null, elements: SpielZettelElementInfo[], states: RefObject<SpielZettelElementState[] | null>): void {
  const existingElementState = states.current?.find(a => a.id === element.id);
  const elementState = existingElementState ?? ({ id: element.id });
  if (rule === null) {
    console.warn(`Found no rule for element '${elementState.id}'`)
    return;
  }
  const objects = {
    current: { id: elementState.id, type: element.type, value: elementState.value },
    elements: elements.map(({ id, type, value }) => {
      const existingState = states.current?.find(a => a.id === id);
      return { id, type, value, ...existingState };
    })
  };
  const opNAreChecked = (operation: "exact" | "min" | "max" | "all", n: number, ...ids: string[]) => {
    const relevantElements = objects.elements.filter(a => ids.includes(a.id) && a.type === "checkbox");
    const checkedElements = relevantElements.filter(a => a.value === true);
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
    oneIsChecked: (...ids: string[]) => opNAreChecked("exact", 1, ...ids),
    allAreChecked: (...ids: string[]) => opNAreChecked("all", -1, ...ids),
    nAreChecked: (n: number, ...ids: string[]) => opNAreChecked("exact", n, ...ids),
    countChecked: (...ids: string[]) => {
      console.log("b", objects.elements, ids);
      return objects.elements.filter(a => ids.includes(a.id) && a.type === "checkbox" && a.value === true).length;
    },
    sum: (...ids: string[]) => objects.elements.filter(a => ids.includes(a.id) && a.type === "number").reduce((prev, curr) => typeof curr.value === "number" ? prev + curr.value : prev, 0),
  };
  const customFunctions: { [name: string]: unknown } = {};
  for (const [name, func] of Object.entries(ruleSet.customFunctions)) {
    try {
      const [funcArgs, funcBody] = func;
      customFunctions[name] = new Function(funcArgs, funcBody); // Use Function constructor to create a callable function
    } catch (error) {
      throw Error(`Invalid custom function "${name}": ${func}`, { cause: error });
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
      updatedState = { value: objects.current.value, ...newState, id: objects.current.id };
    }
  };

  // Create a context and execute the rule
  try {
    const context = createContext(sandbox);
    const script = new Script(`
      console.log({current, customFunctions, newState: ${rule} });
      updateState(${rule});
    `);

    // Run the script in the context
    script.runInContext(context);

    // Log the updated result after the script runs
    console.log("Actual result after script execution:", updatedState);

    if (updatedState !== null) {
      if (existingElementState === undefined) {
        states.current?.push(updatedState);
      } else {
        if ((updatedState as SpielZettelElementState).disabled !== undefined) {
          existingElementState.disabled = (updatedState as SpielZettelElementState).disabled;
        }
        if ((updatedState as SpielZettelElementState).value !== undefined) {
          existingElementState.value = (updatedState as SpielZettelElementState).value;
        }
      }
    }
    return;
  } catch (error) {
    throw Error(`Error evaluating rule "${rule}"`, {
      cause: error
    });
  }
}
