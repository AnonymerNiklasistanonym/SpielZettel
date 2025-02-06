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
  onRegister?: () => void,
  onError: (error: Error) => void = console.error,
) {
  // States

  const [registered, setRegistered] = useState(false);

  // Event Listeners

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
        if (onRegister) {
          onRegister();
        }
      })
      .catch(onError);
  }, [serviceWorkerUrl, onRegister, scope, onError]);

  return registered;
}
