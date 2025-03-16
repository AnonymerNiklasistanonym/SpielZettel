// pages/dice-test.tsx
"use client"; // Ensure this runs only on the client side in Next.js
import DiceBox from "@3d-dice/dice-box";
import DiceParser from "@3d-dice/dice-parser-interface";
import DisplayResults from "@3d-dice/dice-ui/src/displayResults"; // Import directly due to index issues
import React, { useEffect, useRef, useState } from "react";

const DiceTest: React.FC = () => {
  const diceBoxRef = useRef<HTMLDivElement>(null);
  const [diceBox, setDiceBox] = useState<DiceBox | null>(null);
  const [diceParser] = useState(new DiceParser());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [displayResults, setDisplayResults] = useState<DisplayResults | null>(
    null,
  );

  useEffect(() => {
    if (diceBoxRef.current) {
      const Box = new DiceBox(
        "#dice-box", // target DOM element to inject the canvas for rendering
        {
          id: "dice-canvas", // canvas element id
          assetPath: "/assets/dice-box/",
          startingHeight: 8,
          throwForce: 6,
          spinForce: 5,
          lightIntensity: 0.9,
        },
      );

      // Initialize Dice Box inside the div container
      Box.init()
        .then(() => {
          console.log("DiceBox initialized");
          setDiceBox(Box);

          // Initialize DisplayResults UI
          const resultsDisplay = new DisplayResults("#dice-box");
          setDisplayResults(resultsDisplay);

          // Handle dice roll completion
          Box.onRollComplete = (results: any[]) => {
            console.log("Raw results:", results);

            // Handle rerolls if necessary
            const rerolls = diceParser.handleRerolls(results);
            if (rerolls.length && Box) {
              rerolls.forEach((roll) => Box.add(roll, roll.groupId));
              return rerolls;
            }

            // Finalize results and show
            const finalResults = diceParser.parseFinalResults(results);
            resultsDisplay.showResults(finalResults);
          };

          // Click anywhere to clear dice
          document.addEventListener("mousedown", () => {
            const diceCanvas = document.getElementById("dice-canvas");
            if (
              diceCanvas &&
              window.getComputedStyle(diceCanvas).display !== "none"
            ) {
              Box.hide().clear();
              resultsDisplay.clear();
            }
          });
        })
        .catch(console.error);
    }
  }, [diceParser]);

  // Function to roll dice
  const rollDice = (notation: string) => {
    if (diceBox) {
      diceBox
        .show()
        .roll(diceParser.parseNotation(notation))
        .catch(console.error);
    }
  };

  return (
    <div>
      <h1>Dice Rolling Demo</h1>
      <p>
        Supports most notations from{" "}
        <a
          href="https://wiki.roll20.net/Dice_Reference#Roll20_Dice_Specification"
          target="_blank"
        >
          Roll20 Dice Specification
        </a>
      </p>
      <div
        ref={diceBoxRef}
        id="dice-box"
        style={{ width: "600px", height: "400px", background: "#f0f0f0" }}
      />
      <button onClick={() => rollDice("2d20kh1")}>Roll d20 Advantage</button>
      <button onClick={() => rollDice("4d6dl1")}>
        Roll Attribute (4d6 Drop Lowest)
      </button>
      <button onClick={() => rollDice("8d6!")}>Roll Exploding Dice</button>
      <button
        onClick={() =>
          rollDice("2d6:white + 1d6:red + 1d6:yellow + 1d6:green + 1d6:blue")
        }
      >
        Qwixx
      </button>
    </div>
  );
};

export default DiceTest;
