import { useEffect, useState } from "react";

import {
  debugLogUseEffectInitialize,
  debugLogUseEffectRegisterChange,
} from "../helper/debugLogs";

export const COMPONENT_NAME = "useDarkMode";

/**
 * Detect if the device is in dark mode.
 */
export default function useDarkMode() {
  // States

  const [isWindowAvailable, setIsWindowAvailable] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "isFullScreen");
    if (typeof window !== "undefined") {
      setIsWindowAvailable(true);
      setIsDarkMode(
        window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }
  }, []);

  useEffect(() => {
    if (!isWindowAvailable) return;
    const controller = new AbortController();

    // Add listener for changes in color scheme
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      (e) => {
        const isDarkMode = e.matches;
        debugLogUseEffectRegisterChange(
          COMPONENT_NAME,
          "Dark mode changed",
          isDarkMode,
        );
        setIsDarkMode(isDarkMode);
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, [isWindowAvailable]);

  return isDarkMode;
}
