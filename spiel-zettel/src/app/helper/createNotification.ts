export async function createNotification(title: string, message?: string) {
  if (!("Notification" in window)) {
    console.error("This browser does not support desktop notifications.");
  }
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.info("Notification permission granted!");
    } else {
      console.warn("Notification permission denied");
    }
  }
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: "./favicon.svg",
    });
  } else {
    console.warn("Notification permission was denied");
  }
}
