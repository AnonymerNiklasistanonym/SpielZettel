"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSpielZettelFile } from "../helper/createFile";
import { name, urlGitRepo, urlWebsite, version } from "../helper/info";
import type { SpielZettelFileData } from "../helper/readFile";
import { getVersionString } from "../helper/readFile";
import { shareOrDownloadFile } from "../helper/shareFile";
import type { SpielZettelEntry } from "../hooks/useIndexedDb";

import PopupQrCodeUrl from "./dialogs/PopupQrCodeUrl";
import LoadingSpinner from "./LoadingSpinner";
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
  deleteSpielZettel: (id: string) => void;
  onReset: () => void;
  loadingMessages: string[];
  setLoadingMessages: Dispatch<SetStateAction<string[]>>;
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
  loadingMessages,
  setLoadingMessages,
}: MainMenuProps) {
  console.debug("DRAW MainMenu");

  // States

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleButtonClick = useCallback(() => {
    // Trigger the click event on the hidden file input
    fileInputRef.current?.click();
  }, []);

  const defaultMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: `Add new ${name}`,
        iconUrl:
          "./icons/material/add_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        onClick: handleButtonClick,
        tabIndex: 0,
      },
    ],
    [handleButtonClick],
  );

  const defaultAdditionalMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: "Report Bugs + Source Code",
        onClick: () => window.open(urlGitRepo, "_blank", "noopener,noreferrer"),
        tabIndex: 0,
      },
      {
        title: "Share URL",
        onClick: () => {
          setIsModalOpen(true);
        },
        tabIndex: 0,
      },
      {
        title: "Reset Data",
        onClick: () => onReset(),
        tabIndex: 0,
        cancel: true,
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
    try {
      const loadMessage = "Load SpielZettel...";
      setLoadingMessages((prev) => [
        ...prev.filter((a) => a !== loadMessage),
        loadMessage,
      ]);
      const spielZettelDataList = await getSpielZettelDataList();
      setLoadingMessages((prev) => [...prev.filter((a) => a !== loadMessage)]);
      for (const spielZettelData of spielZettelDataList.map(
        (a) => a.spielZettel,
      )) {
        if (
          !spielZettelData.dataJSON.name
            .toLocaleLowerCase()
            .includes(searchQuery.toLocaleLowerCase().trim())
        ) {
          filteredSpielZettelCount += 1;
          continue;
        }
        newButtons.push({
          title: `${spielZettelData.dataJSON.name} ${getVersionString(spielZettelData.dataJSON.version)}`,
          img: spielZettelData.imageBase64,
          tabIndex: 0,
          onClick: () => {
            setSpielZettelData(spielZettelData);
          },
          onDelete: () => {
            deleteSpielZettel(spielZettelData.dataJSON.name);
          },
          onShare: () => {
            const zip = createSpielZettelFile(spielZettelData);
            zip
              .generateAsync({ type: "blob" })
              .then((zipBlob) => {
                const fileName = `${spielZettelData.dataJSON.name}.spielzettel`;
                const zipFile = new File([zipBlob], fileName, {
                  type: "application/x-spielzettel",
                });

                return shareOrDownloadFile(
                  zipFile,
                  URL.createObjectURL(zipBlob),
                  fileName,
                  spielZettelData.dataJSON.name,
                );
              })
              .catch(console.error);
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
        tabIndex: 0,
        cancel: true,
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
    setLoadingMessages,
    setSpielZettelData,
  ]);

  // Event Listeners

  useEffect(() => {
    console.debug("USE EFFECT: [MainMenu] Initialize buttons");
    updateButtons().catch(console.error);
  }, [updateButtons]);

  useEffect(() => {
    console.debug(
      "USE EFFECT: [MainMenu] Change in updateSpielZettelDataList",
      updateSpielZettelDataList,
    );
    if (updateSpielZettelDataList) {
      setUpdateSpielZettelDataList(false);
      updateButtons().catch(console.error);
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
      <LoadingSpinner messages={loadingMessages} />
      {/* Upload file button and other buttons to load stored SpielZettel */}
      {buttons.map((button) => (
        <MainMenuButton key={button.title} {...button} />
      ))}
      <PopupQrCodeUrl
        visible={isModalOpen}
        setVisible={setIsModalOpen}
        url={urlWebsite}
      />
    </div>
  );
}
