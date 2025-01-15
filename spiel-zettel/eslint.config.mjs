import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Import the plugins
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettierPlugin from "eslint-plugin-prettier";

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
            prettier: prettierPlugin
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
                        ["^\\u0000"]
                    ]
                }
            ],
            "simple-import-sort/exports": "error",
            "import/order": [
                "error",
                {
                    groups: [
                        ["builtin", "external"],
                        ["internal", "parent", "sibling", "index"]
                    ]
                }
            ]
        }
    }
];

export default eslintConfig;
