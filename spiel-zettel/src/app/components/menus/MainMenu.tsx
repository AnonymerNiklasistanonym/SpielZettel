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

import { defaultLocale, supportedLocales } from "../../../i18n/i18n";
import { createSpielZettelFile } from "../../helper/createFile";
import {
  debugLogCallback,
  debugLogDraw,
  debugLogUseEffectChanged,
  debugLogUseEffectInitialize,
} from "../../helper/debugLogs";
import { getFlagIconUrl, iconMaterialAdd } from "../../helper/icons";
import {
  fileExtension,
  mimeType,
  name,
  urlGitRepo,
  urlWebsite,
  version,
} from "../../helper/info";
import type { SpielZettelFileData } from "../../helper/readFile";
import { getVersionString } from "../../helper/readFile";
import { shareOrDownloadFile } from "../../helper/shareFile";
import type { SpielZettelEntry } from "../../hooks/useIndexedDb";
import { LOCAL_STORAGE_ID_LOCALE } from "../../hooks/useLocale";
import useTranslationWrapper from "../../hooks/useTranslationWrapper";
import PopupQrCodeUrl from "../dialogs/PopupQrCodeUrl";
import LocaleUpdater from "../language/LocaleUpdater";

import LoadingSpinner from "./LoadingSpinner";
import type { MainMenuButtonProps } from "./MainMenuButton";
import MainMenuButton from "./MainMenuButton";
import SearchBar from "./SearchBar";

import styles from "./MainMenu.module.css";

export interface MainMenuProps {
  updateSpielZettelDataList: boolean;
  setUpdateSpielZettelDataList: Dispatch<SetStateAction<boolean>>;
  onFileUpload: (files: File[]) => void;
  getSpielZettelDataList: () => Promise<SpielZettelEntry[]>;
  spielZettelData: SpielZettelFileData | null;
  setSpielZettelData: Dispatch<SetStateAction<SpielZettelFileData | null>>;
  deleteSpielZettel: (id: string) => void;
  onReset: () => void;
  loadingMessages: string[];
  setLoadingMessages: Dispatch<SetStateAction<string[]>>;
  onError?: (error: Error) => void;
}

export const COMPONENT_NAME = "MainMenu";

