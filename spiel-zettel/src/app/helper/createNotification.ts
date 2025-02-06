export async function createNotification(title: string, message?: string) {
  if (!("Notification" in window)) {
    throw Error("This browser does not support notifications");
  }
  const permission = await window.Notification.requestPermission();
  if (permission === "granted") {
    console.info("Notification permission granted!");
    new window.Notification(title, {
      body: message,
      icon: "./favicon.svg",
    });
  } else {
    throw Error("Notification permission was denied");
  }
}

export async function createNotificationServiceWorker(
  title: string,
  message?: string,
  serviceWorkerScope = "/notifications/",
  serviceWorkerMessageDataType = "SHOW_NOTIFICATION",
) {
  if (!("serviceWorker" in navigator)) {
    throw Error(
      "This browser does not support service workers (to create notifications)",
    );
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const notificationSw = registrations.find((reg) =>
    reg.scope.endsWith(serviceWorkerScope),
  );

  if (!notificationSw) {
    throw new Error(`No service worker found under ${serviceWorkerScope}`);
  }

  if (notificationSw.active) {
    notificationSw.active.postMessage({
      type: serviceWorkerMessageDataType,
      title,
      body: message,
    });
  } else {
    throw new Error("No active service worker to create notifications");
  }
}

export async function createNotificationServiceWorkerOrFallback(
  title: string,
  message?: string,
) {
  try {
    await createNotification(title, message);
  } catch (err) {
    if ((err as Error).message.includes("Illegal constructor")) {
      await createNotificationServiceWorker(title, message);
    }
  }
}
