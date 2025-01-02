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

## TODO

Load data from .spielzettel zip files that comtain:

1. An image source (image.png/image.jpg) that becomes the canvas of the page
2. elements.json which describes the elements of the page
3. undecided but probably json: The rules in case unavailable fields should automatically be disabled and points automatically calculated (can be turned off at any time)
4. other res files like a dice throw configuration (e.g. 5 dice for Kniffel)