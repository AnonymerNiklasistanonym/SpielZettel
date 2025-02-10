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
import { writeFile } from "fs/promises";
import { join } from "path";

import type { ExampleCreateData } from "../scripts/createExamples";
import type {
  SpielZettelElement,
  SpielZettelFileInfo,
} from "../src/app/helper/readFile";

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
        default: "{ value: -5 * countChecked('fail_col_0', 'fail_col_1', 'fail_col_2') }"
    }
});

// Export method to create JSON file(s)
export function create(): ExampleCreateData {
  return [[outFilePath, outData]];
}

// Call create() only if the script is executed directly (only necessary if the script is directly run)
if (require.main === module) {
  Promise.all(
    create().map(async ([filePath, data]) => {
      await writeFile(filePath, JSON.stringify(data));
      console.log(`Create ${filePath}`);
    }),
  ).catch(console.error);
}
```

It's also possible to convert an actual function to a ruleset custom function instead of manually doing it:

```ts
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function funcToString(func: Function) {
  if (typeof func !== "function") {
    throw new Error("Input must be a function.");
  }
  const funcString = func.toString();
  const match = funcString.match(/^function\s*[^(]*\(([^)]*)\)\s*{([\s\S]*)}$/);
  if (!match) {
    throw new Error("Unable to parse function.");
  }
  return { args: match[1].trim(), body: match[2].trim() };
}

function getRowValue(checkedCells: number) {
  return (checkedCells * (checkedCells + 1)) / 2;
}
const customFuncGetRowValue = funcToString(getRowValue);

const outData: SpielZettelFileInfo = {
    // ...
    ruleSets: [{
        name: "default",
        // Custom functions for this rule set
        customFunctions: {
            getRowValue: [
                customFuncGetRowValue.args,
                customFuncGetRowValue.body,
            ],
        }
    }],
};
```
