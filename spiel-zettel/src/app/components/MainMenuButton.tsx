import './App.css'; // We'll add some CSS for responsiveness


export interface MainMenuButtonProps {
    title: string;
    img?: string;
    onDelete?: () => void;
    onShare?: () => void;
    onClick: () => void;
}


export default function MainMenuButton({ title, img, onDelete, onShare, onClick }: MainMenuButtonProps) {
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
          onClick={(e) => {e.stopPropagation(); onDelete();}}
        >
          Delete
        </button>
        <button
          className="action-button share-button"
          onClick={(e) => {e.stopPropagation(); onShare();}}
        >
          Share
        </button>
      </div>}
    </div>
  );
};
