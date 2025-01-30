import { useEffect, useState } from "react";

/**
 * Detect if the device is in dark mode.
 */
export default function useDarkMode() {
  const [isWindowAvailable, setIsWindowAvailable] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsWindowAvailable(true);
      setIsDarkMode(
        window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }
  }, []);

  useEffect(() => {
    console.debug(
      "USE EFFECT: [useDarkMode] Register dark mode media query listener",
    );
    if (!isWindowAvailable) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = (e: MediaQueryListEvent) => {
      console.debug("DETECTED CHANGE: Dark mode media query", e.matches);
      setIsDarkMode(e.matches);
    };

    // Add listener for changes in color scheme
    mediaQuery.addEventListener("change", handleThemeChange);

    // Cleanup listener on component unmount
    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [isWindowAvailable]);

  return isDarkMode;
}
