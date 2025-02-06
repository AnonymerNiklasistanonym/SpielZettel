import { debugLogDraw } from "../helper/debugLogs";

import InteractiveCanvas from "./InteractiveCanvas";
import LanguageWrapper from "./language/LanguageWrapper";

export const COMPONENT_NAME = "Main";

export default function Main() {
  debugLogDraw(COMPONENT_NAME);

  return (
    <div className="App">
      <LanguageWrapper>
        <InteractiveCanvas />
      </LanguageWrapper>
    </div>
  );
}
