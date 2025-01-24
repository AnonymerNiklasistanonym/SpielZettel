import { useEffect, useState } from "react";

/**
 * Detect if the device is in dark mode.
 */
export default function useDarkMode() {
  const [isWindowAvailable, setIsWindowAvailable] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    isWindowAvailable &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsWindowAvailable(true);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    // Add listener for changes in color scheme
    mediaQuery.addEventListener("change", handleThemeChange);

    // Cleanup listener on component unmount
    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  return isDarkMode;
}
