import { useEffect, useState } from "react";

// TODO: Add zustand or other store to enable manual override of this via settings?

/**
 * Detect if the device is in dark mode.
 */
export default function useDarkMode() {
  // #region States
  const [isDarkMode, setIsDarkMode] = useState(false);
  // #endregion

  // #region Event Listeners
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsDarkMode(
      window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const controller = new AbortController();

    // Add listener for changes in color scheme
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      (e) => {
        const isDarkMode = e.matches;
        setIsDarkMode(isDarkMode);
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, []);
  // #endregion

  return isDarkMode;
}
