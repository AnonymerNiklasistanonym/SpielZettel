import { FlatCompat } from "@eslint/eslintrc";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { dirname } from "path";
import { fileURLToPath } from "url";

import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // External libraries
            ["^@?\\w"],
            // Internal imports
            ["^@/"],
            // Parent imports
            ["^\\.\\.(/|$)"],
            // Sibling imports
            ["^\\./"],
            // Style imports
            ["^.+\\.s?css$"],
            // TypeScript `import type` statements
            ["^import\\s+type\\s"],
            // Side effect imports (e.g., polyfills, styles)
            ["^\\u0000"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      "import/order": [
        "error",
        {
          groups: [
            ["builtin", "external"],
            ["internal", "parent", "sibling", "index"],
          ],
        },
      ],
    },
  },
  // Check for advanced type errors (like not awaited promises)
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended-requiring-type-checking"].rules, // Add type-aware rules
      "@typescript-eslint/no-floating-promises": "error", // Ensure promises are awaited
    },
  },
];

export default eslintConfig;
