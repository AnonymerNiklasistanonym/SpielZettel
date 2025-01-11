# Examples

Generate a `NAME.json` file that can be bundled together with an image to a `.spielzettel` file using:

```sh
# Generate NAME.json
ts-node --project ../tsconfig.scripts.json NAME_create.ts
# Generate NAME.spielzettel from NAME.json and NAME.jpg
npm run create:examples
```

Example for `NAME_create.ts`:

```ts
import * as fs from "fs";
import * as path from "path";

import type { SpielZettelElement, SpielZettelFileInfo } from "../src/app/helper/readFile";

const id = "NAME";
const outFilePath = path.join(__dirname, `${id}.json`);
const outData: SpielZettelFileInfo = {
    "$schema": path.join("..", "spielzettel-info-schema.json"),
    name: "NAME WITH SPACES",
    version: {
        major: 1,
        minor: 0,
        patch: 0
    },
    ruleSets: [{
        name: "default",
        // Custom functions for this rule set
        customFunctions: {
            getRowValue: ["checkedCells", "return (checkedCells * (checkedCells + 1)) / 2;"]
        }
    }],
    // Elements on the SpielZettel image
    elements: [],
};

// Add elements...
outData.elements.push({
    id: "result_fails",
    type: "number",
    position: {
        x: 100,
        y: 1000
    },
    size: {
        height: 100,
        width: 200
    },
    rules: {
        // Logic to change value/disabled value of the element on each input
        default: "{value: -5 * countChecked('fail_col_0', 'fail_col_1', 'fail_col_2')}"
    }
});

fs.promises.writeFile(outFilePath, JSON.stringify(outData, undefined, 4)).catch(console.error);
```
