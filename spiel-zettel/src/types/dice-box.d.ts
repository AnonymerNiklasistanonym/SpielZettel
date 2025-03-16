/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@3d-dice/dice-box" {
  export interface DiceBoxOptions {
    id?: string; // ID for the canvas element
    assetPath?: string; // Path to dice assets
    startingHeight?: number; // Initial height of the dice box
    throwForce?: number; // Strength of dice throws
    spinForce?: number; // Amount of spin applied to dice
    lightIntensity?: number; // Lighting intensity
  }

  export default class DiceBox {
    constructor(selector: string, options?: DiceBoxOptions);

    init(): Promise<void>;
    add({ groupId: string, notation: string }, groupId?: string): void;
    hide(className?: string): DiceBox;
    clear(): void;
    show(): DiceBox;
    roll(notation: string): Promise<any[]>;
    updateConfig(options: Partial<DiceBoxOptions>): void;

    onRollComplete?: (results: any[]) => void;
  }
}
