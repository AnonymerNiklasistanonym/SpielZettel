import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import stylesMainMenu from "./MainMenu.module.css";
import styles from "./SearchBar.module.css";

import { debugLogDraw } from "../../helper/debugLogs.js";
import { iconMaterialSearch } from "../../helper/icons.js";
import { name } from "../../helper/info.js";

import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from "react";

export interface SearchBarProps {
  loadingElement: ReactNode;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
}

export const COMPONENT_NAME = "SearchBar";

export default function SearchBar({
  loadingElement,
  setSearchQuery,
  searchQuery,
}: SearchBarProps) {
  debugLogDraw(COMPONENT_NAME);

  // Hooks

  const { t } = useTranslation();

  // Callbacks

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);
    },
    [setSearchQuery],
  );

  return (
    <div className={`${styles.inputContainer} ${stylesMainMenu.fullGrid}`}>
      <img
        src={iconMaterialSearch}
        alt={t("buttons.search")}
        width={36}
        height={36}
      />
      <input
        type="text"
        placeholder={t("placeholders.search", { name })}
        onChange={handleInputChange}
        value={searchQuery}
      />
      {loadingElement}
    </div>
  );
}
