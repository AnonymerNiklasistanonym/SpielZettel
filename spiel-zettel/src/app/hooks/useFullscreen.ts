import { useEffect, useState } from "react";

/**
 * Detect if the device is in full-screen mode.
 */
export default function useFullScreen() {
  // #region States
  const [isDocumentAvailable, setIsDocumentAvailable] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // #endregion

  // #region Event Listeners
  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDocumentAvailable(true);
      setIsFullScreen(!!document.fullscreenElement);
    }
  }, []);

  useEffect(() => {
    if (!isDocumentAvailable) return;
    const controller = new AbortController();

    // Add event listener for full-screen changes
    document.addEventListener(
      "fullscreenchange",
      () => {
        const isFullScreen = !!document.fullscreenElement;
        setIsFullScreen(isFullScreen);
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, [isDocumentAvailable]);
  // #endregion

  return isFullScreen;
}
