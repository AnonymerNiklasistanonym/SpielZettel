'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';

import { getVersionString } from '../helper/readFile';
import { shareOrDownloadFile } from '../helper/shareFile';
import MainMenuButton from './MainMenuButton';

import styles from './MainMenu.module.css';

import type { SpielZettelFileData } from '../helper/readFile';
import type { MainMenuButtonProps } from './MainMenuButton';
import type { Dispatch, SetStateAction } from 'react';
import type { SpielZettelEntry } from '../hooks/useIndexedDb';


export interface MainMenuProps {
  updateSpielZettelDataList: boolean;
  setUpdateSpielZettelDataList: Dispatch<SetStateAction<boolean>>;
  onFileUpload: (files: FileList) => void;
  getSpielZettelDataList: () => Promise<SpielZettelEntry[]>;
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
}: MainMenuProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = useCallback(() => {
    // Trigger the click event on the hidden file input
    fileInputRef.current?.click();
  }, []);

  const defaultMainMenuButtons: MainMenuButtonProps[] = useMemo(() => [
    { title: 'Add new Spiel Zettel', onClick: handleButtonClick },
  ], [handleButtonClick]);

  const [buttons, setButtons] = useState<MainMenuButtonProps[]>(defaultMainMenuButtons);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileUpload(files);
    }
  }, [onFileUpload]);

  const updateButtons = useCallback(async () => {
    console.debug("updateButtons");
    const newButtons: MainMenuButtonProps[] = [...defaultMainMenuButtons];
    const spielZettelDataList = await getSpielZettelDataList();
    console.debug("updateButtons > spielZettelDataList", spielZettelDataList);
    for (const spielZettelData of spielZettelDataList.map(a => a.spielZettel)) {
      newButtons.push({
        title: `${spielZettelData.dataJSON.name} ${getVersionString(spielZettelData.dataJSON.version)}`,
        img: spielZettelData.imageBase64,
        onClick: () => {
          setSpielZettelData(spielZettelData);
        },
        onDelete: async () => {
          deleteSpielZettel(spielZettelData.dataJSON.name);
          // Update buttons now
          updateButtons();
        },
        onShare: async () => {
          const zip = new JSZip();
          zip.file("data.json", JSON.stringify(spielZettelData.dataJSON));

          const img = new Image();
          img.src = spielZettelData.imageBase64;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx === null) return;
          ctx.drawImage(img, 0, 0);
          const blobPromise = new Promise<Blob>((resolve, reject) => canvas.toBlob(a => a !== null ? resolve(a) : reject("Error"), "image/jpg"));
          const blob = await blobPromise;
          zip.file("image.jpg", blob);

          // Generate the ZIP file
          const zipBlob = await zip.generateAsync({ type: "blob" });
          ;
          const fileName = `${spielZettelData.dataJSON.name}.spielzettel`;
          const zipFile = new File([zipBlob], fileName, { type: "application/x-spielzettel" });

          shareOrDownloadFile(zipFile, URL.createObjectURL(zipBlob), fileName, spielZettelData.dataJSON.name);
        }
      })
    }
    setButtons(newButtons)
  }, [defaultMainMenuButtons, deleteSpielZettel, getSpielZettelDataList, setSpielZettelData]);

  useEffect(() => {
    console.debug("USE EFFECT: Initialize buttons");
    updateButtons();
  }, [updateButtons]);

  useEffect(() => {
    console.debug("USE EFFECT: Change in updateSpielZettelDataList", updateSpielZettelDataList);
    if (updateSpielZettelDataList) {
      setUpdateSpielZettelDataList(false);
      updateButtons();
    }
  }, [setUpdateSpielZettelDataList, updateButtons, updateSpielZettelDataList]);

  return (
    <div className={styles.buttonList} >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className={styles.fileInput}
        onChange={handleFileChange}
      />
      {/* Upload file button and other buttons to load stored SpielZettel */}
      {buttons.map((button) => (
        <MainMenuButton
          key={button.title}
          {...button}
        />
      ))}
    </div>
  );
};
