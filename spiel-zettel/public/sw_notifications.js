/* A service worker to enable native notifications */

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: event.data.icon || "./favicon.svg", // Adjust the path to your app's icon
      badge: event.data.badge || "./favicon.svg",
    });
  }
});
