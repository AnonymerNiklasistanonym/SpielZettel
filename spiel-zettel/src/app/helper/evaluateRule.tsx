import { Script, createContext } from 'vm';
import type { SpielZettelElementInfo } from './render';

export interface SpielZettelElementState {
  /** The unique ID of the element */
  id: string;
  /** The value of the element */
  value?: string | number | boolean;
  /** If disabled */
  disabled?: boolean;
}

// Function to load and execute rules
export function evaluateRule(id: string, rule: string, elements: SpielZettelElementInfo[]): SpielZettelElementState {
  const current = elements.find(a => a.id === id);
  if (current === undefined) {
    throw Error(`Element '${id}' was not found`);
  }
  const objects = {
    current: { id: current.id, type: current.type, value: current.value },
    elements: elements.map(({ id, type, value }) => ({ id, type, value }))
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
  };
  // Prepare the sandbox
  const sandbox = {
    objects,
    helpers,
    result: null,
  };

  // Create a context and execute the rule
  try {
    const context = createContext(sandbox);
    const script = new Script(`result = { ...current, ${rule} };`);
    script.runInContext(context);

    return sandbox.result ?? current;
  } catch (error) {
    throw Error(`Error executing rule "${rule}"`, {
      cause: error
    });
  }
}
