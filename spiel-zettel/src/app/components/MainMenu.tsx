"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSpielZettelFile } from "../helper/createFile";
import { name, version } from "../helper/info";
import type { SpielZettelFileData } from "../helper/readFile";
import { getVersionString } from "../helper/readFile";
import { shareOrDownloadFile } from "../helper/shareFile";
import type { SpielZettelEntry } from "../hooks/useIndexedDb";

import type { MainMenuButtonProps } from "./MainMenuButton";
import MainMenuButton from "./MainMenuButton";

import styles from "./MainMenu.module.css";

export interface MainMenuProps {
  updateSpielZettelDataList: boolean;
  setUpdateSpielZettelDataList: Dispatch<SetStateAction<boolean>>;
  onFileUpload: (files: FileList) => void;
  getSpielZettelDataList: () => Promise<SpielZettelEntry[]>;
  spielZettelData: SpielZettelFileData | null;
  setSpielZettelData: Dispatch<SetStateAction<SpielZettelFileData | null>>;
  deleteSpielZettel: (id: string) => Promise<void>;
}

export default function MainMenu({
  onFileUpload,
  getSpielZettelDataList,
  setSpielZettelData,
  deleteSpielZettel,
  updateSpielZettelDataList,
  setUpdateSpielZettelDataList,
  spielZettelData,
}: MainMenuProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = useCallback(() => {
    // Trigger the click event on the hidden file input
    fileInputRef.current?.click();
  }, []);

  const defaultMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: "Add new Spiel Zettel",
        onClick: handleButtonClick,
        tabIndex: 0,
      },
    ],
    [handleButtonClick],
  );

  const [buttons, setButtons] = useState<MainMenuButtonProps[]>(
    defaultMainMenuButtons,
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        onFileUpload(files);
      }
    },
    [onFileUpload],
  );

  const updateButtons = useCallback(async () => {
    console.debug("updateButtons");
    const newButtons: MainMenuButtonProps[] = [...defaultMainMenuButtons];
    const spielZettelDataList = await getSpielZettelDataList();
    console.debug("updateButtons > spielZettelDataList", spielZettelDataList);
    let tabIndex = 1;
    for (const spielZettelData of spielZettelDataList.map(
      (a) => a.spielZettel,
    )) {
      newButtons.push({
        title: `${spielZettelData.dataJSON.name} ${getVersionString(spielZettelData.dataJSON.version)}`,
        img: spielZettelData.imageBase64,
        tabIndex: tabIndex++,
        onClick: () => {
          setSpielZettelData(spielZettelData);
        },
        onDelete: async () => {
          deleteSpielZettel(spielZettelData.dataJSON.name);
          // Update buttons now
          updateButtons();
        },
        onShare: async () => {
          const zip = await createSpielZettelFile(spielZettelData);
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const fileName = `${spielZettelData.dataJSON.name}.spielzettel`;
          const zipFile = new File([zipBlob], fileName, {
            type: "application/x-spielzettel",
          });

          shareOrDownloadFile(
            zipFile,
            URL.createObjectURL(zipBlob),
            fileName,
            spielZettelData.dataJSON.name,
          );
        },
      });
    }
    setButtons(newButtons);
  }, [
    defaultMainMenuButtons,
    deleteSpielZettel,
    getSpielZettelDataList,
    setSpielZettelData,
  ]);

  useEffect(() => {
    console.debug("USE EFFECT: Initialize buttons");
    updateButtons();
  }, [updateButtons]);

  useEffect(() => {
    console.debug(
      "USE EFFECT: Change in updateSpielZettelDataList",
      updateSpielZettelDataList,
    );
    if (updateSpielZettelDataList) {
      setUpdateSpielZettelDataList(false);
      updateButtons();
    }
  }, [setUpdateSpielZettelDataList, updateButtons, updateSpielZettelDataList]);

  useEffect(() => {
    console.debug("USE EFFECT: spielZettelData has changed", spielZettelData);
    if (spielZettelData !== null) return;
    document.title = `${name} (${version})`;
  }, [spielZettelData]);

  return (
    <div className={styles.buttonList}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className={styles.fileInput}
        onChange={handleFileChange}
      />
      {/* Upload file button and other buttons to load stored SpielZettel */}
      {buttons.map((button) => (
        <MainMenuButton key={button.title} {...button} />
      ))}
    </div>
  );
}
