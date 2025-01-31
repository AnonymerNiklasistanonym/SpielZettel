export function debugLogUseEffectChanged(
  component: string,
  ...changed: [string, unknown][]
) {
  console.debug(`USE EFFECT: [${component}] Change detected`, ...changed);
}

export function debugLogUseEffectInitialize(
  component: string,
  ...initialize: string[]
) {
  console.debug(
    `USE EFFECT: [${component}] Initialize ${initialize.join(", ")}`,
  );
}

export function debugLogUseEffectRegister(component: string, name: string) {
  console.debug(`USE EFFECT: [${component}] Register ${name}`);
}

export function debugLogCallback(component: string, callbackName: string) {
  console.debug(`CALLBACK: [${component}] ${callbackName}()`);
}

export function debugLogDraw(component: string, ...idValues: unknown[]) {
  console.debug(`DRAW: [${component}]`, ...idValues);
}

export function debugLogHook(component: string, ...idValues: unknown[]) {
  console.debug(`HOOK: [${component}]`, ...idValues);
}

export function debugLogUseMemo(
  component: string,
  name: string,
  ...idValues: [string, unknown][]
) {
  console.debug(`MEMO UPDATE: [${component}] ${name}`, ...idValues);
}
