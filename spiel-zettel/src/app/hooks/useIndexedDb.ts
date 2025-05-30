import type { IDBPDatabase } from "idb";
import { deleteDB, openDB } from "idb";
import { useCallback, useEffect, useRef, useState } from "react";

import { debugLogUseEffectInitialize } from "../helper/debugLogs";
import { SpielZettelElementState } from "../helper/evaluateRule";
import type { SpielZettelFileData } from "../helper/readFile";

export interface SpielZettelEntry {
  id: string;
  spielZettel: SpielZettelFileData;
}
export interface SaveEntryData {
  spielZettelKey: string;
  states: SpielZettelElementState[];
  ruleSet?: string;
}
export interface SaveEntry {
  id: string;
  save: SaveEntryData;
}
export interface LastSaveEntry {
  id: "last";
  saveKey: string;
}
export interface SpielZettelDB {
  spielZettel: SpielZettelEntry;
  saves: SaveEntry;
  lastSave: LastSaveEntry;
}

const objectStoreSpielZettel = "spielZettel";
const objectStoreSaves = "saves";
const objectStoreLastSave = "lastSave";

export const COMPONENT_NAME = "useIndexedDB";

export default function useIndexedDB(dbName: string) {
  // States

  const indexedDB = useRef<Promise<IDBPDatabase<SpielZettelDB>> | null>(null);
  const [loading, setLoading] = useState(true);

  // Callbacks

  const initDB = useCallback(async () => {
    console.debug("[useIndexedDB] initDB");
    indexedDB.current = null;
    setLoading(true);
    try {
      const promise = openDB<SpielZettelDB>(dbName, 3, {
        upgrade(db) {
          console.info(
            "[useIndexedDB] initDB: upgrade started",
            db.version,
            db.objectStoreNames,
          );
          if (!db.objectStoreNames.contains(objectStoreSpielZettel)) {
            db.createObjectStore(objectStoreSpielZettel, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(objectStoreSaves)) {
            db.createObjectStore(objectStoreSaves, { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains(objectStoreLastSave)) {
            db.createObjectStore(objectStoreLastSave, { keyPath: "id" });
          }
          console.info(
            "[useIndexedDB] initDB: upgrade completed",
            db.name,
            db.version,
            db.objectStoreNames,
          );
        },
      });
      indexedDB.current = promise;
      const db = await promise;
      console.info(
        "[useIndexedDB] initDB: database initialized",
        db.name,
        db.version,
        db.objectStoreNames,
      );
    } catch (error) {
      console.error(Error("Error initializing database", { cause: error }));
    } finally {
      setLoading(false);
    }
  }, [dbName]);

  const resetDB = useCallback(async () => {
    await deleteDB(dbName);
    await initDB();
  }, [dbName, initDB]);

  const ensureDB = useCallback(
    async (name: string): Promise<IDBPDatabase<SpielZettelDB>> => {
      let retries = 0;
      while (indexedDB.current === null && retries < 20) {
        retries++;
        console.warn("db is loading, waiting...", name, retries);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (indexedDB.current === null) {
        throw Error("Database is not initialized after loading");
      }
      return indexedDB.current;
    },
    [],
  );

  const setLastSave = useCallback(
    async (saveKey: string) => {
      console.debug("setLastSave");
      const db = await ensureDB("setLastSave");
      await db.put(objectStoreLastSave, { id: "last", saveKey });
    },
    [ensureDB],
  );

  const getLastSave = useCallback(async (): Promise<null | string> => {
    console.debug("getLastSave");
    const db = await ensureDB("getLastSave");
    const result = (await db.get(objectStoreLastSave, "last")) as
      | undefined
      | LastSaveEntry;
    return result ? result.saveKey : null;
  }, [ensureDB]);

  const removeLastSave = useCallback(async () => {
    console.debug("removeLastSave");
    const db = await ensureDB("removeLastSave");
    await db.delete(objectStoreLastSave, "last");
  }, [ensureDB]);

  const addSave = useCallback(
    async (
      id: string,
      spielZettelKey: string,
      states: SpielZettelElementState[],
      ruleSet?: string,
    ) => {
      console.debug("addSave", id, spielZettelKey, states);
      const db = await ensureDB("addSave");
      await db.put(objectStoreSaves, {
        id,
        save: {
          spielZettelKey,
          states: states
            .map((a) => {
              if (a.disabled !== true) {
                delete a.disabled;
              }
              if (a.value === undefined) {
                delete a.value;
              } else {
                if (typeof a.value === "boolean" && a.value !== true) {
                  delete a.value;
                }
                if (typeof a.value === "string" && a.value.trim() === "") {
                  delete a.value;
                }
              }
              return a;
            })
            .filter((a) => a.disabled === true || a.value !== undefined),
          ruleSet,
        },
      });
    },
    [ensureDB],
  );

  const getSave = useCallback(
    async (id: string) => {
      console.debug("getSave", id);
      const db = await ensureDB("getSave");
      return db.get(objectStoreSaves, id) as Promise<undefined | SaveEntry>;
    },
    [ensureDB],
  );

  const getAllSaves = useCallback(async () => {
    console.debug("getAllSaves");
    const db = await ensureDB("getAllSaves");
    return db.getAll(objectStoreSaves) as Promise<SaveEntry[]>;
  }, [ensureDB]);

  const removeSaves = useCallback(
    async (spielZettelId: string) => {
      console.debug("removeSaves", spielZettelId);
      const db = await ensureDB("removeSaves");
      const removedSaves: SaveEntry[] = [];
      for (const save of await getAllSaves()) {
        if (save.save.spielZettelKey === spielZettelId) {
          removedSaves.push(save);
          await db.delete(objectStoreSaves, save.id);
        }
      }
      return removedSaves;
    },
    [ensureDB, getAllSaves],
  );

  const addSpielZettel = useCallback(
    async (id: string, spielZettel: SpielZettelFileData) => {
      console.debug("addSpielZettel", id, spielZettel);
      const db = await ensureDB("addSpielZettel");
      await db.put(objectStoreSpielZettel, { id, spielZettel });
    },
    [ensureDB],
  );

  const removeSpielZettel = useCallback(
    async (id: string) => {
      console.debug("removeSpielZettel", id);
      const db = await ensureDB("removeSpielZettel");
      await db.delete(objectStoreSpielZettel, id);
      // Delete all connected saves
      const removedSaves = await removeSaves(id);
      // Delete all last save if it was a save file of the deleted SpielZettel
      const lastSave = await getLastSave();
      if (lastSave !== null && removedSaves.find((a) => a.id === id)) {
        await removeLastSave();
      }
    },
    [ensureDB, getLastSave, removeLastSave, removeSaves],
  );

  const getSpielZettel = useCallback(
    async (id: string) => {
      console.debug("getSpielZettel", id);
      const db = await ensureDB("getSpielZettel");
      return db.get(objectStoreSpielZettel, id) as Promise<
        undefined | SpielZettelEntry
      >;
    },
    [ensureDB],
  );

  const getAllSpielZettel = useCallback(async () => {
    console.debug("getAllSpielZettel");
    const db = await ensureDB("getAllSpielZettel");
    return db.getAll(objectStoreSpielZettel) as Promise<SpielZettelEntry[]>;
  }, [ensureDB]);

  // Event Listeners

  useEffect(() => {
    debugLogUseEffectInitialize(COMPONENT_NAME, "database");
    initDB().catch(console.error);
  }, [initDB]);

  return {
    loading,
    addSpielZettel,
    removeSpielZettel,
    getSpielZettel,
    getAllSpielZettel,
    addSave,
    getSave,
    removeSaves,
    getAllSaves,
    setLastSave,
    getLastSave,
    resetDB,
  };
}
