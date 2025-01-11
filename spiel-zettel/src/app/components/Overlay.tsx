import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SpielZettelElementState } from "../helper/evaluateRule";
import type { SpielZettelFileData } from "../helper/readFile";

export interface PropsOverlay {
    spielZettelData: SpielZettelFileData | null;
    currentRuleset: string | null;
    currentSave: string | null;
    debug: boolean;
    setDebug: Dispatch<SetStateAction<boolean>>;
    saves: SpielZettelElementState[] | null;
    onRulesetChange: (ruleset: string) => void;
    onSaveChange: (save: string) => void;
    onClear: () => void;
    onReset: () => void;
    onShareScreenshot: () => void;
    visible: boolean;
    setVisible: Dispatch<SetStateAction<boolean>>;
}

const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "black",
      color: "white",
      height: "100vh",
      overflow: "hidden",
      position: "relative",
    },
    controls: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "center",
      justifyContent: "center",
      width: "90%",
      maxWidth: "400px",
      padding: "20px",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
    },
    fileInput: {
      display: "none",
    },
    button: {
      padding: "10px 20px",
      backgroundColor: "#1E90FF",
      color: "#fff",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold",
      textAlign: "center",
      width: "100%",
    },
    canvas: {
      backgroundColor: "black",
      display: "block",
      width: "100%",
      height: "100%",
    },
    topRightButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      padding: "10px 20px",
      backgroundColor: "#FF6347",
      color: "#fff",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold",
    },
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
  } as const;


export function Overlay({
    spielZettelData,
    currentRuleset,
    currentSave,
    debug,
    saves,
    onRulesetChange,
    onSaveChange,
    setDebug,
    onClear,
    onReset,
    onShareScreenshot,
    visible,
    setVisible,
}: PropsOverlay) {
    console.debug("DRAW Overlay");

    const closeOverlay = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setVisible(false);
    }, [setVisible]);

    const handleRulesetSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const userConfirmed = confirm("....");
        if (userConfirmed) {
            onRulesetChange(e.target.value);
        } else {
            e.target.value = "none";
        }
    }, [onRulesetChange]);

    const handleSaveSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onSaveChange(e.target.value);
    }, [onSaveChange]);

    const toggleDebug = useCallback(() => {
        setDebug(prev => !prev);
    }, [setDebug]);

    if (!visible) return null;

    return spielZettelData !== null && (
        <div style={styles.overlay} onClick={closeOverlay}>
            <div style={styles.controls} onClick={(e) => e.stopPropagation()}>
                <button style={styles.button} onClick={onClear}>
                    Clear
                </button>

                <div>
                    <label htmlFor="ruleset-select">Select Ruleset:</label>
                    <select
                        id="ruleset-select"
                        value={currentRuleset ?? undefined}
                        onChange={handleRulesetSelect}
                    >
                        <option value="none">None</option>
                        {spielZettelData.dataJSON.ruleSets?.map((rule) => (
                            <option key={rule.name} value={rule.name}>
                                {rule.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="save-select">Select Save:</label>
                    <select
                        id="save-select"
                        value={currentSave ?? undefined}
                        onChange={handleSaveSelect}
                    >
                        <option value="new">New</option>
                        {saves?.map((save, index) => (
                            <option key={index} value={save.id}>
                                Save {index + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <button style={styles.button} onClick={onShareScreenshot}>
                    Share Screenshot
                </button>

                <button style={styles.button} onClick={toggleDebug}>
                    Debug: {debug ? "ON" : "OFF"}
                </button>

                <button style={styles.button} onClick={onReset}>
                    Reset
                </button>
            </div>
        </div>
    );
};

export default Overlay;
