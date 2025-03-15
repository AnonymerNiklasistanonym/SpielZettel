import { writeFile } from "fs/promises";
import { join } from "path";

import type { ExampleCreateData } from "../scripts/createExamples";
import type {
  SpielZettelElement,
  SpielZettelFileInfo,
} from "../src/app/helper/readFile";

/** Disable cells + calculate scores */
const ruleDefault = "default";
/** Only calculate scores */
const ruleCount = "count";

const gameTitlePosition = {
  x: 35,
  y: 30,
};
const gameTitleSize = {
  width: 1890 - gameTitlePosition.x,
  height: 112 - gameTitlePosition.y,
};
const tablePosition = {
  x: 38,
  y: 152,
};
const tableSizeColumnPlayerName = {
  width: 561 - tablePosition.x,
  height: 244 - tablePosition.y + 1.5,
};
const tableSizeColumnRound = {
  width: 672 - 561,
  height: tableSizeColumnPlayerName.height,
};
const tableSizeColumnSum = {
  width: 1880 - 1672,
  height: tableSizeColumnPlayerName.height,
};
const countPlayers = 10;
const countRounds = 10;

const elements: SpielZettelElement[] = [];

elements.push({
  id: `gameName`,
  position: {
    x: gameTitlePosition.x + gameTitleSize.width / 2,
    y: gameTitlePosition.y + gameTitleSize.height / 2,
  },
  size: gameTitleSize,
  type: "string",
});

for (let row = 0; row < countPlayers; row++) {
  const xPos = tablePosition.x;
  const yPos = tablePosition.y + tableSizeColumnPlayerName.height * (row + 1);
  // Player name
  elements.push({
    id: `row_${row}_playerName`,
    options: ["Mama", "Papa", "Niklas", "Malte", "Frauke"],
    position: {
      x: xPos + tableSizeColumnPlayerName.width / 2,
      y: yPos + tableSizeColumnPlayerName.height / 2,
    },
    size: tableSizeColumnPlayerName,
    type: "string",
  });
  // Rounds
  for (let round = 0; round < countRounds; round++) {
    elements.push({
      id: `row_${row}_round_${round}`,
      position: {
        x:
          xPos +
          tableSizeColumnPlayerName.width +
          tableSizeColumnRound.width * round +
          tableSizeColumnRound.width / 2,
        y: yPos + tableSizeColumnRound.height / 2,
      },
      size: tableSizeColumnRound,
      type: "number",
    });
  }
  // Sum
  const ruleSum = `sum(${Array.from({ length: countRounds }, (_, i) => `"row_${row}_round_${i}"`).join(", ")})`;
  elements.push({
    id: `row_${row}_sum`,
    position: {
      x:
        xPos +
        tableSizeColumnPlayerName.width +
        tableSizeColumnRound.width * countRounds +
        tableSizeColumnSum.width / 2,
      y: yPos + tableSizeColumnSum.height / 2,
    },
    size: tableSizeColumnSum,
    type: "number",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleSum} }`,
      [ruleCount]: `{ value: ${ruleSum} }`,
    },
  });
}

const outFilePath = join(__dirname, "spielezähler.json");
const outData: SpielZettelFileInfo = {
  $schema: join("..", "spielzettel-info-schema.json"),
  name: "Spielezähler",
  version: {
    major: 1,
    minor: 1,
    patch: 0,
  },
  ruleSets: [
    {
      name: ruleDefault,
    },
    {
      name: ruleCount,
    },
  ],
  elements,
};

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
