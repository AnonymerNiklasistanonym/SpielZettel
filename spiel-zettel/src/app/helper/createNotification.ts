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
