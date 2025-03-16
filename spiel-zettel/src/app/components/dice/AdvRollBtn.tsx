export type RollDice = (notation: string, group?: string) => void;

export interface AdvRollBtnProps {
  label: string;
  onRoll: RollDice;
  notation: string;
}

export default function AdvRollBtn({
  label,
  onRoll,
  notation,
}: AdvRollBtnProps) {
  const roll = () => {
    onRoll(notation);
  };

  return <button onClick={roll}>{label}</button>;
}
