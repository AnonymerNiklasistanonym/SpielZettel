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

> [!IMPORTANT]
> At the time of writing Firefox 134.0.1 in combination with `npx serve DIR` runs the service worker.

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

Using `workbox-window` messages/events can be sent/captured from this service worker on the client side (like detecting a new version).

### React

#### Potential Errors

React has some potential pitfalls that will greatly reduce performance and break apparent sane logic.

##### Multiple Renders / Re-renders

Dependencies of React methods (e.g. `useEffect(() => ..., [dependency, ...])`, `useCallback(() => ..., [dependency, ...])`) will trigger a rerun of the callback.

**Example 1:** Infinite Loop

```ts
function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(count + 1); // Updating state that is a dependency
  }, [count]);           // dependency count changes -> re-run useEffect (infinitely)

  return <div>Count: {count}</div>;
}
```

This code will update the count on the first render which is also a dependency meaning it will trigger a rerun of the callback.
This not only creates an infinite loop but will also rerender the whole `App` component even if `count` itself would not be part of the `return` element.
Fixing this seems simple but can be happening accidentally really quick when having multiple React methods that are triggered by each other.

```ts
function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(prev => prev + 1); // Updating state
  }, []);                       // count changes but it's not a dependency -> no rerun

  return <div>Count: {count}</div>;
}
```

**Example 2:** Not memoized values

```ts
function App() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

On each render of this component the value `handleClick`, in this case a function, is being recomputed.
This already wastes resources but since that value is on top of that not a primitive (e.g. `boolean`, `string`, `number`) but a reference (e.g. `function`, `object`, `array`) this has major implications when it's handed down to another component (here a `<button>`) or referenced in another React method as dependency.
When React does compare the previous value to the new value for non primitives they will always be different (since they got recomputed) meaning this cascades to a lot of unnecessary rerendering.
By memoizing values using the React methods like `useCallback` or `useMemo` values are only recomputed if their dependencies change and thus will have the same reference if they themselves have not changed.

```ts
function App() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

##### Functional updates

Each functional update in React (e.g. `useEffect()`, `useState -> setState`) is supposed to be functional meaning executing it twice should not create a different state.
To catch some of those errors React will run those methods TWICE in development builds.

**Example 1:** Using References in State Updates

```ts
const [elementStatesUndoRedo, setElementStatesUndoRedo] = useState<{
  undos: SpielZettelElementState[][];
  redos: SpielZettelElementState[][];
}>({ undos: [], redos: [] });
const elementStatesRef = useRef<SpielZettelElementState[]>([]);

const undoLastAction = useCallback(() => {
  // ....
  console.debug("undoLastAction useCallback");
  setElementStatesUndoRedo((prev) => {
    console.debug("undoLastAction > setElementStatesUndoRedo");
    if (prev.undos.length > 0) {
      // Add current state to redos
      prev.redos.push(elementStatesRef.current.slice());
      // Update the current state to the latest undo
      elementStatesRef.current = prev.undos.slice(-1)[0];
    }
    // Remove the newest undo
    return { ...prev, undos: prev.undos.slice(0, -1) };
  });
  // ....
}, [/*...*/]);
```

In a previous naive version of the undo callback the console would print:

```text
undoLastAction useCallback
undoLastAction > setElementStatesUndoRedo
undoLastAction > setElementStatesUndoRedo
```

This is breaking the apparent sane logic since `elementStatesRef.current` is first added to redos and then updates, meaning on the second run `elementStatesRef.current` is not the same.
To make this state update functional the value of the reference that is added to the redos needs to be moved outside of the state update to guarantee that running it multiple times will always create the same state even if `elementStatesRef.current` changes:

```ts
const undoLastAction = useCallback(() => {
  // ....
  const current = elementStatesRef.current.slice();
  setElementStatesUndoRedo((prev) => {
    if (prev.undos.length === 0) {
      return prev;
    }
    // Update the current state to the latest undo
    elementStatesRef.current = prev.undos.slice(-1)[0];
    return {
      ...prev,
      // Add current state to redos
      redos: [...prev, current],
      // Remove the newest undo
      undos: prev.undos.slice(0, -1),
    };
  });
  // ....
}, [/*...*/]);
```
