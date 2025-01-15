import styles from "./MainMenu.module.css";

export interface MainMenuButtonProps {
  title: string;
  img?: string;
  onDelete?: () => void;
  onShare?: () => void;
  onClick: () => void;
}

export default function MainMenuButton({
  title,
  img,
  onDelete,
  onShare,
  onClick,
}: MainMenuButtonProps) {
  return (
    <div className={styles.buttonContainer} onClick={onClick}>
      {/* Text on top */}
      <div className={styles.buttonContainerTitle}>{title}</div>

      {/* Image filling the screen width */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt="SpielZettel preview"
          className={styles.buttonContainerImage}
        />
      )}

      {/* Delete and Share buttons side by side */}
      {onDelete !== undefined && onShare !== undefined && (
        <div className={styles.buttonActions}>
          <button
            className={styles.buttonAction}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </button>
          <button
            className={styles.buttonAction}
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            Share
          </button>
        </div>
      )}
    </div>
  );
}
