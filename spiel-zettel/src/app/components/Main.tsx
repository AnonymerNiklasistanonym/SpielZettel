import InteractiveCanvas from "./InteractiveCanvas";
import LanguageWrapper from "./language/LanguageWrapper";

export default function Main() {
  console.debug("DRAW Main");

  return (
    <div className="App">
      <LanguageWrapper>
        <InteractiveCanvas />
      </LanguageWrapper>
    </div>
  );
}
