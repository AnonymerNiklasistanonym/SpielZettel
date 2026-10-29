import { useEffect, useState } from "react";

// TODO: Add zustand or other store to enable manual override of this via settings?

/**
 * Detect if the device is in dark mode.
 */
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);

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
        setIsDarkMode(e.matches);
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, []);

  return isDarkMode;
}
