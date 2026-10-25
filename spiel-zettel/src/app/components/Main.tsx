import { lazy, Suspense } from "react";

import { debugLogDraw } from "../helper/debugLogs.js";

// Lazy imports
const InteractiveCanvas = lazy(() => import("./InteractiveCanvas.js"));

export const COMPONENT_NAME = "Main";

export default function Main() {
  debugLogDraw(COMPONENT_NAME);

  return (
    <div className="App">
      {/* TODO Loading animation */}
      <Suspense>
        <InteractiveCanvas />
      </Suspense>
    </div>
  );
}
