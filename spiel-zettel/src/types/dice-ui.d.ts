/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@3d-dice/dice-ui" {
  export namespace Dice {
    function init(): Promise<void>;
    function hide(): { clear: () => void };
    function show(): { roll: (parsedNotation: any) => void };
    function add(
      roll: { notation: string; groupId: string },
      groupId: string,
    ): void;

    let onRollComplete: (results: any[]) => void;
  }
}

declare module "@3d-dice/dice-ui/src/displayResults" {
  export default class DisplayResults {
    constructor(selector: string);

    showResults(results: any[]): void;
    clear(): void;
  }
}
