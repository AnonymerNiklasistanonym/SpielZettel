import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

import { name } from "../helper/info";

import styles from "./SearchBar.module.css";

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
}

export default function SearchBar({
  setSearchQuery,
  searchQuery,
}: SearchBarProps) {
  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);
    },
    [setSearchQuery],
  );

  return (
    <div className={styles.inputContainer}>
      <input
        type="text"
        placeholder={`Filter ${name}...`}
        onChange={handleInputChange}
        value={searchQuery}
      />
    </div>
  );
}
