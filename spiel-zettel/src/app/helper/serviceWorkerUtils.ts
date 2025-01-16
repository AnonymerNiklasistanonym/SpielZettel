import { Workbox } from "workbox-window";

export async function registerServiceWorker(serviceWorkerUrl: string) {
  if ("serviceWorker" in navigator) {
    try {
      const registration =
        await navigator.serviceWorker.register(serviceWorkerUrl);
      if (registration.installing) {
        console.info("Service worker installing", serviceWorkerUrl);
      } else if (registration.waiting) {
        console.info("Service worker installed", serviceWorkerUrl);
      } else if (registration.active) {
        console.info("Service worker active", serviceWorkerUrl);
      }
      // For debugging receive messages:
      // client.postMessage({
      //   msg: "Hello world",
      // });
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.debug("Service worker message", event.data.msg);
      });
    } catch (error) {
      throw Error(`Service Worker registration failed (${serviceWorkerUrl})`, {
        cause: error,
      });
    }
  } else {
    console.warn(
      `Service worker is not supported by this browser (${serviceWorkerUrl}`,
    );
  }
}

export function checkForNewVersion(serviceWorkerUrl: string): void {
  if ("serviceWorker" in navigator) {
    const wb = new Workbox(serviceWorkerUrl);

    wb.addEventListener("waiting", () => {
      console.log("A new service worker is waiting to activate.");
      if (
        confirm("A new version is available. Do you want to refresh the page?")
      ) {
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
        wb.messageSW({ type: "SKIP_WAITING" }); // Ask the service worker to skip waiting
      }
    });

    wb.addEventListener("activated", (event) => {
      if (event.isUpdate) {
        console.log("Service worker has been updated.");
      } else {
        console.log("Service worker has been activated for the first time.");
      }
    });

    wb.register();
  } else {
    console.warn("Service Worker is not supported in this browser.");
  }
}
