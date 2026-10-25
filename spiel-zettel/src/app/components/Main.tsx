import { debugLogDraw } from "../helper/debugLogs.js";
import InteractiveCanvas from "./InteractiveCanvas.js";

export const COMPONENT_NAME = "Main";

export default function Main() {
  debugLogDraw(COMPONENT_NAME);

  return (
    <div className="App">
      <InteractiveCanvas />
    </div>
  );
}
