import InteractiveCanvas from "./InteractiveCanvas";
import LanguageWrapper from "./LanguageWrapper";

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
