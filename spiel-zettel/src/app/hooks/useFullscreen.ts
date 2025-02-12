import { useEffect, useState } from "react";

import {
  debugLogUseEffectInitialize,
  debugLogUseEffectRegisterChange,
} from "../helper/debugLogs";

export const COMPONENT_NAME = "useFullScreen";

/**
 * Detect if the device is in full-screen mode.
 */
export default function useFullScreen() {
  // States

  const [isDocumentAvailable, setIsDocumentAvailable] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "isFullScreen");
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
        debugLogUseEffectRegisterChange(
          COMPONENT_NAME,
          "full screen change",
          isFullScreen,
        );
        setIsFullScreen(isFullScreen);
      },
      { signal: controller.signal },
    );

    return () => {
      controller.abort();
    };
  }, [isDocumentAvailable]);

  return isFullScreen;
}