export default function MainMenu({
  onFileUpload,
  getSpielZettelDataList,
  setSpielZettelData,
  deleteSpielZettel,
  updateSpielZettelDataList,
  setUpdateSpielZettelDataList,
  spielZettelData,
  onError = console.error,
  onReset,
  loadingMessages,
  setLoadingMessages,
}: MainMenuProps) {
  debugLogDraw(COMPONENT_NAME);

  // States

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [spielZettelDataList, setSpielZettelDataList] = useState<
    SpielZettelEntry[]
  >([]);

  // Hooks

  const { switchLanguage, translate } = useTranslationWrapper();
  const [currentLocale, setCurrentLocale] = useState<string>(defaultLocale);

  // Callbacks

  const handleButtonClick = useCallback(() => {
    // Trigger the click event on the hidden file input
    fileInputRef.current?.click();
  }, []);

  const updateStoredLocale = useCallback((newLocale: string) => {
    console.debug("updateStoredLocale", newLocale);
    localStorage.setItem(LOCAL_STORAGE_ID_LOCALE, newLocale);
  }, []);

  // Values

  const defaultMainMenuButtons: MainMenuButtonProps[] = useMemo(
    () => [
      {
        title: translate("buttons.add", { name }),
        iconUrl: iconMaterialAdd,
        onClick: handleButtonClick,
        tabIndex: 0,
        fullGrid: true,
      } satisfies MainMenuButtonProps,
    ],
    [handleButtonClick, translate],
  );

  const defaultAdditionalMainMenuButtons = useMemo<MainMenuButtonProps[]>(
    () => [
      {
        title: translate("buttons.reportBugs", { name }),
        onClick: () => window.open(urlGitRepo, "_blank", "noopener,noreferrer"),
        tabIndex: 0,
        fullGrid: true,
      } satisfies MainMenuButtonProps,
      {
        title: translate("buttons.shareUrl"),
        onClick: () => {
          setIsModalOpen(true);
        },
        tabIndex: 0,
        fullGrid: true,
      } satisfies MainMenuButtonProps,
      ...supportedLocales
        .filter((a) => a !== currentLocale)
        .map(
          (locale) =>
            ({
              title: translate("buttons.switchLanguage", {
                name: translate(`language.${locale}`),
              }),
              iconUrl: getFlagIconUrl(locale),
              ignoreIconColor: true,
              onClick: () => {
                switchLanguage(locale);
                updateStoredLocale(locale);
              },
              tabIndex: 0,
              fullGrid: true,
            }) satisfies MainMenuButtonProps,
        ),
      {
        title: translate("buttons.resetData"),
        onClick: () => onReset(),
        tabIndex: 0,
        fullGrid: true,
        cancel: true,
      } satisfies MainMenuButtonProps,
    ],
    [currentLocale, onReset, switchLanguage, translate, updateStoredLocale],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        onFileUpload(Array.from(files));
      }
    },
    [onFileUpload],
  );

  const updateButtonsSpielZettelData = useCallback(async () => {
    debugLogCallback(COMPONENT_NAME, "updateButtonsSpielZettelData");
    try {
      const loadMessage = translate("messages.loading", { name });
      setLoadingMessages((prev) => [
        ...prev.filter((a) => a !== loadMessage),
        loadMessage,
      ]);
      const spielZettelDataList = await getSpielZettelDataList();
      setLoadingMessages((prev) => [...prev.filter((a) => a !== loadMessage)]);
      setSpielZettelDataList(spielZettelDataList);
    } catch (err) {
      onError(Error("Unable to fetch SpielZettelDataList", { cause: err }));
    }
  }, [getSpielZettelDataList, onError, setLoadingMessages, translate]);

  const buttonsSpielZettel = useMemo(() => {
    const buttons: MainMenuButtonProps[] = [];
    let filteredSpielZettelCount = 0;
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
      buttons.push({
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
            .catch(onError);
        },
      } satisfies MainMenuButtonProps);
    }
    if (filteredSpielZettelCount > 0) {
      buttons.push({
        title: translate("buttons.resetSearch", {
          count: filteredSpielZettelCount,
          name,
        }),
        onClick: () => {
          setSearchQuery("");
        },
        tabIndex: 0,
        cancel: true,
        fullGrid: true,
      } satisfies MainMenuButtonProps);
    }
    return buttons;
  }, [
    deleteSpielZettel,
    onError,
    searchQuery,
    setSpielZettelData,
    spielZettelDataList,
    translate,
  ]);

  // Combine all buttons
  const buttons = useMemo(
    () => [
      ...defaultMainMenuButtons,
      ...buttonsSpielZettel,
      ...defaultAdditionalMainMenuButtons,
    ],
    [
      buttonsSpielZettel,
      defaultAdditionalMainMenuButtons,
      defaultMainMenuButtons,
    ],
  );

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "buttons");
    updateButtonsSpielZettelData().catch(onError);
  }, [onError, updateButtonsSpielZettelData]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, [
      "updateSpielZettelDataList",
      updateSpielZettelDataList,
    ]);
    if (updateSpielZettelDataList) {
      setUpdateSpielZettelDataList(false);
      updateButtonsSpielZettelData().catch(onError);
    }
  }, [
    onError,
    setUpdateSpielZettelDataList,
    updateButtonsSpielZettelData,
    updateSpielZettelDataList,
  ]);

  useEffect(() => {
    debugLogUseEffectChanged(COMPONENT_NAME, [
      "spielZettelData",
      spielZettelData,
    ]);
    if (spielZettelData !== null) return;
    document.title = translate("title.mainMenu", { name, version });
  }, [spielZettelData, translate]);

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
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loadingElement={<LoadingSpinner messages={loadingMessages} />}
      />
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
