import { lazy, Suspense } from "react";

// Lazy imports
const InteractiveCanvas = lazy(() => import("./InteractiveCanvas.js"));

export function MainMenu() {
  return (
    <div className="App">
      {/* TODO Loading animation */}
      <Suspense>
        <InteractiveCanvas />
      </Suspense>
    </div>
  );
}
