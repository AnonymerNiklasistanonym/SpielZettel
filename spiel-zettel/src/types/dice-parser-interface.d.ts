/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@3d-dice/dice-parser-interface" {
  export default class DiceParser {
    constructor();

    parseNotation(notation: string): string;
    processRolls(rolls: any[]): any;
    computeResults(results: any[]): any;

    parseFinalResults(results: any[]): any[];
    handleRerolls(results: any[]): { groupId: string; notation: string }[];
  }
}
