/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */

import DiceBox from '@3d-dice/dice-box';
import React, { useEffect, useRef, useState } from 'react';

interface DiceRollerProps {
  width: number;
  height: number;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ width, height }) => {
  const diceBoxRef = useRef<HTMLDivElement>(null);
  const [diceBox, setDiceBox] = useState<DiceBox | null>(null);

  useEffect(() => {
    if (diceBoxRef.current) {
      const diceBoxInstance = new DiceBox({
        assetPath: '/assets/dice-box/', // Adjust if assets are in a different location
      });

      // Initialize the DiceBox
      diceBoxInstance.init(diceBoxRef.current);

      // Set diceBox state to use in event handlers
      setDiceBox(diceBoxInstance);

      return () => {
        //diceBoxInstance.dispose(); // Cleanup when component unmounts
      };
    }
  }, []);

  const handleRollDice = () => {
    if (diceBox) {
      diceBox.roll(); // Correct method for rolling the dice in DiceBox
    }
  };

  return (
    <div>
      <div
        ref={diceBoxRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: 'relative',
          background: '#f0f0f0', // Optional background color
        }}
      />
      <button onClick={handleRollDice} style={{ marginTop: '10px' }}>
        Roll Dice
      </button>
    </div>
  );
};

export default DiceRoller;
