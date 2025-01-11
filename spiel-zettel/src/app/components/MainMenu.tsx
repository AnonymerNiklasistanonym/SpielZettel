import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css'; // We'll add some CSS for responsiveness

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
}

export default function MainMenu({onFileUpload}: MainMenuProps) {
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
    setButtons([
      { title: 'Upload', onClick: handleButtonClick },
      {
        title: 'Qwixx (v1.0.1)', img: 'https://placehold.co/600x400',
        onClick: () => {
          console.warn('Function not implemented.');
        }
      },
      {
        title: 'Qwixx A (v1.0.0)', img: 'https://placehold.co/600x400/000000/FFF',
        onClick: () => {
          console.warn('Function not implemented.');
        }
      },
    ])
  }, [handleButtonClick]);

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
