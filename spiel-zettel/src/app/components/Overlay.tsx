'use client';

import { useCallback, useEffect, useState } from "react";

import type { Dispatch, SetStateAction, MouseEvent } from "react";
import type { SpielZettelFileData } from "../helper/readFile";
import type { SaveEntry } from "../hooks/useIndexedDb";

import styles from "./Overlay.module.css";

export interface OverlayProps {
    spielZettelData: SpielZettelFileData | null;
    currentRuleset: string | null;
    currentSave: string | null;
    debug: boolean;
    setDebug: Dispatch<SetStateAction<boolean>>;
    setMirrorButtons: Dispatch<SetStateAction<boolean>>;
    getSaves: () => Promise<SaveEntry[]>;
    onRulesetChange: (ruleset: string | null) => void;
    onSaveChange: (save: string) => void;
    onClear: () => void;
    onReset: () => void;
    onHome: () => void;
    onShareScreenshot: () => void;
    visible: boolean;
    setVisible: Dispatch<SetStateAction<boolean>>;
    onToggleRuleEvaluation: () => void;
}

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
    onHome,
    onShareScreenshot,
    visible,
    setVisible,
    setMirrorButtons,
    onToggleRuleEvaluation,
}: OverlayProps) {
    console.debug("DRAW Overlay");

    const [saves, setSaves] = useState<string[]>([]);
    const closeOverlay = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setVisible(false);
    }, [setVisible]);

    const closeOverlayIfNotChild = useCallback((e: MouseEvent) => {
        if (e.target === e.currentTarget) {
            setVisible(false);
        }
        e.stopPropagation();
    }, [setVisible]);

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

    const handleHome = useCallback(() => {
        onHome();
        setVisible(false);
    }, [onHome, setVisible]);

    const handleSaveSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        onSaveChange(e.target.value);
    }, [onSaveChange]);

    const toggleDebug = useCallback(() => {
        setDebug(prev => !prev);
        setVisible(false);
    }, [setDebug, setVisible]);

    const handleMirrorButtons = useCallback(() => {
        setMirrorButtons(prev => !prev)
    }, [setMirrorButtons]);

    useEffect(() => {
        console.debug("USE EFFECT: Detected change in visible", visible);
        if (visible) {
            getSaves().then(newSaves => setSaves(newSaves.map(a => a.id)));
        }
    }, [getSaves, visible]);

    if (!visible) return null;

    return spielZettelData !== null && (
        <div className={styles.overlay} onClick={closeOverlay}>
            <div className={styles.controls} onClick={closeOverlayIfNotChild}>
                {/* Clear the canvas / states */}
                <button className={styles.button} onClick={handleHome}>
                    Change Spiel Zettel
                </button>

                {/* Clear the canvas / states */}
                <button className={styles.button} onClick={handleClear}>
                    Clear
                </button>

                {/* Share a screenshot of the current canvas */}
                <button className={styles.button} onClick={onShareScreenshot}>
                    Share Screenshot
                </button>

                <div>
                    <select
                        value={currentRuleset ?? undefined}
                        onChange={handleRulesetSelect}
                        className={styles.optionsDialog}
                    >
                        <option value="none">Rule Set: None</option>
                        {spielZettelData.dataJSON.ruleSets?.map((rule) => (
                            <option key={rule.name} value={rule.name}>
                                Rule Set: {rule.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={currentSave ?? undefined}
                        onChange={handleSaveSelect}
                        className={styles.optionsDialog}
                    >
                        {saves.map(save => (
                            <option key={save} value={save}>
                                Save: {save}
                            </option>
                        ))}
                    </select>
                </div>

                <button className={styles.button} onClick={toggleDebug}>
                    Toggle Debug: {debug ? "ON" : "OFF"}
                </button>

                <button className={styles.button} onClick={handleReset}>
                    Reset
                </button>

                <button className={styles.button} onClick={handleMirrorButtons}>
                    Mirror Buttons
                </button>

                <button className={styles.button} onClick={onToggleRuleEvaluation}>
                    Toggle Rule Evaluation
                </button>
            </div>
        </div>
    );
};
