# SpielZettel

## Getting Started

Run the development server and visit [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```

## Export

Export a static generated website in the `build` directory:

```bash
npm run build
```

For deployment the environment variable `CUSTOM_ASSET_PREFIX` can be set to add a prefix for all assets between the domain and the actual resource (e.g. for GitHub Pages where the URL is `https://USERNAME.github.io/REPONAME/` it needs to be set to `/REPONAME`/`/SpielZettel`).

### Test Deployment

If no prefix is set and the build was created using the previous command a webserver can be started in the `build` directory:

```bash
npm run start
```

#### Test PWA Capabilities

To verify that the website can be installed as PWA open the website using Google Chrome and open the `DevTools` (`F12`).
Then navigate to the section `Application` and check if all values are as expected and resolve potential errors/warnings (e.g. you need to [provide screenshots for desktop and mobile](https://developer.mozilla.org/en-US/docs/Web/Manifest/screenshots) to enable a rich PWA install).

> [!IMPORTANT]
> Browsers normally only allow service workers in a secure HTTPS context which is why for testing you need to have a HTTPS server running.
> One way to do that is by self generating a `cert.pem` file and then using `http-server` to start it ([SOURCE]([http-server](https://stackoverflow.com/a/35231213))):
>
> ```sh
> openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
> # generates 'key.pem' and 'cert.pem'
> http-server -S -C cert.pem -o -p 8000 build
> # -S enables SSL, -C selects the certificate, -p selects the port
> # and the last argument is the root directory to host
> ```
>
> This will most likely trigger a be careful notification by your browser but at least currently allows you to test service workers locally.
> Chromium currently doesn't seem to have a workaround around SSL errors while Firefox doesn't seem to mind after accepting the risk.

On Firefox the `DevTools` (`F12`) also have an `Application` entry in which the running service worker should be listed.
On the page `about:debugging#/runtime/this-firefox` (click on `Application` and `Service Workers`) search for the URL of the current tab to find its entry and then click `Inspect` to debug the Service Worker script.

## TODO

Load data from .spielzettel zip files that contains:

1. An image file (`.png`/`.jpg`) that becomes the canvas of the page
2. A `.json` file which describes the SpielZettel meaning name, elements, rule sets, ...

## Development tools

```sh
# Format and lint all code
npm run lint:fix
```

## PWA

### What is a PWA?

A Progressive Web App (PWA) is a web application that delivers an app-like experience by combining the capabilities of **modern** web technologies with the benefits of native apps.
Compared to just a website they have the following key functionalities:

- Installable: Users can install PWAs to their home screen without an app store (**If the browser supports it...**)
  - Android:
    - Google Chrome: Open menu bar, `Add to Homescreen`, *Install option comes up*
      - App shows up like an installed application with a custom app icon (no logo overlay like shortcuts)
      - App runs in custom window defined by the theme in `manifest.json`
      - App can be uninstalled the same way a normal app would be uninstalled
    - Firefox: unsupported (134.0.1)
  - Linux:
    - Chromium/Google Chrome: In the URL bar an icon shows up which lets users install the PWA
      - App shows up like an installed application with a custom `.desktop` file in `$HOME/.local/share/applications`
      - App runs in custom window
      - App can open files registered in the `manifest.json`
      - App can be uninstalled by going to `chrome://apps/` and right clicking the PWA entry
    - Firefox: unsupported (134.0.1)
- Have Offline Support: Works even with limited or no internet connectivity
  - Android: Current testing only works as long as the website is not manually refreshed
  - Linux: Current testing doesn't work at all

Since websites already follow responsive design for any display size and browsers being cross-platform it is a perfect fit to reach a wide audience.

### `manifest.json`

[SOURCE](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)

A `manifest.json` file provides the necessary metadata like `name`, `icons`, `start_url` to convert the website to an application like appearance.
Additionally it has properties to:

- Register as application that can open specific files:

  ```json
  {
    "file_handlers": [
        {
          "action": "/open-file",
            "accept": {
              "application/pdf": [".pdf"],
              "image/png": [".png"]
            }
        }
      ]
  }
  ```

- Register specific app shortcuts:

  ```json
  {
    "shortcuts": [
      {
        "name": "Open Gallery",
        "short_name": "Gallery",
        "description": "View your photo gallery",
        "url": "/gallery",
        "icons": [{ "src": "/icons/gallery-icon.png", "sizes": "192x192", "type": "image/png" }]
      }
    ]
  }
  ```

- Request permissions for capabilities like geolocation

  ```json
  {
    "permissions": ["geolocation", "camera", "notifications"]
  }
  ```

### Service Worker

[SOURCE](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

A Service Worker is a script that runs in the background, separate from the web page, enabling key PWA functionalities:

- Caching: Intercepts network requests to cache resources for offline use.
- Push Notifications: Allows sending notifications even when the app is closed.
- Background Sync: Ensures tasks are completed when the user regains connectivity.

Service Workers are event-driven and operate independently of the main app, ensuring a smooth and reliable experience.

```js
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

// …

registerServiceWorker();
```

After the service worker is registered, the browser will attempt to `install` then `activate` the service worker (`/sw.js` in this case).
The `cache` variable is the Service Worker's storage API, a global object on the service worker that can store assets delivered by responses, and keyed by their requests.

```js
const addResourcesToCache = async (resources) => {
  const cache = await caches.open("v1");
  await cache.addAll(resources);
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    addResourcesToCache([
      "/",
      "/index.html",
      "/style.css",
      "/app.js",
    ]),
  );
});
```

A fetch event fires every time any resource controlled by a service worker is fetched.
This means it is possible to capture this request and for example respond with the cached files from the cache.

```js
self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request));
});
```

This can be expanded to preload resources or use different cache strategies

#### Workbox

[Source](https://medium.com/google-developer-experts/a-5-minute-intro-to-workbox-3-0-156803952b3e)

Workbox is a library by Google that simplifies the implementation of service workers.

```sh
# Install workbox
npm install workbox-cli --save-dev
# Generate a fitting workbox configuration file by answering questions
npx workbox wizard
# Generate the service worker according to the created workbox-config.js file
npx workbox generateSW workbox-config.js
```
