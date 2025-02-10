import Image from "next/image";
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useMemo } from "react";

import { debugLogDraw } from "../../helper/debugLogs";
import { iconMaterialSearch } from "../../helper/icons";
import { name } from "../../helper/info";
import useTranslationWrapper from "../../hooks/useTranslationWrapper";

import stylesMainMenu from "./MainMenu.module.css";
import styles from "./SearchBar.module.css";

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

  const { translate } = useTranslationWrapper();

  // Callbacks

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);
    },
    [setSearchQuery],
  );

  // Values

  const placeHolderText = useMemo(() => {
    return translate("placeholders.search", { name });
  }, [translate]);

  return (
    <div className={`${styles.inputContainer} ${stylesMainMenu.fullGrid}`}>
      <Image
        src={iconMaterialSearch}
        alt={translate("buttons.search")}
        width={36}
        height={36}
      />
      <input
        type="text"
        placeholder={placeHolderText}
        onChange={handleInputChange}
        value={searchQuery}
      />
      {loadingElement}
    </div>
  );
}
