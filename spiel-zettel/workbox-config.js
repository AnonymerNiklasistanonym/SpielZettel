module.exports = {
  globDirectory: "build/",
  globPatterns: ["**/*.{js,css,woff2,html,json,ico,svg,txt}"],
  swDest: "build/sw.js",
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
};
