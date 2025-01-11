import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import './App.css'; // We'll add some CSS for responsiveness
import { getVersionString, SpielZettelFileData } from '../helper/readFile';
import { shareOrDownloadFile } from '../helper/shareFile';
import JSZip from 'jszip';

export interface ButtonProps {
    title: string;
    img?: string;
    onDelete?: () => void;
    onShare?: () => void;
    onClick: () => void;
}

// Button Component
const Button = ({ title, img, onDelete, onShare, onClick }: ButtonProps) => {
  return (
    <div className="button-container" onClick={onClick}>
    {/* Text on top */}
      <div className="button-text">
        {title}
      </div>

      {/* Image filling the screen width */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt="icon"
          className="button-image"
        />
      )}

      {/* Delete and Share buttons side by side */}
      {onDelete !== undefined && onShare !== undefined && <div className="button-actions">
        <button
          className="action-button delete-button"
          onClick={() => onDelete()}
        >
          Delete
        </button>
        <button
          className="action-button share-button"
          onClick={() => onShare()}
        >
          Share
        </button>
      </div>}
    </div>
  );
};

export interface MainMenuProps {
  onFileUpload: (files: FileList) => void;
  spielZettelDataList: SpielZettelFileData[] | null;
  setSpielZettelData: Dispatch<SetStateAction<SpielZettelFileData | null>>;
}

export default function MainMenu({
  onFileUpload,
  spielZettelDataList,
  setSpielZettelData,
}: MainMenuProps) {
  const [buttons, setButtons] = useState<ButtonProps[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = useCallback(() => {
    // Trigger the click event on the hidden file input
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log("Selected files:", files);
      onFileUpload(files);
    }
  }, [onFileUpload]);

  useEffect(() => {
    const newButtons: ButtonProps[] = [
      { title: 'Upload', onClick: handleButtonClick },
    ];
    if (spielZettelDataList) {
      for (const spielZettelData of spielZettelDataList) {
        newButtons.push({
          title: `${spielZettelData.dataJSON.name} ${getVersionString(spielZettelData.dataJSON.version)}`,
          img: spielZettelData.imageBase64,
          onClick: () => {
            setSpielZettelData(spielZettelData);
          },
          onDelete: async () => {
            console.warn("TODO");
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
    }
    setButtons(newButtons)
  }, [handleButtonClick, setSpielZettelData, spielZettelDataList]);

  return (
    <div className="button-list">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {buttons.map((button) => (
        <Button
          key={button.title}
          {...button}
        />
      ))}
    </div>
  );
};
