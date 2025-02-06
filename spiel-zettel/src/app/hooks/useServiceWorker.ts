import type { RefObject } from "react";
import { useEffect, useState } from "react";

import { debugLogUseEffectChanged } from "../helper/debugLogs";
import { registerServiceWorker } from "../helper/serviceWorkerUtils";

export const COMPONENT_NAME = "useServiceWorker";

/**
 * Register service worker
 */
export default function useServiceWorker(
  serviceWorkerUrl: string,
  scope?: string,
  onRegister?: RefObject<() => void>,
) {
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    debugLogUseEffectChanged(
      COMPONENT_NAME,
      ["serviceWorkerUrl", serviceWorkerUrl],
      ["onRegister", onRegister],
      ["scope", scope],
    );
    registerServiceWorker(serviceWorkerUrl, scope)
      .then(() => {
        setRegistered(true);
        if (onRegister?.current) {
          onRegister.current();
        }
      })
      .catch(console.error);
  }, [serviceWorkerUrl, onRegister, scope]);

  return registered;
}
