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
