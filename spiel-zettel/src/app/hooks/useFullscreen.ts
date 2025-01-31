import { useEffect, useState } from "react";

/**
 * Detect if the device is in full-screen mode.
 */
export default function useFullScreen() {
  const [isDocumentAvailable, setIsDocumentAvailable] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDocumentAvailable(true);
      setIsFullScreen(!!document.fullscreenElement);
    }
  }, []);

  useEffect(() => {
    console.debug(
      "USE EFFECT: [useFullScreen] Register full screen change listener",
    );
    if (!isDocumentAvailable) return;

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    // Add event listeners for full-screen changes
    document.addEventListener("fullscreenchange", handleFullScreenChange);

    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [isDocumentAvailable]);

  return isFullScreen;
}
