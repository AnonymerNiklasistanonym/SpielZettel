"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { defaultLocale, supportedLocales } from "@/i18n/i18n";

import { createSpielZettelFile } from "../helper/createFile";
import {
  fileExtension,
  mimeType,
  name,
  urlGitRepo,
  urlWebsite,
  version,
} from "../helper/info";
import type { SpielZettelFileData } from "../helper/readFile";
import { getVersionString } from "../helper/readFile";
import { shareOrDownloadFile } from "../helper/shareFile";
import useTranslationWrapper from "../helper/useTranslationWrapper";
import type { SpielZettelEntry } from "../hooks/useIndexedDb";

import PopupQrCodeUrl from "./dialogs/PopupQrCodeUrl";
import LoadingSpinner from "./LoadingSpinner";
import LocaleUpdater from "./LocaleUpdater";
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

  const { switchLanguage, translate } = useTranslationWrapper();

  const [currentLocale, setCurrentLocale] = useState<string>(defaultLocale);

  const defaultMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: translate("buttons.add", { name }),
        iconUrl:
          "./icons/material/add_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg",
        onClick: handleButtonClick,
        tabIndex: 0,
      },
    ],
    [handleButtonClick, translate],
  );

  const defaultAdditionalMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: translate("buttons.reportBugs", { name }),
        onClick: () => window.open(urlGitRepo, "_blank", "noopener,noreferrer"),
        tabIndex: 0,
      },
      {
        title: translate("buttons.shareUrl"),
        onClick: () => {
          setIsModalOpen(true);
        },
        tabIndex: 0,
      },
      ...supportedLocales
        .filter((a) => a !== currentLocale)
        .map((locale) => ({
          title: translate("buttons.switchLanguage", {
            name: translate(`language.${locale}`),
          }),
          iconUrl: `./icons/flags/${locale}.svg`,
          ignoreIconColor: true,
          onClick: () => {
            switchLanguage(locale);
          },
          tabIndex: 0,
        })),
      {
        title: translate("buttons.resetData"),
        onClick: () => onReset(),
        tabIndex: 0,
        cancel: true,
      },
    ],
    [currentLocale, onReset, switchLanguage, translate],
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
      const loadMessage = translate("messages.loading", { name });
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
                const fileName = `${spielZettelData.dataJSON.name}${fileExtension}`;
                const zipFile = new File([zipBlob], fileName, {
                  type: mimeType,
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
        title: translate("buttons.resetSearch", {
          count: filteredSpielZettelCount,
          name,
        }),
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
    translate,
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

  useEffect(() => {
    console.debug("USE EFFECT: [MainMenu] translate has changed", translate);
    updateButtons().catch(console.error);
  }, [translate, updateButtons]);

  return (
    <div className={styles.buttonList}>
      <Suspense>
        <LocaleUpdater setLocale={setCurrentLocale} />
      </Suspense>
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
