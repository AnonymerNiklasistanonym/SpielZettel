'use client';

import { useCallback, useEffect, useState } from "react";

import type { Dispatch, SetStateAction, MouseEvent } from "react";
import type { SpielZettelFileData } from "../helper/readFile";
import type { SaveEntry } from "../hooks/useIndexedDb";


export interface OverlayProps {
    spielZettelData: SpielZettelFileData | null;
    currentRuleset: string | null;
    currentSave: string | null;
    debug: boolean;
    setDebug: Dispatch<SetStateAction<boolean>>;
    getSaves: () => Promise<SaveEntry[]>;
    onRulesetChange: (ruleset: string | null) => void;
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


export default function Overlay({
    spielZettelData,
    currentRuleset,
    currentSave,
    debug,
    getSaves,
    onRulesetChange,
    onSaveChange,
    setDebug,
    onClear,
    onReset,
    onShareScreenshot,
    visible,
    setVisible,
}: OverlayProps) {
    console.debug("DRAW Overlay");

    const [saves, setSaves] = useState<string[]>([]);

    const closeOverlay = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setVisible(false);
    }, [setVisible]);

    const preventClickTrigger = useCallback((e: MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleRulesetSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === "none") {
            onRulesetChange(null);
            return;
        }
        const userConfirmed = confirm("This will run arbitrary code. Only enable this if you trust the source of the SpielZettel! Are you sure you want to continue?");
        if (userConfirmed) {
            onRulesetChange(e.target.value);
        } else {
            e.target.value = "none";
        }
        setVisible(false);
    }, [onRulesetChange, setVisible]);

    const handleClear = useCallback(() => {
        const userConfirmed = confirm("This will clear the SpielZettel. Are you sure you want to continue?");
        if (userConfirmed) {
            onClear();
            setVisible(false);
        }
    }, [onClear, setVisible]);

    const handleReset = useCallback(() => {
        const userConfirmed = confirm("This will reset all data! Are you sure you want to continue?");
        if (userConfirmed) {
            onReset();
            setVisible(false);
        }
    }, [onReset, setVisible]);

    const handleSaveSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onSaveChange(e.target.value);
    }, [onSaveChange]);

    const toggleDebug = useCallback(() => {
        setDebug(prev => !prev);
        setVisible(false);
    }, [setDebug, setVisible]);

    useEffect(() => {
        console.debug("USE EFFECT: Detected change in visible", visible);
        if (visible) {
            getSaves().then(newSaves => setSaves(newSaves.map(a => a.id)));
        }
    }, [getSaves, visible]);

    if (!visible) return null;

    return spielZettelData !== null && (
        <div style={styles.overlay} onClick={closeOverlay}>
            <div style={styles.controls} onClick={preventClickTrigger}>
                {/* Clear the canvas / states */}
                <button style={styles.button} onClick={handleClear}>
                    Clear
                </button>

                {/* Share a screenshot of the current canvas */}
                <button style={styles.button} onClick={onShareScreenshot}>
                    Share Screenshot
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
                        {saves.map(save => (
                            <option key={save} value={save}>
                                Save {save}
                            </option>
                        ))}
                    </select>
                </div>

                <button style={styles.button} onClick={toggleDebug}>
                    Toggle Debug: {debug ? "ON" : "OFF"}
                </button>

                <button style={styles.button} onClick={handleReset}>
                    Reset
                </button>
            </div>
        </div>
    );
};
