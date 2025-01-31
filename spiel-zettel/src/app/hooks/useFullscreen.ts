import { useEffect, useState } from "react";

import {
  debugLogHook,
  debugLogUseEffectInitialize,
  debugLogUseEffectRegister,
} from "../helper/debugLogs";

export const COMPONENT_NAME = "useFullScreen";

/**
 * Detect if the device is in full-screen mode.
 */
export default function useFullScreen() {
  debugLogHook(COMPONENT_NAME);

  const [isDocumentAvailable, setIsDocumentAvailable] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "isFullScreen");
    if (typeof document !== "undefined") {
      setIsDocumentAvailable(true);
      setIsFullScreen(!!document.fullscreenElement);
    }
  }, []);

  useEffect(() => {
    debugLogUseEffectRegister(COMPONENT_NAME, "full screen change listener");
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
