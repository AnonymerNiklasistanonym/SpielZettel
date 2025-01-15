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

#### PWA

To verify that the website can be installed as PWA open the website using Google Chrome and open the `DevTools` (`F12`).
Then navigate to the section `Application` and check if all values are as expected and resolve potential errors/warnings (e.g. you need to [provide screenshots for desktop and mobile](https://developer.mozilla.org/en-US/docs/Web/Manifest/screenshots) to enable a rich PWA install).

## TODO

Load data from .spielzettel zip files that comtain:

1. An image source (image.png/image.jpg) that becomes the canvas of the page
2. elements.json which describes the elements of the page
3. undecided but probably json: The rules in case unavailable fields should automatically be disabled and points automatically calculated (can be turned off at any time)
4. other res files like a dice throw configuration (e.g. 5 dice for Kniffel)

## Development tools

```sh
# Format and lint all code
npm run lint:fix
```

## PWA

- What is a PWA
- What is workbox
- What is a service worker
