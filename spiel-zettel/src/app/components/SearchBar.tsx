import Image from "next/image";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";

import { name } from "../helper/info";
import useTranslationWrapper from "../helper/useTranslationWrapper";

import stylesMainMenu from "./MainMenu.module.css";
import styles from "./SearchBar.module.css";

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
}

export default function SearchBar({
  setSearchQuery,
  searchQuery,
}: SearchBarProps) {
  const { translate } = useTranslationWrapper();

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);
    },
    [setSearchQuery],
  );

  const placeHolderText = useMemo(() => {
    return translate("placeholders.search", { name });
  }, [translate]);

  return (
    <div className={`${styles.inputContainer} ${stylesMainMenu.fullGrid}`}>
      <Image
        src="./icons/material/search_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
        alt="Search"
        width={36}
        height={36}
      />
      <input
        type="text"
        placeholder={placeHolderText}
        onChange={handleInputChange}
        value={searchQuery}
      />
    </div>
  );
}
