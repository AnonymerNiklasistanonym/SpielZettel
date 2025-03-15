import { readFileSync } from "fs";
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

const startPosition = {
  x: 943,
  y: 115,
};
const cellSizeEntry = {
  width: 186,
  height: 128,
};
const cellSizeCheck = {
  ...cellSizeEntry,
  width: 129,
};
const cellSizeWide = {
  ...cellSizeEntry,
  width: cellSizeEntry.width + cellSizeCheck.width,
};
const colSpacing = 17;
const cellSizeFinal = {
  ...cellSizeEntry,
  width: cellSizeWide.width * 4 + colSpacing * 3,
};

const elementsScheißspiel: SpielZettelElement[] = [];
let yPosStart = 0;
for (let col = 0; col < 4; col++) {
  const xPosStart = startPosition.x + (cellSizeWide.width + colSpacing) * col;
  yPosStart = startPosition.y;

  // Summe 1

  // > 1...6
  for (let i = 0; i < 6; i++) {
    let specialRule = "";
    if (col === 0 && i > 0) {
      specialRule = `|| !(countChecked("col_${col}_${i - 1}_strike") > 0 || sum("col_${col}_${i - 1}_number") > 0)`;
    }
    if (col === 1 && i < 5) {
      specialRule = `|| !(countChecked("col_${col}_${i + 1}_strike") > 0 || sum("col_${col}_${i + 1}_number") > 0)`;
    }
    if (col === 1 && i === 5) {
      specialRule = `|| !(countChecked("col_${col}_straße_strike") > 0 || sum("col_${col}_straße") > 0)`;
    }
    elementsScheißspiel.push(
      {
        id: `col_${col}_${i}_strike`,
        position: {
          x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
          y: yPosStart + cellSizeCheck.height / 2,
        },
        size: cellSizeCheck,
        type: "checkbox",
        rules: {
          [ruleDefault]: `{ disabled: sum("col_${col}_${i}_number") > 0 ${specialRule} }`,
        },
      },
      {
        id: `col_${col}_${i}_number`,
        position: {
          x: xPosStart + cellSizeEntry.width / 2,
          y: yPosStart + cellSizeEntry.height / 2,
        },
        size: cellSizeEntry,
        type: "number",
        rules: {
          [ruleDefault]: `{ disabled: countChecked("col_${col}_${i}_strike") > 0 ${specialRule} }`,
        },
      },
    );
    yPosStart += cellSizeEntry.height;
  }

  // > Zwischensumme 1, Bonus 1, Summe 1
  const ruleZwischensumme1 = `sum(${Array.from({ length: 6 }, (_, i) => `"col_${col}_${i}_number"`).join(", ")})`;
  elementsScheißspiel.push({
    id: `col_${col}_zwischensumme_1`,
    position: {
      x: xPosStart + cellSizeWide.width / 2,
      y: yPosStart + cellSizeWide.height / 2,
    },
    size: cellSizeWide,
    type: "number",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleZwischensumme1} }`,
      [ruleCount]: `{ value: ${ruleZwischensumme1} }`,
    },
  });
  yPosStart += cellSizeWide.height;
  const ruleBonus1 = `sum("col_${col}_zwischensumme_1") >= 63 ? true : false`;
  elementsScheißspiel.push({
    id: `col_${col}_bonus_1`,
    position: {
      x: xPosStart + cellSizeWide.width / 2,
      y: yPosStart + cellSizeWide.height / 2,
    },
    size: cellSizeWide,
    type: "checkbox",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleBonus1} }`,
      [ruleCount]: `{ value: ${ruleBonus1} }`,
    },
  });
  yPosStart += cellSizeWide.height;
  const ruleSumme1 = `sum("col_${col}_zwischensumme_1") + ((${ruleBonus1}) ? 30 : 0)`;
  elementsScheißspiel.push({
    id: `col_${col}_summe_1`,
    position: {
      x: xPosStart + cellSizeWide.width / 2,
      y: yPosStart + cellSizeWide.height / 2,
    },
    size: cellSizeWide,
    type: "number",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleSumme1} }`,
      [ruleCount]: `{ value: ${ruleSumme1} }`,
    },
  });
  yPosStart += cellSizeWide.height;

  // Summe 2

  // > Straße
  let specialRuleStraße = "";
  if (col === 0) {
    specialRuleStraße = `|| !(countChecked("col_${col}_${5}_strike") > 0 || sum("col_${col}_${5}_number") > 0)`;
  }
  if (col === 1) {
    specialRuleStraße = `|| !(countChecked("col_${col}_full_house_strike") > 0 || countChecked("col_${col}_full_house") > 0)`;
  }
  elementsScheißspiel.push(
    {
      id: `col_${col}_straße_strike`,
      position: {
        x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
        y: yPosStart + cellSizeCheck.height / 2,
      },
      size: cellSizeCheck,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: sum("col_${col}_straße") > 0 ${specialRuleStraße} }`,
      },
    },
    {
      id: `col_${col}_straße`,
      position: {
        x: xPosStart + cellSizeEntry.width / 2,
        y: yPosStart + cellSizeEntry.height / 2,
      },
      size: cellSizeEntry,
      type: "number",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_straße_strike") > 0 ${specialRuleStraße} }`,
      },
    },
  );
  yPosStart += cellSizeEntry.height;

  // > Full House
  let specialRuleFullHouse = "";
  if (col === 0) {
    specialRuleFullHouse = `|| !(countChecked("col_${col}_straße_strike") > 0 || sum("col_${col}_straße") > 0)`;
  }
  if (col === 1) {
    specialRuleFullHouse = `|| !(countChecked("col_${col}_poker_strike") > 0 || countChecked("col_${col}_poker") > 0)`;
  }
  elementsScheißspiel.push(
    {
      id: `col_${col}_full_house_strike`,
      position: {
        x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
        y: yPosStart + cellSizeCheck.height / 2,
      },
      size: cellSizeCheck,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_full_house") > 0 ${specialRuleFullHouse} }`,
      },
    },
    {
      id: `col_${col}_full_house`,
      position: {
        x: xPosStart + cellSizeEntry.width / 2,
        y: yPosStart + cellSizeEntry.height / 2,
      },
      size: cellSizeEntry,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_full_house_strike") > 0 ${specialRuleFullHouse} }`,
      },
    },
  );
  yPosStart += cellSizeEntry.height;

  // > Poker
  let specialRulePoker = "";
  if (col === 0) {
    specialRulePoker = `|| !(countChecked("col_${col}_full_house_strike") > 0 || countChecked("col_${col}_full_house") > 0)`;
  }
  if (col === 1) {
    specialRulePoker = `|| !(countChecked("col_${col}_joker_strike") > 0 || countChecked("col_${col}_joker") > 0)`;
  }
  elementsScheißspiel.push(
    {
      id: `col_${col}_poker_strike`,
      position: {
        x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
        y: yPosStart + cellSizeCheck.height / 2,
      },
      size: cellSizeCheck,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_poker") > 0 ${specialRulePoker} }`,
      },
    },
    {
      id: `col_${col}_poker`,
      position: {
        x: xPosStart + cellSizeEntry.width / 2,
        y: yPosStart + cellSizeEntry.height / 2,
      },
      size: cellSizeEntry,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_poker_strike") > 0 ${specialRulePoker} }`,
      },
    },
  );
  yPosStart += cellSizeEntry.height;

  // > Joker
  let specialRuleJoker = "";
  if (col === 0) {
    specialRuleJoker = `|| !(countChecked("col_${col}_poker_strike") > 0 || countChecked("col_${col}_poker") > 0)`;
  }
  if (col === 1) {
    specialRuleJoker = `|| !(countChecked("col_${col}_plus_strike") > 0 || sum("col_${col}_plus") > 0)`;
  }
  elementsScheißspiel.push(
    {
      id: `col_${col}_joker_strike`,
      position: {
        x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
        y: yPosStart + cellSizeCheck.height / 2,
      },
      size: cellSizeCheck,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_joker") > 0 ${specialRuleJoker} }`,
      },
    },
    {
      id: `col_${col}_joker`,
      position: {
        x: xPosStart + cellSizeEntry.width / 2,
        y: yPosStart + cellSizeEntry.height / 2,
      },
      size: cellSizeEntry,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_joker_strike") > 0 ${specialRuleJoker} }`,
      },
    },
  );
  yPosStart += cellSizeEntry.height;

  const ruleSumme2 =
    `sum("col_${col}_straße")` +
    ` + (countChecked("col_${col}_full_house") > 0 ? 30 : 0)` +
    ` + (countChecked("col_${col}_poker") > 0 ? 40 : 0)` +
    ` + (countChecked("col_${col}_joker") > 0 ? 50 : 0)`;
  elementsScheißspiel.push({
    id: `col_${col}_summe_2`,
    position: {
      x: xPosStart + cellSizeWide.width / 2,
      y: yPosStart + cellSizeWide.height / 2,
    },
    size: cellSizeWide,
    type: "number",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleSumme2} }`,
      [ruleCount]: `{ value: ${ruleSumme2} }`,
    },
  });
  yPosStart += cellSizeWide.height;

  // Produkt

  let specialRulePlus = "";
  if (col === 0) {
    specialRulePlus = `|| !(countChecked("col_${col}_joker_strike") > 0 || countChecked("col_${col}_joker") > 0)`;
  }
  if (col === 1) {
    specialRulePlus = `|| !(countChecked("col_${col}_minus_strike") > 0 || sum("col_${col}_minus") > 0)`;
  }
  elementsScheißspiel.push(
    {
      id: `col_${col}_plus_strike`,
      position: {
        x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
        y: yPosStart + cellSizeCheck.height / 2,
      },
      size: cellSizeCheck,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: sum("col_${col}_plus") > 0 ${specialRulePlus} }`,
      },
    },
    {
      id: `col_${col}_plus`,
      position: {
        x: xPosStart + cellSizeEntry.width / 2,
        y: yPosStart + cellSizeEntry.height / 2,
      },
      size: cellSizeEntry,
      type: "number",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_plus_strike") > 0 ${specialRulePlus} }`,
      },
    },
  );
  yPosStart += cellSizeEntry.height;

  let specialRuleMinus = "";
  if (col === 0) {
    specialRuleMinus = `|| !(countChecked("col_${col}_plus_strike") > 0 || sum("col_${col}_plus") > 0)`;
  }
  elementsScheißspiel.push(
    {
      id: `col_${col}_minus_strike`,
      position: {
        x: xPosStart + cellSizeEntry.width + cellSizeCheck.width / 2,
        y: yPosStart + cellSizeCheck.height / 2,
      },
      size: cellSizeCheck,
      type: "checkbox",
      rules: {
        [ruleDefault]: `{ disabled: sum("col_${col}_minus") > 0 ${specialRuleMinus} }`,
      },
    },
    {
      id: `col_${col}_minus`,
      position: {
        x: xPosStart + cellSizeEntry.width / 2,
        y: yPosStart + cellSizeEntry.height / 2,
      },
      size: cellSizeEntry,
      type: "number",
      rules: {
        [ruleDefault]: `{ disabled: countChecked("col_${col}_minus_strike") > 0 ${specialRuleMinus} }`,
      },
    },
  );
  yPosStart += cellSizeEntry.height;

  // > Produkt
  const ruleProdukt = `(sum("col_${col}_plus") - sum("col_${col}_minus")) * sum("col_${col}_${0}_number")`;
  elementsScheißspiel.push({
    id: `col_${col}_produkt`,
    position: {
      x: xPosStart + cellSizeWide.width / 2,
      y: yPosStart + cellSizeWide.height / 2,
    },
    size: cellSizeWide,
    type: "number",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleProdukt} }`,
      [ruleCount]: `{ value: ${ruleProdukt} }`,
    },
  });
  yPosStart += cellSizeWide.height;

  // > Gesamtsumme
  const ruleGesamtsumme = `sum("col_${col}_summe_1", "col_${col}_summe_2", "col_${col}_produkt")`;
  elementsScheißspiel.push({
    id: `col_${col}_gesamtsumme`,
    position: {
      x: xPosStart + cellSizeWide.width / 2,
      y: yPosStart + cellSizeWide.height / 2,
    },
    size: cellSizeWide,
    type: "number",
    rules: {
      [ruleDefault]: `{ disabled: true, value: ${ruleGesamtsumme} }`,
      [ruleCount]: `{ value: ${ruleGesamtsumme} }`,
    },
  });
  yPosStart += cellSizeWide.height;
}

// > Endsumme
const ruleEndsumme = `sum(${Array.from({ length: 4 }, (_, col) => `"col_${col}_gesamtsumme"`).join(", ")})`;
elementsScheißspiel.push({
  id: `endsumme`,
  position: {
    x: startPosition.x + cellSizeFinal.width / 2,
    y: yPosStart + cellSizeFinal.height / 2,
  },
  size: cellSizeFinal,
  type: "number",
  rules: {
    [ruleDefault]: `{ disabled: true, value: ${ruleEndsumme} }`,
    [ruleCount]: `{ value: ${ruleEndsumme} }`,
  },
});
yPosStart += cellSizeFinal.height;

const readTextfile = (filePath: string) => {
  const fileData = readFileSync(filePath);
  return fileData.toString("base64");
};

const outFilePath = join(__dirname, "scheißspiel.json");
const outData: SpielZettelFileInfo = {
  $schema: join("..", "spielzettel-info-schema.json"),
  name: "Scheißspiel",
  version: {
    major: 2,
    minor: 0,
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
  elements: elementsScheißspiel,
  res: [
    {
      name: "Dice: Google Play Store",
      url: "https://play.google.com/store/apps/details?id=fr.sevenpixels.dice",
    },
    {
      name: "Dice: Scheißspiel",
      fileName: "dice-configuration-scheißpiel.json",
      fileData: readTextfile(
        join(__dirname, "res-dice-configuration-scheißpiel.json"),
      ),
      fileMimeType: "application/json",
    },
  ],
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
