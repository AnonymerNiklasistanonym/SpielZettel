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
