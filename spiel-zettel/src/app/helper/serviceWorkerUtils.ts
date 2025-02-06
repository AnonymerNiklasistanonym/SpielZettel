import { Workbox } from "workbox-window";

export async function registerServiceWorker(
  serviceWorkerUrl: string,
  scope?: string,
) {
  if (!("serviceWorker" in navigator)) {
    throw Error("This browser does not support service workers");
  }

  try {
    const registration = await navigator.serviceWorker.register(
      serviceWorkerUrl,
      { scope },
    );
    if (registration.installing) {
      console.info(
        "Service worker installing",
        serviceWorkerUrl,
        registration.scope,
      );
    } else if (registration.waiting) {
      console.info(
        "Service worker installed",
        serviceWorkerUrl,
        registration.scope,
      );
    } else if (registration.active) {
      console.info(
        "Service worker active",
        serviceWorkerUrl,
        registration.scope,
      );
    }
    // For debugging send messages on the sw:
    // client.postMessage({
    //   msg: "Hello world",
    // });
    // then receive the messages on the client:
    // navigator.serviceWorker.addEventListener("message", (event) => {
    //   console.debug("Service worker message", event.data.msg);
    // });
  } catch (error) {
    throw Error(`Service Worker registration failed (${serviceWorkerUrl})`, {
      cause: error,
    });
  }
}

export function checkForNewVersion(
  serviceWorkerUrl: string,
  confirmationText = "A new version is available. Refresh the page?",
): void {
  if ("serviceWorker" in navigator) {
    const wb = new Workbox(serviceWorkerUrl);

    wb.addEventListener("waiting", (event) => {
      console.info(
        "A new service worker is waiting to activate.",
        serviceWorkerUrl,
        event.sw?.scriptURL,
      );
      if (
        confirm(confirmationText) + (event.sw?.scriptURL || "unknownScriptUrl")
      ) {
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
        wb.messageSW({ type: "SKIP_WAITING" }).catch(console.error); // Ask the service worker to skip waiting
      }
    });

    wb.addEventListener("activated", (event) => {
      if (event.isUpdate) {
        console.info("Service worker has been updated.", serviceWorkerUrl);
      } else {
        console.info(
          "Service worker has been activated for the first time.",
          serviceWorkerUrl,
        );
      }
    });

    wb.register().catch(console.error);
  } else {
    console.warn(
      `Service worker is not supported by this browser (${serviceWorkerUrl}`,
    );
  }
}
