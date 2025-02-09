import { useEffect, useState } from "react";

import {
  debugLogUseEffectInitialize,
  debugLogUseEffectRegister,
  debugLogUseEffectRegisterChange,
  debugLogUseEffectUnregister,
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
    debugLogUseEffectRegister(COMPONENT_NAME, "full screen change listener");
    if (!isDocumentAvailable) return;

    const handleFullScreenChange = () => {
      debugLogUseEffectRegisterChange(
        COMPONENT_NAME,
        "full screen change",
        !!document.fullscreenElement,
      );
      setIsFullScreen(!!document.fullscreenElement);
    };

    // Add event listeners for full-screen changes
    document.addEventListener("fullscreenchange", handleFullScreenChange);

    // Cleanup event listeners on unmount
    return () => {
      debugLogUseEffectUnregister(
        COMPONENT_NAME,
        "full screen change listener",
      );
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [isDocumentAvailable]);

  return isFullScreen;
}
