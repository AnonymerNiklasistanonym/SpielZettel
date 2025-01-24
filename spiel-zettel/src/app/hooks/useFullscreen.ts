import { useEffect, useState } from "react";

/**
 * Detect if the device is in full-screen mode.
 */
export default function useFullScreen() {
  const [isDocumentAvailable, setIsDocumentAvailable] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(
    isDocumentAvailable && !!document.fullscreenElement,
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDocumentAvailable(true);
    }
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    // Add event listeners for full-screen changes
    document.addEventListener("fullscreenchange", handleFullScreenChange);

    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  return isFullScreen;
}
