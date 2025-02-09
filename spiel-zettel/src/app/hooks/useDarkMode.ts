import { useEffect, useState } from "react";

import {
  debugLogUseEffectInitialize,
  debugLogUseEffectRegister,
  debugLogUseEffectRegisterChange,
  debugLogUseEffectUnregister,
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
    debugLogUseEffectRegister(COMPONENT_NAME, "dark mode media query listener");

    if (!isWindowAvailable) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = (e: MediaQueryListEvent) => {
      debugLogUseEffectRegisterChange(
        COMPONENT_NAME,
        "Dark mode changed",
        e.matches,
      );
      setIsDarkMode(e.matches);
    };

    // Add listener for changes in color scheme
    mediaQuery.addEventListener("change", handleThemeChange);

    // Cleanup listener on component unmount
    return () => {
      debugLogUseEffectUnregister(
        COMPONENT_NAME,
        "dark mode media query listener",
      );
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [isWindowAvailable]);

  return isDarkMode;
}
