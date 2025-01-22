"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSpielZettelFile } from "../helper/createFile";
import { name, urlGitRepo, urlVersionPrefix, version } from "../helper/info";
import type { SpielZettelFileData } from "../helper/readFile";
import { getVersionString } from "../helper/readFile";
import { shareOrDownloadFile } from "../helper/shareFile";
import type { SpielZettelEntry } from "../hooks/useIndexedDb";

import type { MainMenuButtonProps } from "./MainMenuButton";
import MainMenuButton from "./MainMenuButton";
import SearchBar from "./SearchBar";

import styles from "./MainMenu.module.css";

export interface MainMenuProps {
  updateSpielZettelDataList: boolean;
  setUpdateSpielZettelDataList: Dispatch<SetStateAction<boolean>>;
  onFileUpload: (files: FileList) => void;
  getSpielZettelDataList: () => Promise<SpielZettelEntry[]>;
  spielZettelData: SpielZettelFileData | null;
  setSpielZettelData: Dispatch<SetStateAction<SpielZettelFileData | null>>;
  deleteSpielZettel: (id: string) => Promise<void>;
  onReset: () => void;
}

export default function MainMenu({
  onFileUpload,
  getSpielZettelDataList,
  setSpielZettelData,
  deleteSpielZettel,
  updateSpielZettelDataList,
  setUpdateSpielZettelDataList,
  spielZettelData,
  onReset,
}: MainMenuProps) {
  console.debug("DRAW MainMenu");

  // States

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleButtonClick = useCallback(() => {
    // Trigger the click event on the hidden file input
    fileInputRef.current?.click();
  }, []);

  const defaultMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: `Add new ${name}`,
        onClick: handleButtonClick,
        tabIndex: 0,
      },
    ],
    [handleButtonClick],
  );

  const defaultAdditionalMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: `Version ${version}`,
        onClick: () =>
          window.open(
            urlVersionPrefix + version,
            "_blank",
            "noopener,noreferrer",
          ),
        tabIndex: 0,
      },
      {
        title: "Source Code / Report Bugs",
        onClick: () => window.open(urlGitRepo, "_blank", "noopener,noreferrer"),
        tabIndex: 0,
      },
      {
        title: "Reset",
        onClick: () => onReset(),
        tabIndex: 0,
      },
    ],
    [onReset],
  );

  const [buttons, setButtons] = useState<MainMenuButtonProps[]>([
    ...defaultMainMenuButtons,
    ...defaultAdditionalMainMenuButtons,
  ]);

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
    console.debug("[MainMenu] updateButtons");
    const newButtons: MainMenuButtonProps[] = [...defaultMainMenuButtons];
    let filteredSpielZettelCount = 0;
    let tabIndex = 1;
    try {
      const spielZettelDataList = await getSpielZettelDataList();
      for (const spielZettelData of spielZettelDataList.map(
        (a) => a.spielZettel,
      )) {
        if (!spielZettelData.dataJSON.name.includes(searchQuery.trim())) {
          filteredSpielZettelCount += 1;
          continue;
        }
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
    } catch (err) {
      console.error(
        Error("Unable to fetch SpielZettelDataList", { cause: err }),
      );
    }
    if (filteredSpielZettelCount > 0) {
      newButtons.push({
        title: `Reset search to show ${filteredSpielZettelCount} hidden ${name}`,
        tabIndex: tabIndex++,
        onClick: () => {
          setSearchQuery("");
        },
      });
    }
    newButtons.push(...defaultAdditionalMainMenuButtons);
    setButtons(newButtons);
  }, [
    defaultAdditionalMainMenuButtons,
    defaultMainMenuButtons,
    deleteSpielZettel,
    getSpielZettelDataList,
    searchQuery,
    setSpielZettelData,
  ]);

  // Event Listeners

  useEffect(() => {
    console.debug("USE EFFECT: [MainMenu] Initialize buttons");
    updateButtons();
  }, [updateButtons]);

  useEffect(() => {
    console.debug(
      "USE EFFECT: [MainMenu] Change in updateSpielZettelDataList",
      updateSpielZettelDataList,
    );
    if (updateSpielZettelDataList) {
      setUpdateSpielZettelDataList(false);
      updateButtons();
    }
  }, [setUpdateSpielZettelDataList, updateButtons, updateSpielZettelDataList]);

  useEffect(() => {
    console.debug(
      "USE EFFECT: [MainMenu] spielZettelData has changed",
      spielZettelData,
    );
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
        multiple
      />
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      {/* Upload file button and other buttons to load stored SpielZettel */}
      {buttons.map((button) => (
        <MainMenuButton key={button.title} {...button} />
      ))}
    </div>
  );
}
